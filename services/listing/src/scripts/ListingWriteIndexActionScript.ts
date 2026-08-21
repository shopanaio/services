import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingPreparedDeleteAction,
  ListingPreparedDeleteWriteAction,
  ListingPreparedSyncAction,
  ListingPreparedSyncWriteAction,
  ListingSyncWriteModelJson,
} from "./listingIndexActionTypes.js";
import { ListingIndexActionScriptError } from "./listingIndexActionTypes.js";
import type { Listing } from "@shopana/broker-types";
import type {
  ProductSortRowInput,
  VariantListingIndexUpsertInput,
  VariantListingPriceRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";
import { encodeListingVariantTerm } from "../listing/variantTerms/index.js";
import { canonicalByteLength } from "../recommendation/canonical.js";
import {
  MAX_LIFECYCLE_PLAN_BYTES,
  MAX_PRODUCT_CATEGORY_MEMBERSHIPS,
} from "../recommendation/constants.js";
import { RecommendationIntegrityError } from "../recommendation/errors.js";

export interface RecommendationLifecycleState {
  published: boolean;
  available: boolean;
  categoryIds: string[];
}

export interface RecommendationLifecyclePlan {
  version: 1;
  organizationId: string;
  storeId: string;
  productId: string;
  eventSequence: number;
  operationId: string;
  oldState: RecommendationLifecycleState;
  newState: RecommendationLifecycleState;
}

export interface ListingWriteIndexActionResult {
  result: Listing.ListingUpdateResult;
  recommendationPlan: RecommendationLifecyclePlan | null;
}

export class ListingWriteIndexActionScript extends BaseScript<
  ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
  ListingWriteIndexActionResult
> {
  protected async execute(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
  ): Promise<ListingWriteIndexActionResult> {
    return this.repository.runListingIndexItemTransaction(async () => {
      const action = input.action;
      const statePayloadHash = this.getStatePayloadHash(input);
      const current = await this.repository.listingIndexItemState.lockByItem(action.itemKey);

      if (current && action.eventSequence < current.eventSequence) {
        return { result: this.buildResult(action, "ignored_stale"), recommendationPlan: null };
      }

      if (current && action.eventSequence === current.eventSequence) {
        if (action.effectiveIdempotencyKey !== current.lastEffectiveIdempotencyKey) {
          throw new ListingIndexActionScriptError([
            {
              code: "IDEMPOTENCY_CONFLICT",
              field: ["eventSequence"],
              message:
                "Listing index action reused an eventSequence with a different idempotency key",
            },
          ]);
        }

        if (statePayloadHash === current.payloadHash) {
          return { result: this.buildResult(action, "noop"), recommendationPlan: null };
        }

        if (!("syncWriteModel" in input)) {
          throw new ListingIndexActionScriptError([
            {
              code: "IDEMPOTENCY_CONFLICT",
              field: ["eventSequence"],
              message: "Listing delete action reused an eventSequence with a different payload",
            },
          ]);
        }
      }

      if ("syncWriteModel" in input) {
        const oldState = await this.readRecommendationLifecycleState(input.action.itemKey.itemId);
        await this.applySync(input.action, input.syncWriteModel.writeModelJson);
        await this.upsertLatestState(input.action, "indexed", statePayloadHash);
        const newState = await this.readRecommendationLifecycleState(input.action.itemKey.itemId);
        const recommendationPlan = this.buildRecommendationLifecyclePlan(input, oldState, newState);
        return { result: this.buildResult(input.action, "applied"), recommendationPlan };
      }

      const oldState = await this.readRecommendationLifecycleState(input.action.itemKey.itemId);
      await this.applyDelete(input.action);
      await this.upsertLatestState(input.action, "deleted", statePayloadHash);
      const newState = await this.readRecommendationLifecycleState(input.action.itemKey.itemId);
      const recommendationPlan = this.buildRecommendationLifecyclePlan(input, oldState, newState);
      return { result: this.buildResult(input.action, "applied"), recommendationPlan };
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async readRecommendationLifecycleState(
    productId: string,
  ): Promise<RecommendationLifecycleState> {
    const current = await this.repository.productListingIndex.findByProductId(productId);
    const currentCategories = current
      ? (
          await this.repository.listingPostingBitmap.getMembershipKeys({
            entityType: "product",
            docId: current.productDocId,
            field: "category",
          })
        ).map((row) => row.valueKey)
      : [];
    const currentSorts = current
      ? await this.repository.listingPostingProductSort.getByProductDocId(current.productDocId)
      : [];
    return {
      published: current?.status === "published",
      available: currentSorts.some(
        (row) => row.sortKind === "availability" && row.boolValue === true,
      ),
      categoryIds: normalizeCategoryIds(currentCategories),
    };
  }

  private buildRecommendationLifecyclePlan(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
    oldState: RecommendationLifecycleState,
    newState: RecommendationLifecycleState,
  ): RecommendationLifecyclePlan {
    const productId = input.action.itemKey.itemId;
    const plan: RecommendationLifecyclePlan = {
      version: 1,
      organizationId: input.action.organizationId,
      storeId: input.action.itemKey.storeId,
      productId,
      eventSequence: input.action.eventSequence,
      operationId: input.action.params.meta.operationId,
      oldState,
      newState,
    };
    if (
      oldState.categoryIds.length > MAX_PRODUCT_CATEGORY_MEMBERSHIPS ||
      newState.categoryIds.length > MAX_PRODUCT_CATEGORY_MEMBERSHIPS ||
      canonicalByteLength(plan) > MAX_LIFECYCLE_PLAN_BYTES
    ) {
      throw new RecommendationIntegrityError(
        "LIFECYCLE_PLAN_LIMIT_EXCEEDED",
        "Recommendation lifecycle plan exceeds its versioned limit",
      );
    }
    return plan;
  }

  private async applySync(
    action: ListingPreparedSyncAction,
    writeModel: ListingSyncWriteModelJson,
  ): Promise<void> {
    const productId = action.itemKey.itemId;
    const existingVariants = await this.repository.variantListingIndex.getByProductIds([productId]);

    const productDocIds = await this.repository.listingDocIdAllocator.allocateProductDocIds([
      productId,
    ]);
    const productDocId = productDocIds.get(productId);
    if (!productDocId) {
      throw new Error(`Failed to allocate product doc id: ${productId}`);
    }

    const variantIds = writeModel.variants.map((variant) => variant.variantId);
    const variantDocIds =
      await this.repository.listingDocIdAllocator.allocateVariantDocIds(variantIds);

    await this.repository.productListingIndex.ensureBootstrapRows([
      {
        productId,
        productDocId,
        entityType: writeModel.productEntityType,
        productCreatedAt: writeModel.product.productCreatedAt,
        productUpdatedAt: writeModel.product.productUpdatedAt,
      },
    ]);

    await this.repository.productListingIndex.upsert({
      ...writeModel.product,
      productDocId,
    });
    await this.repository.productListingPriceIndex.replaceForProduct(
      productId,
      writeModel.productPrices,
    );
    if (writeModel.searchIndex) {
      await this.repository.listingSearchIndex.replaceForProduct(
        productId,
        productDocId,
        writeModel.searchIndex,
      );
    }
    await this.repository.listingPostingProductSort.replaceForProduct(
      productDocId,
      writeModel.productSortRows.map((row) => ({
        ...row,
        productDocId,
      })) as ProductSortRowInput[],
    );
    await this.replaceProductMemberships(productDocId, writeModel);

    const variantRows: VariantListingIndexUpsertInput[] = writeModel.variants.map((variant) => {
      const variantDocId = variantDocIds.get(variant.variantId);
      if (!variantDocId) {
        throw new Error(`Failed to allocate variant doc id: ${variant.variantId}`);
      }
      return {
        ...variant,
        productDocId,
        variantDocId,
      };
    });

    await this.repository.variantListingIndex.upsertMany(variantRows);
    await this.repository.listingPostingBitmap.ensureDeclaredVariantTermRows();
    const keepVariantIds = new Set(variantIds);
    const staleVariants = existingVariants.filter(
      (variant) => !keepVariantIds.has(variant.variantId),
    );
    await this.repository.listingPostingBitmap.replaceVariantTermMemberships([
      ...variantRows.map((variant) => ({
        variantDocId: variant.variantDocId,
        nextValueKeys:
          writeModel.variantTermsByVariantId[variant.variantId]?.map(encodeListingVariantTerm) ??
          [],
      })),
      ...staleVariants.map((variant) => ({
        variantDocId: variant.variantDocId,
        nextValueKeys: [],
      })),
    ]);

    const sourcePriceRows = new Map<string, VariantListingPriceRowInput[]>();
    for (const variant of variantRows) {
      sourcePriceRows.set(
        variant.variantId,
        (writeModel.variantPricesByVariantId[variant.variantId] ?? []).map((row) => ({
          ...row,
          productDocId,
          variantDocId: variant.variantDocId,
        })),
      );
      await this.repository.listingPostingBitmap.replaceVariantMemberships({
        variantDocId: variant.variantDocId,
        field: "variant_product",
        nextValueKeys: writeModel.variantProductValueKeysByVariantId[variant.variantId] ?? [],
      });
      await this.repository.listingPostingBitmap.replaceVariantMemberships({
        variantDocId: variant.variantDocId,
        field: "rule_term",
        nextValueKeys: writeModel.variantRuleTermValueKeysByVariantId[variant.variantId] ?? [],
      });
    }

    await this.repository.variantListingPriceIndex.replaceForVariants(sourcePriceRows);

    await this.deleteVariantDependencies(staleVariants);
    if (staleVariants.length > 0) {
      await this.repository.variantListingIndex.deleteByVariantIds(
        staleVariants.map((variant) => variant.variantId),
      );
    }

    await this.repository.listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds([
      ...variantRows.map((variant) => variant.variantDocId),
      ...staleVariants.map((variant) => variant.variantDocId),
    ]);
  }

  private async applyDelete(action: ListingPreparedDeleteAction): Promise<void> {
    const product = await this.repository.productListingIndex.findByProductId(
      action.itemKey.itemId,
    );
    const variants = await this.repository.variantListingIndex.getByProductIds([
      action.itemKey.itemId,
    ]);

    await this.deleteVariantDependencies(variants);
    if (variants.length > 0) {
      await this.repository.variantListingIndex.deleteByVariantIds(
        variants.map((variant) => variant.variantId),
      );
    }

    if (product) {
      await this.repository.listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(
        variants.map((variant) => variant.variantDocId),
      );
      await this.repository.listingPostingProductSort.deleteByProductDocId(product.productDocId);
      await this.repository.listingSearchIndex.deleteByProductId(product.productId);
      await this.repository.productListingPriceIndex.deleteByProductId(product.productId);
      await this.repository.listingPostingBitmap.deleteProductMemberships(product.productDocId);
      await this.repository.productListingIndex.delete(product.productId);
    }
  }

  private async replaceProductMemberships(
    productDocId: number,
    writeModel: ListingSyncWriteModelJson,
  ): Promise<void> {
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "category",
      nextValueKeys: writeModel.productPostingValueKeys.category,
    });
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "vendor",
      nextValueKeys: writeModel.productPostingValueKeys.vendor,
    });
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "facet",
      nextValueKeys: writeModel.productPostingValueKeys.facet,
    });
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "collection",
      nextValueKeys: writeModel.productPostingValueKeys.collection,
    });
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "rule_term",
      nextValueKeys: writeModel.productPostingValueKeys.ruleTerm,
    });
    await this.repository.listingPostingBitmap.replaceProductMemberships({
      productDocId,
      field: "status",
      nextValueKeys: [writeModel.product.status],
    });
  }

  private async deleteVariantDependencies(
    variants: readonly {
      variantId: string;
      variantDocId: number;
    }[],
  ): Promise<void> {
    for (const variant of variants) {
      await this.repository.listingPostingBitmap.deleteVariantMemberships(variant.variantDocId);
    }
  }

  private async upsertLatestState(
    action: ListingPreparedSyncAction | ListingPreparedDeleteAction,
    lifecycleStatus: "indexed" | "deleted",
    payloadHash: string,
  ): Promise<void> {
    await this.repository.listingIndexItemState.upsertLatestState({
      storeId: action.itemKey.storeId,
      itemId: action.itemKey.itemId,
      eventSequence: action.eventSequence,
      payloadHash,
      lifecycleStatus,
      lastEffectiveIdempotencyKey: action.effectiveIdempotencyKey,
      lastOperationId: action.params.meta.operationId,
      updatedAt: new Date().toISOString(),
    });
  }

  private buildResult(
    action: ListingPreparedSyncAction | ListingPreparedDeleteAction,
    status: Exclude<Listing.ListingUpdateResult["status"], "accepted">,
  ): Listing.ListingUpdateResult {
    const result: Listing.ListingUpdateResult = {
      operationId: action.params.meta.operationId,
      storeId: action.itemKey.storeId,
      itemRef: {
        entityType: action.itemKey.entityType,
        id: action.itemKey.itemId,
      },
      eventSequence: action.eventSequence,
      status,
      processedAt: new Date().toISOString(),
    };

    if ("warnings" in action && action.warnings && action.warnings.length > 0) {
      result.warnings = action.warnings;
    }

    return result;
  }

  private getStatePayloadHash(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
  ): string {
    return "syncWriteModel" in input
      ? input.syncWriteModel.writeModelHash
      : input.action.payloadHash;
  }
}

function normalizeCategoryIds(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
