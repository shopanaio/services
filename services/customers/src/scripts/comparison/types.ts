import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerComparisonUserError extends UserError {
  code: string;
  retryable: boolean;
  actualRevision?: number;
}

export interface CustomerComparisonMutationResult {
  customerId: string | null;
  revision: number | null;
  userErrors: CustomerComparisonUserError[];
}

export function comparisonError(
  code: string,
  message: string,
  field?: string[],
  retryable = false,
): CustomerComparisonUserError {
  return { code, message, field, retryable };
}

export function internalComparisonError(): CustomerComparisonUserError {
  return comparisonError(
    "INTERNAL_ERROR",
    "The product comparison operation could not be completed",
    undefined,
    true,
  );
}

export function validateExpectedRevision(value: number): CustomerComparisonUserError | null {
  return Number.isSafeInteger(value) && value >= 0
    ? null
    : comparisonError("INVALID_REVISION", "Expected revision must be a non-negative safe integer", [
        "expectedRevision",
      ]);
}

export function revisionConflict(actualRevision: number): CustomerComparisonUserError {
  return {
    ...comparisonError(
      "REVISION_CONFLICT",
      `Comparison revision changed to ${actualRevision}`,
      ["expectedRevision"],
      true,
    ),
    actualRevision,
  };
}
