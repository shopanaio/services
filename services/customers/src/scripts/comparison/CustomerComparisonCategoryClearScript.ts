import { BaseScript } from "../../kernel/BaseScript.js";
import { resolveCatalogComparisonVariants } from "./CatalogComparisonVariants.js";
import {
  comparisonError,
  internalComparisonError,
  type CustomerComparisonMutationResult,
} from "./types.js";

export interface CustomerComparisonCategoryClearParams {
  customerId: string;
  categoryId: string;
}

export class CustomerComparisonCategoryClearScript extends BaseScript<
  CustomerComparisonCategoryClearParams,
  CustomerComparisonMutationResult
> {
  protected async execute(
    params: CustomerComparisonCategoryClearParams,
  ): Promise<CustomerComparisonMutationResult> {
    const selection = await this.repository.comparison.getSelection(params.customerId);
    const catalog = await resolveCatalogComparisonVariants(this.services, {
      storeId: this.context.store.id,
      categoryId: params.categoryId,
      variantIds: selection.items.map((item) => item.variantId),
      scope: "CURRENT_CATALOG",
    });
    if (!catalog.ok) return failed(catalog.userError);

    const currentByVariantId = new Map(
      catalog.variants.map((variant) => [variant.variantId, variant]),
    );
    const removableVariantIds = selection.items.flatMap((item) => {
      const current = currentByVariantId.get(item.variantId);
      return !current ||
        current.productId !== item.productId ||
        current.primaryCategoryId === null ||
        current.primaryCategoryId === params.categoryId
        ? [item.variantId]
        : [];
    });

    const result = await this.repository.comparison.clearVariants({
      customerId: params.customerId,

      variantIds: removableVariantIds,
    });
    switch (result.status) {
      case "applied":
        return {
          customerId: params.customerId,
          revision: result.revision,
          userErrors: [],
        };
      case "customer_not_found":
        return failed(comparisonError("CUSTOMER_NOT_FOUND", "Customer was not found"));
    }
  }

  protected handleError(_error: unknown): CustomerComparisonMutationResult {
    return failed(internalComparisonError());
  }
}

function failed(userError: ReturnType<typeof comparisonError>): CustomerComparisonMutationResult {
  return { customerId: null, revision: null, userErrors: [userError] };
}
