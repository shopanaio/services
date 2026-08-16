import type { CustomerUpdatedReason } from "@shopana/events";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerPatch } from "../../repositories/customer/CustomerRepository.js";
import type { Customer } from "../../repositories/models/index.js";
import {
  failedCustomerMutation,
  hasOwn,
  internalStorefrontError,
  revisionAcquireError,
  storefrontError,
  validateExpectedRevision,
  type StorefrontCustomerMutationResult,
  type StorefrontCustomerUserError,
} from "./types.js";

export type StorefrontCustomerProfilePatch = Partial<
  Pick<
    CustomerPatch,
    | "prefix"
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "preferredLocale"
    | "dateOfBirth"
    | "gender"
    | "companyName"
    | "jobTitle"
  >
>;

export interface StorefrontCustomerUpdateParams {
  customerId: string;
  expectedRevision: number;
  patch: StorefrontCustomerProfilePatch;
}

export type StorefrontCustomerUpdateResult = StorefrontCustomerMutationResult;

const STRING_LIMITS = {
  prefix: 32,
  firstName: 128,
  middleName: 128,
  lastName: 128,
  suffix: 32,
  preferredLocale: 35,
  gender: 32,
  companyName: 255,
  jobTitle: 255,
} as const;

export class StorefrontCustomerUpdateScript extends BaseScript<
  StorefrontCustomerUpdateParams,
  StorefrontCustomerUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerUpdateParams
  ): Promise<StorefrontCustomerUpdateResult> {
    const revisionError = validateExpectedRevision(params.expectedRevision);
    if (revisionError) return failedCustomerMutation(revisionError);

    const current = await this.repository.customer.findById(params.customerId);
    if (!current || current.lifecycleStatus !== "ACTIVE") {
      return failedCustomerMutation(
        storefrontError(
          "CUSTOMER_UNAVAILABLE",
          "Customer is not available for storefront writes"
        )
      );
    }

    const patch = normalizeProfilePatch(params.patch);
    const validationErrors = validateProfilePatch(
      patch,
      this.context.store.locales
    );
    if (validationErrors.length > 0) {
      return failedCustomerMutation(...validationErrors);
    }

    const changed = changedProfilePatch(current, patch);
    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision
    );
    if (acquired.status !== "acquired") {
      return failedCustomerMutation(revisionAcquireError(acquired));
    }

    if (Object.keys(changed).length > 0) {
      const updated = await this.repository.customer.patchWithinRevision(
        params.customerId,
        changed
      );
      if (!updated) throw new Error("Acquired customer could not be updated");
    }

    return {
      customer: {
        id: acquired.customer.id,
        revision: acquired.customer.revision,
      },
      updatedReasons: updatedReasons(changed),
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StorefrontCustomerUpdateResult {
    return failedCustomerMutation(internalStorefrontError());
  }
}

function normalizeProfilePatch(
  input: StorefrontCustomerProfilePatch
): StorefrontCustomerProfilePatch {
  const patch: StorefrontCustomerProfilePatch = {};
  for (const key of Object.keys(input) as Array<keyof StorefrontCustomerProfilePatch>) {
    if (!hasOwn(input, key)) continue;
    const value = input[key];
    Object.assign(patch, {
      [key]: typeof value === "string" ? value.trim() || null : value,
    });
  }
  return patch;
}

function validateProfilePatch(
  patch: StorefrontCustomerProfilePatch,
  locales: readonly string[]
): StorefrontCustomerUserError[] {
  const errors: StorefrontCustomerUserError[] = [];
  for (const [field, limit] of Object.entries(STRING_LIMITS) as Array<
    [keyof typeof STRING_LIMITS, number]
  >) {
    const value = patch[field];
    if (typeof value === "string" && [...value].length > limit) {
      errors.push(
        storefrontError(
          "INVALID_VALUE",
          `Value must not exceed ${limit} characters`,
          [field]
        )
      );
    }
  }

  if (
    patch.preferredLocale &&
    !locales.includes(patch.preferredLocale)
  ) {
    errors.push(
      storefrontError(
        "UNSUPPORTED_LOCALE",
        "Locale is not enabled for this store",
        ["preferredLocale"]
      )
    );
  }
  if (patch.dateOfBirth && !isCalendarDate(patch.dateOfBirth)) {
    errors.push(
      storefrontError(
        "INVALID_DATE_OF_BIRTH",
        "Date of birth must be a valid YYYY-MM-DD date",
        ["dateOfBirth"]
      )
    );
  } else if (patch.dateOfBirth && patch.dateOfBirth > today()) {
    errors.push(
      storefrontError(
        "INVALID_DATE_OF_BIRTH",
        "Date of birth cannot be in the future",
        ["dateOfBirth"]
      )
    );
  }
  return errors;
}

function changedProfilePatch(
  current: Customer,
  patch: StorefrontCustomerProfilePatch
): StorefrontCustomerProfilePatch {
  const changed: StorefrontCustomerProfilePatch = {};
  for (const key of Object.keys(patch) as Array<keyof StorefrontCustomerProfilePatch>) {
    if (current[key] !== patch[key]) {
      Object.assign(changed, { [key]: patch[key] });
    }
  }
  return changed;
}

function updatedReasons(
  patch: StorefrontCustomerProfilePatch
): CustomerUpdatedReason[] {
  const reasons = new Set<CustomerUpdatedReason>();
  for (const key of Object.keys(patch)) {
    reasons.add(
      key === "companyName" || key === "jobTitle" ? "company" : "profile"
    );
  }
  return ["profile", "company"].filter((reason) =>
    reasons.has(reason as CustomerUpdatedReason)
  ) as CustomerUpdatedReason[];
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
