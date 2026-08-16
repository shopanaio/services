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
} from "@shopana/broker-types";
import type { Catalog } from "@shopana/broker-types";
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
    const result = await this.broker.call<
      GetStoreByIdResult,
      { id: string }
    >("project.getStoreById", { id: storeId });

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
    params: Catalog.CatalogQueryParams
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
      productsSelection.populate &&
        Object.keys(productsSelection.populate).length > 0
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
  async query(
    params: Catalog.CatalogQueryParams
  ): Promise<Catalog.CatalogQueryResult> {
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
        >(
          {},
          params.selection as unknown as QueryArgs,
          ctx
        );

        return {
          ok: true,
          data: root ?? {},
        };
      });
    } catch (error) {
      return {
        ok: false,
        code: "CATALOG_PRODUCT_READ_QUERY_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to resolve product snapshots",
        retryable: true,
      };
    }
  }

  @Action(CatalogComparisonActionNames.resolveVariants, { readOnly: true })
  async resolveCustomerComparisonVariants(
    params: Catalog.ResolveCustomerComparisonVariantsParams,
    callContext: BrokerCallContext,
  ): Promise<Catalog.ResolveCustomerComparisonVariantsResult> {
    if (
      callContext.caller.kind !== "action" ||
      callContext.caller.service !== "customers"
    ) {
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
          await this.kernel.repository.variant.getPublishedComparisonVariants(
            params.variantIds,
          );
        const variants = params.categoryId
          ? candidates.filter(
              (candidate) =>
                candidate.primaryCategoryId === params.categoryId,
            )
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

  /** Resolves an immutable, ordered merchandise snapshot for Pricing. */
  @Action(CatalogCheckoutActionNames.resolveMerchandise)
  @ZodSchema(resolveCheckoutMerchandiseParamsSchema)
  async resolveCheckoutMerchandise(
    params: Catalog.ResolveCheckoutMerchandiseParams
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
      if (!store) return { ok: false, code: "CATALOG_STORE_NOT_FOUND", message: `Store with id "${params.storeId}" not found`, retryable: false };
      const ctx = this.createServiceContext(store);
      return await runWithContext(ctx, () => new CheckoutMerchandiseService(new CheckoutMerchandiseRepository(this.kernel.db)).resolve(params, store));
    } catch (error) {
      this.logger.error(
        {
          error,
          errorCode:
            error instanceof CheckoutMerchandiseError ? error.code : "UNKNOWN",
          retryable:
            error instanceof CheckoutMerchandiseError
              ? error.retryable
              : false,
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
      if (!store) return { ok: false, code: "CATALOG_STORE_NOT_FOUND", message: `Store with id "${params.storeId}" not found`, retryable: false };
      return await runWithContext(this.createServiceContext(store), () => new CheckoutDeliveryFactsService(this.kernel.db).resolve(params));
    } catch (error) {
      this.logger.error({ err: error, storeId: params.storeId }, "Catalog checkout delivery facts failed");
      return { ok: false, code: "CHECKOUT_DELIVERY_FACTS_RESOLUTION_FAILED", message: "Catalog delivery facts could not be resolved.", retryable: true };
    }
  }

  @Action("findListingFacetAffectedProducts")
  async findListingFacetAffectedProducts(
    params: Catalog.FindListingFacetAffectedProductsParams
  ): Promise<Catalog.FindListingFacetAffectedProductsResult> {
    return this.kernel.repository.listingFacetAffectedProduct.findListingFacetAffectedProducts(
      params
    );
  }
}
