import { BaseScript } from "../../kernel/BaseScript.js";
import { resolveCatalogComparisonVariants } from "./CatalogComparisonVariants.js";
import {
  comparisonError,
  internalComparisonError,
  revisionConflict,
  validateExpectedRevision,
  type CustomerComparisonMutationResult,
} from "./types.js";

export interface CustomerComparisonVariantAddParams {
  customerId: string;
  variantId: string;
}

export class CustomerComparisonVariantAddScript extends BaseScript<
  CustomerComparisonVariantAddParams,
  CustomerComparisonMutationResult
> {
  protected async execute(
    params: CustomerComparisonVariantAddParams,
  ): Promise<CustomerComparisonMutationResult> {
    const revisionError = validateExpectedRevision();
    if (revisionError) return failed(revisionError);

    const catalog = await resolveCatalogComparisonVariants(this.services, {
      storeId: this.context.store.id,
      variantIds: [params.variantId],
      scope: "STOREFRONT_VISIBLE",
    });
    if (!catalog.ok) return failed(catalog.userError);
    const variant = catalog.variants.find((candidate) => candidate.variantId === params.variantId);
    if (!variant) {
      return failed(
        comparisonError("VARIANT_NOT_AVAILABLE", "Published variant was not found", ["variantId"]),
      );
    }

    const result = await this.repository.comparison.addVariant({
      customerId: params.customerId,
      productId: variant.productId,
      variantId: params.variantId,
    });
    switch (result.status) {
      case "applied":
      case "already_selected":
        return {
          customerId: params.customerId,
          revision: result.comparison.revision,
          userErrors: [],
        };
      case "conflict":
        return failed(revisionConflict(result.actualRevision));
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
