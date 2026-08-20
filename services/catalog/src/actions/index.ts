import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import {
  CatalogCheckoutActionNames,
  CatalogComparisonActionNames,
  CatalogCollectionActionNames,
  CatalogLoyaltyActionNames,
  COLLECTION_LISTING_CONTRACT_VERSION,
  hashCanonicalCollectionRulesV1,
  hashCollectionListingPayloadV1,
  normalizeCanonicalCollectionRulesV1,
} from "@shopana/broker-types";
import type {
  Catalog,
  CatalogCollectionListingSnapshot,
  CatalogCollectionListingTombstone,
  GetCollectionListingSnapshotParams,
  GetCollectionListingSnapshotResult,
} from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import type { QueryArgs } from "@shopana/type-resolver";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { ServiceQueryResolver } from "../resolvers/service/index.js";
import { resolveCheckoutMerchandiseParamsSchema } from "./resolveCheckoutMerchandise.schema.js";
import { resolveCheckoutDeliveryFactsParamsSchema } from "./resolveCheckoutDeliveryFacts.schema.js";
import { CheckoutDeliveryFactsService } from "../checkout-pipeline/CheckoutDeliveryFactsService.js";
import {
  CheckoutMerchandiseError,
  CheckoutMerchandiseInfrastructureError,
  CheckoutMerchandiseRepository,
  CheckoutMerchandiseService,
  toCheckoutMerchandiseFailure,
} from "../checkout-pipeline/index.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

