import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ProductSortRowInput,
  ProductTitleBm25RowInput,
} from "../repositories/listing/listingRepositoryTypes.js";

export class ListingCleanupStaleVariantsScript extends BaseScript<
  {
    productId: string;
    keepVariantIds: readonly string[];
  },
  {
    deletedVariantIds: string[];
    deletedVariantDocIds: number[];
  }
> {
  protected async execute(input: {
    productId: string;
    keepVariantIds: readonly string[];
  }): Promise<{ deletedVariantIds: string[]; deletedVariantDocIds: number[] }> {
    const keep = new Set(input.keepVariantIds);
    const stale = (
      await this.repository.variantListingIndex.getByProductIds([input.productId])
    ).filter((variant) => !keep.has(variant.variantId));

    for (const variant of stale) {
      await this.repository.listingPostingBitmap.deleteVariantMemberships(
        variant.variantDocId
      );
    }
    await this.repository.variantListingIndex.deleteByVariantIds(
      stale.map((variant) => variant.variantId)
    );

    return {
      deletedVariantIds: stale.map((variant) => variant.variantId),
      deletedVariantDocIds: stale.map((variant) => variant.variantDocId),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

export class ListingReplaceProductTitleSearchRowsScript extends BaseScript<
  {
    productId: string;
    rows: readonly ProductTitleBm25RowInput[];
  },
  void
> {
  protected async execute(input: {
    productId: string;
    rows: readonly ProductTitleBm25RowInput[];
  }): Promise<void> {
    await this.repository.productTitleBm25SearchIndex.replaceForProduct(
      input.productId,
      input.rows
    );
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

export class ListingReplaceProductSortRowsScript extends BaseScript<
  {
    productDocId: number;
    rows: readonly ProductSortRowInput[];
  },
  void
> {
  protected async execute(input: {
    productDocId: number;
    rows: readonly ProductSortRowInput[];
  }): Promise<void> {
    await this.repository.listingPostingProductSort.replaceForProduct(
      input.productDocId,
      input.rows
    );
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
