import { BaseScript } from "../../kernel/BaseScript.js";
import {
  comparisonError,
  internalComparisonError,
  revisionConflict,
  validateExpectedRevision,
  type CustomerComparisonMutationResult,
} from "./types.js";

export interface CustomerComparisonVariantRemoveParams {
  customerId: string;
  variantId: string;
  expectedRevision: number;
}

export class CustomerComparisonVariantRemoveScript extends BaseScript<
  CustomerComparisonVariantRemoveParams,
  CustomerComparisonMutationResult
> {
  protected async execute(
    params: CustomerComparisonVariantRemoveParams,
  ): Promise<CustomerComparisonMutationResult> {
    const revisionError = validateExpectedRevision(params.expectedRevision);
    if (revisionError) return failed(revisionError);

    const result = await this.repository.comparison.removeVariant(params);
    switch (result.status) {
      case "applied":
        return {
          customerId: params.customerId,
          revision: result.comparison.revision,
          userErrors: [],
        };
      case "not_selected":
        return failed(
          comparisonError(
            "VARIANT_NOT_SELECTED",
            "Variant is not present in the comparison selection",
            ["variantId"],
          ),
        );
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