/**
 * Catalog broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class CatalogBrokerActions extends BrokerActions {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private async getStoreContext(storeId: string): Promise<ContextStore | null> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );

    return result.store;
  }

  private createServiceContext(store: ContextStore): ServiceContext {
    const kernel = this.kernel;

    return new ServiceContext({
      requestId: `catalog-service-action-${Date.now()}`,
      kernel,
      loaders: new Loader(kernel.repository),
      locale: store.defaultLocale,
      currency: store.currencyCode,
      store,
    });
  }

  private validateQueryInput(
    params: Catalog.CatalogQueryParams,
  ): Catalog.CatalogQueryResult | null {
    if (!params.storeId?.trim()) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "storeId is required",
        retryable: false,
      };
    }

    const productsSelection = params.selection.populate?.products;
    if (!productsSelection) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "selection.populate.products is required",
        retryable: false,
      };
    }

    const hasFields = Boolean(productsSelection.fields?.length);
    const hasPopulate = Boolean(
      productsSelection.populate && Object.keys(productsSelection.populate).length > 0,
    );

    if (!hasFields && !hasPopulate) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "selection must include fields or populate",
        retryable: false,
      };
    }

    return null;
  }

  @Action("query")
  async query(params: Catalog.CatalogQueryParams): Promise<Catalog.CatalogQueryResult> {
    const validationError = this.validateQueryInput(params);
    if (validationError) return validationError;

    const store = await this.getStoreContext(params.storeId);
    if (!store) {
      return {
        ok: false,
        code: "CATALOG_STORE_NOT_FOUND",
        message: `Store with id "${params.storeId}" not found`,
        retryable: false,
      };
    }

    const ctx = this.createServiceContext(store);

    try {
      return await runWithContext(ctx, async () => {
        const root = await ServiceQueryResolver.load<
          typeof ServiceQueryResolver,
          Catalog.CatalogQueryData
        >({}, params.selection as unknown as QueryArgs, ctx);

        return {
          ok: true,
          data: root ?? {},
        };
      });
    } catch (error) {
      return {
        ok: false,
        code: "CATALOG_PRODUCT_READ_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to resolve product snapshots",
        retryable: true,
      };
    }
  }

  @Action(CatalogComparisonActionNames.resolveVariants, { readOnly: true })
  async resolveCustomerComparisonVariants(
    params: Catalog.ResolveCustomerComparisonVariantsParams,
    callContext: BrokerCallContext,
  ): Promise<Catalog.ResolveCustomerComparisonVariantsResult> {
    if (callContext.caller.kind !== "action" || callContext.caller.service !== "customers") {
      return {
        ok: false,
        code: "CATALOG_COMPARISON_CALLER_FORBIDDEN",
        message: "Only Customers may validate comparison selections",
        retryable: false,
      };
    }

    try {
      const store = await this.getStoreContext(params.storeId);
      if (!store) {
        return {
          ok: false,
          code: "CATALOG_COMPARISON_READ_FAILED",
          message: "Catalog store was not found",
          retryable: false,
        };
      }
      const ctx = this.createServiceContext(store);
      return await runWithContext(ctx, async () => {
        if (
          params.categoryId &&
          !(await this.kernel.repository.category.exists(params.categoryId))
        ) {
          return {
            ok: false as const,
            code: "CATEGORY_NOT_FOUND" as const,
            message: "Category was not found",
            retryable: false,
          };
        }
        const candidates =
          await this.kernel.repository.variant.getStorefrontVisibleComparisonVariants(
            params.variantIds,
          );
        const variants = params.categoryId
          ? candidates.filter((candidate) => candidate.primaryCategoryId === params.categoryId)
          : candidates;
        return { ok: true as const, variants };
      });
    } catch {
      return {
        ok: false,
        code: "CATALOG_COMPARISON_READ_FAILED",
        message: "Catalog comparison variants could not be resolved",
        retryable: true,
      };
    }
  }

  @Action(CatalogLoyaltyActionNames.validateReferences, { readOnly: true })
  async validateLoyaltyCatalogReferences(
    params: Catalog.ValidateLoyaltyCatalogReferencesParams,
    callContext: BrokerCallContext,
  ): Promise<Catalog.ValidateLoyaltyCatalogReferencesResult> {
    if (callContext.caller.kind !== "action" || callContext.caller.service !== "loyalty") {
      return {
        ok: false,
        code: "CATALOG_LOYALTY_REFERENCE_VALIDATION_FAILED",
        message: "Only Loyalty may validate loyalty catalog references",
        retryable: false,
      };
    }
    try {
      const store = await this.getStoreContext(params.storeId);
      if (!store) throw new Error("Catalog store was not found");
      return runWithContext(this.createServiceContext(store), async () => {
        const missing: Array<{ type: Catalog.LoyaltyCatalogReferenceType; ids: string[] }> = [];
        for (const reference of params.references) {
          const ids = [...new Set(reference.ids)];
          const present = new Set<string>();
          if (reference.type === "PRODUCT")
            for (const id of ids) {
              if (await this.kernel.repository.product.exists(id)) present.add(id);
            }
          else if (reference.type === "VARIANT")
            for (const id of ids) {
              if (await this.kernel.repository.variant.exists(id)) present.add(id);
            }
          else if (reference.type === "CATEGORY")
            for (const id of ids) {
              if (await this.kernel.repository.category.exists(id)) present.add(id);
            }
          else if (reference.type === "TAG")
            for (const id of ids) {
              if (await this.kernel.repository.tag.exists(id)) present.add(id);
            }
          else if (reference.type === "FEATURE")
            for (const id of ids) {
              if (await this.kernel.repository.feature.findById(id)) present.add(id);
            }
          else
            for (const row of await this.kernel.repository.option.getValuesByIds(ids))
              present.add(row.id);
          const missingIds = ids.filter((id) => !present.has(id));
          if (missingIds.length > 0) missing.push({ type: reference.type, ids: missingIds });
        }
        return { ok: true as const, missing };
      });
    } catch (error) {
      return {
        ok: false,
        code: "CATALOG_LOYALTY_REFERENCE_VALIDATION_FAILED",
        message:
          error instanceof Error ? error.message : "Catalog loyalty reference validation failed",
        retryable: true,
      };
    }
  }

  /** Resolves an immutable, ordered merchandise snapshot for Pricing. */
  @Action(CatalogCheckoutActionNames.resolveMerchandise)
  @ZodSchema(resolveCheckoutMerchandiseParamsSchema)
  async resolveCheckoutMerchandise(
    params: Catalog.ResolveCheckoutMerchandiseParams,
  ): Promise<Catalog.ResolveCheckoutMerchandiseResult> {
    try {
      let store: ContextStore | null;
      try {
        store = await this.getStoreContext(params.storeId);
      } catch (cause) {
        throw new CheckoutMerchandiseInfrastructureError(
          "Catalog checkout store context could not be loaded",
          cause,
        );
      }
      if (!store)
        return {
          ok: false,
          code: "CATALOG_STORE_NOT_FOUND",
          message: `Store with id "${params.storeId}" not found`,
          retryable: false,
        };
      const ctx = this.createServiceContext(store);
      return await runWithContext(ctx, () =>
        new CheckoutMerchandiseService(new CheckoutMerchandiseRepository(this.kernel.db)).resolve(
          params,
          store,
        ),
      );
    } catch (error) {
      this.logger.error(
        {
          error,
          errorCode: error instanceof CheckoutMerchandiseError ? error.code : "UNKNOWN",
          retryable: error instanceof CheckoutMerchandiseError ? error.retryable : false,
          storeId: params.storeId,
        },
        "Checkout merchandise resolution failed",
      );
      return toCheckoutMerchandiseFailure(error);
    }
  }

  @Action(CatalogCheckoutActionNames.resolveDeliveryFacts)
  @ZodSchema(resolveCheckoutDeliveryFactsParamsSchema)
  async resolveCheckoutDeliveryFacts(
    params: Catalog.ResolveCheckoutDeliveryFactsParams,
  ): Promise<Catalog.ResolveCheckoutDeliveryFactsResult> {
    try {
      const store = await this.getStoreContext(params.storeId);
      if (!store)
        return {
          ok: false,
          code: "CATALOG_STORE_NOT_FOUND",
          message: `Store with id "${params.storeId}" not found`,
          retryable: false,
        };
      return await runWithContext(this.createServiceContext(store), () =>
        new CheckoutDeliveryFactsService(this.kernel.db).resolve(params),
      );
    } catch (error) {
      this.logger.error(
        { err: error, storeId: params.storeId },
        "Catalog checkout delivery facts failed",
      );
      return {
        ok: false,
        code: "CHECKOUT_DELIVERY_FACTS_RESOLUTION_FAILED",
        message: "Catalog delivery facts could not be resolved.",
        retryable: true,
      };
    }
  }

  @Action("findListingFacetAffectedProducts")
  async findListingFacetAffectedProducts(
    params: Catalog.FindListingFacetAffectedProductsParams,
  ): Promise<Catalog.FindListingFacetAffectedProductsResult> {
    return this.kernel.repository.listingFacetAffectedProduct.findListingFacetAffectedProducts(
      params,
    );
  }

  @Action(CatalogCollectionActionNames.getListingSnapshot, { readOnly: true })
  async getCollectionListingSnapshot(
    params: GetCollectionListingSnapshotParams,
    callContext: BrokerCallContext,
  ): Promise<GetCollectionListingSnapshotResult> {
    if (callContext.caller.kind !== "action" || callContext.caller.service !== "listing") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Collection was not found",
        retryable: false,
      };
    }
    if (params.contractVersion !== COLLECTION_LISTING_CONTRACT_VERSION) {
      return {
        ok: false,
        code: "UNSUPPORTED_COLLECTION_SNAPSHOT_VERSION",
        message: "Collection snapshot version is not supported",
        retryable: false,
      };
    }

    try {
      const store = await this.getStoreContext(params.storeId);
      if (!store) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Collection was not found",
          retryable: false,
        };
      }
      return await runWithContext(this.createServiceContext(store), async () => {
        const collection = await this.kernel.repository.collection.findByIdIncludingDeleted(
          params.collectionId,
        );
        if (!collection || collection.storeId !== params.storeId) {
          return {
            ok: false as const,
            code: "NOT_FOUND" as const,
            message: "Collection was not found",
            retryable: false,
          };
        }
        if (collection.deletedAt) {
          const withoutHash: Omit<CatalogCollectionListingTombstone, "payloadHash"> = {
            snapshotVersion: COLLECTION_LISTING_CONTRACT_VERSION,
            state: "deleted",
            id: collection.id,
            storeId: collection.storeId,
            listingRevision: collection.listingRevision,
            deletedAt: new Date(collection.deletedAt).toISOString(),
          };
          return {
            ok: true as const,
            snapshot: {
              ...withoutHash,
              payloadHash: hashCollectionListingPayloadV1(withoutHash),
            },
          };
        }
        const ruleRows = await this.kernel.repository.collectionRule.findByCollectionId(
          collection.id,
        );
        const rules =
          collection.type === "rule"
            ? normalizeCanonicalCollectionRulesV1(
                ruleRows.map((row) => ({
                  field: row.field,
                  operator: row.operator,
                  value: row.value,
                })),
              )
            : [];
        const rulesHash = hashCanonicalCollectionRulesV1(rules);
        const withoutHash: Omit<CatalogCollectionListingSnapshot, "payloadHash"> = {
          snapshotVersion: COLLECTION_LISTING_CONTRACT_VERSION,
          state: "live",
          id: collection.id,
          storeId: collection.storeId,
          listingRevision: collection.listingRevision,
          type: collection.type as "manual" | "rule",
          defaultSort: collection.defaultSort as "manual" | "price" | "newest" | "name",
          defaultSortDirection: collection.defaultSortDirection as "asc" | "desc",
          publishedAt: toCanonicalInstant(collection.publishedAt),
          effectiveFrom: toCanonicalInstant(collection.effectiveFrom),
          effectiveTo: toCanonicalInstant(collection.effectiveTo),
          rules,
          rulesHash,
          listingUpdatedAt: new Date(collection.listingUpdatedAt).toISOString(),
        };
        return {
          ok: true as const,
          snapshot: {
            ...withoutHash,
            payloadHash: hashCollectionListingPayloadV1(withoutHash),
          },
        };
      });
    } catch (error) {
      const invalid = error instanceof Error && error.name === "CollectionContractValidationError";
      return {
        ok: false,
        code: invalid ? "COLLECTION_SNAPSHOT_INVALID" : "COLLECTION_SNAPSHOT_UNAVAILABLE",
        message: invalid ? error.message : "Collection snapshot is temporarily unavailable",
        retryable: !invalid,
      };
    }
  }
}

function toCanonicalInstant(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}
