import { BaseScript } from "../kernel/BaseScript.js";

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
    // Inside the parent item transaction, delete variants that exist in the
    // index for the product but are absent from the incoming full snapshot.
    // Remove variant memberships, variant prices, runtime price rows and
    // variant_listing_index rows; return touched variant doc ids.
    void input;
    throw new Error("ListingCleanupStaleVariantsScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

export class ListingReplaceProductTitleSearchRowsScript extends BaseScript<
  {
    productId: string;
    rows: readonly unknown[];
  },
  void
> {
  protected async execute(input: {
    productId: string;
    rows: readonly unknown[];
  }): Promise<void> {
    // Replace localized BM25 title rows for a product inside the parent item
    // transaction. Empty rows delete all BM25 title rows for that product.
    void input;
    throw new Error(
      "ListingReplaceProductTitleSearchRowsScript is not implemented yet"
    );
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

export class ListingReplaceRuntimeVariantPriceRowsScript extends BaseScript<
  {
    variantDocId: number;
    rows: readonly unknown[];
  },
  void
> {
  protected async execute(input: {
    variantDocId: number;
    rows: readonly unknown[];
  }): Promise<void> {
    // Replace runtime price rows for one variant inside the parent item
    // transaction. Empty rows delete runtime prices for that variant doc id.
    void input;
    throw new Error(
      "ListingReplaceRuntimeVariantPriceRowsScript is not implemented yet"
    );
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

export class ListingReplaceProductSortRowsScript extends BaseScript<
  {
    productDocId: number;
    rows: readonly unknown[];
  },
  void
> {
  protected async execute(input: {
    productDocId: number;
    rows: readonly unknown[];
  }): Promise<void> {
    // Replace all physical sort rows for one product doc id inside the parent
    // item transaction. Empty rows delete existing sort rows for the product.
    void input;
    throw new Error("ListingReplaceProductSortRowsScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
