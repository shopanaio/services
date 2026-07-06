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
  RuntimeVariantPriceRowInput,
  VariantListingIndexUpsertInput,
  VariantListingPriceRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";

export class ListingWriteIndexActionScript extends BaseScript<
  ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
  Listing.ListingUpdateResult
> {
  protected async execute(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction
  ): Promise<Listing.ListingUpdateResult> {
    return this.repository.runListingIndexItemTransaction(async () => {
      const action = input.action;
      const statePayloadHash = this.getStatePayloadHash(input);
      const current = await this.repository.listingIndexItemState.lockByItem(
        action.itemKey
      );

      if (current && action.sourceSequence < current.sourceSequence) {
        return this.buildResult(action, "ignored_stale");
      }

      if (current && action.sourceSequence === current.sourceSequence) {
        if (action.effectiveIdempotencyKey !== current.lastEffectiveIdempotencyKey) {
          throw new ListingIndexActionScriptError([
            {
              code: "REVISION_CONFLICT",
              field: ["sourceSequence"],
              message:
                "Listing index action reused a sourceSequence with a different idempotency key",
            },
          ]);
        }

        if (statePayloadHash === current.payloadHash) {
          return this.buildResult(action, "noop");
        }

        if (!("syncWriteModel" in input)) {
          throw new ListingIndexActionScriptError([
            {
              code: "REVISION_CONFLICT",
              field: ["sourceSequence"],
              message:
                "Listing delete action reused a sourceSequence with a different payload",
            },
          ]);
        }
      }

      if ("syncWriteModel" in input) {
        await this.applySync(input.action, input.syncWriteModel.writeModelJson);
        await this.upsertLatestState(
          input.action,
          "indexed",
          statePayloadHash
        );
        return this.buildResult(input.action, "applied");
      }

      await this.applyDelete(input.action);
      await this.upsertLatestState(input.action, "deleted", statePayloadHash);
      return this.buildResult(input.action, "applied");
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async applySync(
    action: ListingPreparedSyncAction,
    writeModel: ListingSyncWriteModelJson
  ): Promise<void> {
    const productId = action.itemKey.itemId;
    const existingVariants =
      await this.repository.variantListingIndex.getByProductIds([productId]);

    const productDocIds =
      await this.repository.listingDocIdAllocator.allocateProductDocIds([
        productId,
      ]);
    const productDocId = productDocIds.get(productId);
    if (!productDocId) {
      throw new Error(`Failed to allocate product doc id: ${productId}`);
    }

    const variantIds = writeModel.variants.map((variant) => variant.variantId);
    const variantDocIds =
      await this.repository.listingDocIdAllocator.allocateVariantDocIds(
        variantIds
      );

    await this.repository.productListingIndex.ensureBootstrapRows([
      {
        productId,
        productDocId,
        kind: writeModel.productKind,
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
      writeModel.productPrices
    );
    await this.repository.productTitleBm25SearchIndex.replaceForProduct(
      productId,
      writeModel.productTitleRows
    );
    await this.repository.listingPostingProductSort.replaceForProduct(
      productDocId,
      writeModel.productSortRows.map((row) => ({
        ...row,
        productDocId,
      })) as ProductSortRowInput[]
    );
    await this.replaceProductMemberships(productDocId, writeModel);

    const variantRows: VariantListingIndexUpsertInput[] = writeModel.variants.map(
      (variant) => {
        const variantDocId = variantDocIds.get(variant.variantId);
        if (!variantDocId) {
          throw new Error(`Failed to allocate variant doc id: ${variant.variantId}`);
        }
        return {
          ...variant,
          productDocId,
          variantDocId,
        };
      }
    );

    await this.repository.variantListingIndex.upsertMany(variantRows);

    const sourcePriceRows = new Map<string, VariantListingPriceRowInput[]>();
    const runtimePriceRows = new Map<number, RuntimeVariantPriceRowInput[]>();
    for (const variant of variantRows) {
      sourcePriceRows.set(
        variant.variantId,
        (writeModel.variantPricesByVariantId[variant.variantId] ?? []).map(
          (row) => ({
            ...row,
            productDocId,
            variantDocId: variant.variantDocId,
          })
        )
      );
      runtimePriceRows.set(
        variant.variantDocId,
        (writeModel.runtimePricesByVariantId[variant.variantId] ?? []).map(
          (row) => ({
            ...row,
            productDocId,
            variantDocId: variant.variantDocId,
          })
        )
      );
      await this.repository.listingPostingBitmap.replaceVariantMemberships({
        variantDocId: variant.variantDocId,
        field: "facet",
        nextValueKeys:
          writeModel.variantFacetValueKeysByVariantId[variant.variantId] ?? [],
      });
      await this.repository.listingPostingBitmap.replaceVariantMemberships({
        variantDocId: variant.variantDocId,
        field: "variant_product",
        nextValueKeys:
          writeModel.variantProductValueKeysByVariantId[variant.variantId] ?? [],
      });
    }

    await this.repository.variantListingPriceIndex.replaceForVariants(
      sourcePriceRows
    );
    await this.repository.listingPostingVariantPrice.replaceForVariants(
      runtimePriceRows
    );

    const keepVariantIds = new Set(variantIds);
    const staleVariants = existingVariants.filter(
      (variant) => !keepVariantIds.has(variant.variantId)
    );
    await this.deleteVariantDependencies(staleVariants);
    if (staleVariants.length > 0) {
      await this.repository.variantListingIndex.deleteByVariantIds(
        staleVariants.map((variant) => variant.variantId)
      );
    }

    await this.repository.listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(
      [
        ...variantRows.map((variant) => variant.variantDocId),
        ...staleVariants.map((variant) => variant.variantDocId),
      ]
    );
  }

  private async applyDelete(action: ListingPreparedDeleteAction): Promise<void> {
    const product = await this.repository.productListingIndex.findByProductId(
      action.itemKey.itemId
    );
    const variants = await this.repository.variantListingIndex.getByProductIds([
      action.itemKey.itemId,
    ]);

    await this.deleteVariantDependencies(variants);
    if (variants.length > 0) {
      await this.repository.variantListingIndex.deleteByVariantIds(
        variants.map((variant) => variant.variantId)
      );
    }

    if (product) {
      await this.repository.listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(
        variants.map((variant) => variant.variantDocId)
      );
      await this.repository.listingPostingProductSort.deleteByProductDocId(
        product.productDocId
      );
      await this.repository.productTitleBm25SearchIndex.deleteByProductId(
        product.productId
      );
      await this.repository.productListingPriceIndex.deleteByProductId(
        product.productId
      );
      await this.repository.listingPostingBitmap.deleteProductMemberships(
        product.productDocId
      );
      await this.repository.productListingIndex.delete(product.productId);
    }
  }

  private async replaceProductMemberships(
    productDocId: number,
    writeModel: ListingSyncWriteModelJson
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
  }

  private async deleteVariantDependencies(
    variants: readonly {
      variantId: string;
      variantDocId: number;
    }[]
  ): Promise<void> {
    for (const variant of variants) {
      await this.repository.listingPostingBitmap.deleteVariantMemberships(
        variant.variantDocId
      );
    }
    await this.repository.listingPostingVariantPrice.deleteByVariantDocIds(
      variants.map((variant) => variant.variantDocId)
    );
    await this.repository.variantListingPriceIndex.deleteByVariantIds(
      variants.map((variant) => variant.variantId)
    );
  }

  private async upsertLatestState(
    action: ListingPreparedSyncAction | ListingPreparedDeleteAction,
    lifecycleStatus: "indexed" | "deleted",
    payloadHash: string
  ): Promise<void> {
    await this.repository.listingIndexItemState.upsertLatestState({
      ...action.itemKey,
      sourceSequence: action.sourceSequence,
      payloadHash,
      lifecycleStatus,
      lastEffectiveIdempotencyKey: action.effectiveIdempotencyKey,
      lastOperationId: action.params.meta.operationId,
      updatedAt: new Date().toISOString(),
    });
  }

  private buildResult(
    action: ListingPreparedSyncAction | ListingPreparedDeleteAction,
    status: Exclude<Listing.ListingUpdateResult["status"], "accepted">
  ): Listing.ListingUpdateResult {
    const result: Listing.ListingUpdateResult = {
      operationId: action.params.meta.operationId,
      storeId: action.itemKey.storeId,
      itemRef: {
        entityType: action.itemKey.entityType,
        id: action.itemKey.itemId,
      },
      sourceSequence: action.sourceSequence,
      status,
      processedAt: new Date().toISOString(),
    };

    if ("warnings" in action && action.warnings && action.warnings.length > 0) {
      result.warnings = action.warnings;
    }

    return result;
  }

  private getStatePayloadHash(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction
  ): string {
    return "syncWriteModel" in input
      ? input.syncWriteModel.writeModelHash
      : input.action.payloadHash;
  }
}
