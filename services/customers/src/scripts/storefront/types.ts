import type { CustomerUpdatedReason } from "@shopana/events";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerRevisionBumpResult } from "../../repositories/customer/CustomerRepository.js";

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
  retryable = false,
): StorefrontCustomerUserError {
  return { code, message, field, retryable };
}

export function internalStorefrontError(): StorefrontCustomerUserError {
  return storefrontError(
    "INTERNAL_ERROR",
    "The customer operation could not be completed",
    undefined,
    true,
  );
}

export function customerAvailabilityError(
  result: Exclude<CustomerRevisionBumpResult, { status: "updated" }>,
): StorefrontCustomerUserError {
  switch (result.status) {
    case "inactive":
    case "not_found":
      return storefrontError(
        "CUSTOMER_UNAVAILABLE",
        "Customer is not available for storefront writes",
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
