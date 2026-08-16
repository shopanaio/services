import { BaseScript } from "../../kernel/BaseScript.js";
import { resolveCatalogComparisonVariants } from "./CatalogComparisonVariants.js";
import {
  comparisonError,
  internalComparisonError,
  revisionConflict,
  validateExpectedRevision,
  type CustomerComparisonMutationResult,
} from "./types.js";

export interface CustomerComparisonCategoryClearParams {
  customerId: string;
  categoryId: string;
  expectedRevision: number;
}

export class CustomerComparisonCategoryClearScript extends BaseScript<
  CustomerComparisonCategoryClearParams,
  CustomerComparisonMutationResult
> {
  protected async execute(
    params: CustomerComparisonCategoryClearParams,
  ): Promise<CustomerComparisonMutationResult> {
    const revisionError = validateExpectedRevision(params.expectedRevision);
    if (revisionError) return failed(revisionError);

    const selection = await this.repository.comparison.getSelection(
      params.customerId,
    );
    const catalog = await resolveCatalogComparisonVariants(this.services, {
      storeId: this.context.store.id,
      categoryId: params.categoryId,
      variantIds: selection.items.map((item) => item.variantId),
    });
    if (!catalog.ok) return failed(catalog.userError);

    const result = await this.repository.comparison.clearVariants({
      customerId: params.customerId,
      expectedRevision: params.expectedRevision,
      variantIds: catalog.variants.map((variant) => variant.variantId),
    });
    switch (result.status) {
      case "applied":
        return {
          customerId: params.customerId,
          revision: result.revision,
          userErrors: [],
        };
      case "conflict":
        return failed(revisionConflict(result.actualRevision));
      case "customer_not_found":
        return failed(
          comparisonError(
            "CUSTOMER_NOT_FOUND",
            "Customer was not found",
          ),
        );
    }
  }

  protected handleError(_error: unknown): CustomerComparisonMutationResult {
    return failed(internalComparisonError());
  }
}

function failed(
  userError: ReturnType<typeof comparisonError>,
): CustomerComparisonMutationResult {
  return { customerId: null, revision: null, userErrors: [userError] };
}

