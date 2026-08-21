import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerComparisonUserError extends UserError {
  code: string;
  retryable: boolean;
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
