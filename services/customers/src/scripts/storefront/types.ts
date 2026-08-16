import type { CustomerUpdatedReason } from "@shopana/events";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerRevisionAcquireResult } from "../../repositories/customer/CustomerRepository.js";

export interface StorefrontCustomerUserError extends UserError {
  code: string;
  retryable: boolean;
}

export interface StorefrontCustomerReference {
  id: string;
  revision: number;
}

export interface StorefrontCustomerMutationResult {
  customer: StorefrontCustomerReference | null;
  updatedReasons: CustomerUpdatedReason[];
  userErrors: StorefrontCustomerUserError[];
}

export function storefrontError(
  code: string,
  message: string,
  field?: string[],
  retryable = false
): StorefrontCustomerUserError {
  return { code, message, field, retryable };
}

export function internalStorefrontError(): StorefrontCustomerUserError {
  return storefrontError(
    "INTERNAL_ERROR",
    "The customer operation could not be completed",
    undefined,
    true
  );
}

export function validateExpectedRevision(
  value: number
): StorefrontCustomerUserError | null {
  return Number.isSafeInteger(value) && value >= 0
    ? null
    : storefrontError(
        "INVALID_REVISION",
        "Expected revision must be a non-negative safe integer",
        ["expectedRevision"]
      );
}

export function revisionAcquireError(
  result: Exclude<CustomerRevisionAcquireResult, { status: "acquired" }>
): StorefrontCustomerUserError {
  switch (result.status) {
    case "conflict":
      return storefrontError(
        "REVISION_CONFLICT",
        "Customer was modified by another request",
        ["expectedRevision"]
      );
    case "inactive":
    case "not_found":
      return storefrontError(
        "CUSTOMER_UNAVAILABLE",
        "Customer is not available for storefront writes"
      );
  }
}

export function failedCustomerMutation(
  ...userErrors: StorefrontCustomerUserError[]
): StorefrontCustomerMutationResult {
  return { customer: null, updatedReasons: [], userErrors };
}

export function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
