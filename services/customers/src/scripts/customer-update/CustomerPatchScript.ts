import { BaseScript } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerPatch } from "../../repositories/customer/CustomerRepository.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerPatchParams {
  customerId: string;
  patch: CustomerPatch;
}

export class CustomerPatchScript extends BaseScript<
  CustomerPatchParams,
  CustomerSectionResult
> {
  protected async execute(
    params: CustomerPatchParams
  ): Promise<CustomerSectionResult> {
    const current = await this.repository.customer.findById(params.customerId);
    if (!current) {
      return sectionErrors([
        { message: "Customer not found", code: "NOT_FOUND" },
      ]);
    }

    const errors = validatePatch(params.patch);
    if (params.patch.email) {
      const owner = await this.repository.customer.findByEmail(params.patch.email);
      if (owner && owner.id !== params.customerId) {
        errors.push({
          message: "A customer with this email already exists",
          code: "DUPLICATE_EMAIL",
          field: ["email"],
        });
      }
    }
    if (errors.length > 0) return sectionErrors(errors);

    const patch = changedPatch(current, params.patch);
    if (Object.keys(patch).length === 0) return sectionSuccess(false);

    try {
      const updated = await this.repository.customer.patchWithinRevision(
        params.customerId,
        patch
      );
      if (!updated) {
        return sectionErrors([
          { message: "Customer not found", code: "NOT_FOUND" },
        ]);
      }
    } catch (error) {
      if (isUniqueViolation(error, "customer_store_email_unique")) {
        return sectionErrors([
          {
            message: "A customer with this email already exists",
            code: "DUPLICATE_EMAIL",
            field: ["email"],
          },
        ]);
      }
      throw error;
    }

    return sectionSuccess();
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }
}

function validatePatch(patch: CustomerPatch) {
  const errors: Array<{ message: string; code: string; field: string[] }> = [];

  if (
    patch.phoneE164 !== undefined &&
    patch.phoneE164 !== null &&
    !/^\+[1-9][0-9]{6,14}$/.test(patch.phoneE164)
  ) {
    errors.push({
      message: "Phone number must use E.164 format",
      code: "INVALID_PHONE",
      field: ["phoneE164"],
    });
  }

  if (
    patch.lifecycleStatus === "BLOCKED" &&
    (!patch.blockedReason || patch.blockedReason.trim().length === 0)
  ) {
    errors.push({
      message: "Blocked reason is required for a blocked customer",
      code: "BLOCKED_REASON_REQUIRED",
      field: ["blockedReason"],
    });
  }

  if (
    typeof patch.moderationNote === "string" &&
    patch.moderationNote.trim().length === 0
  ) {
    errors.push({
      message: "Moderation note cannot be empty",
      code: "INVALID_MODERATION_NOTE",
      field: ["moderationNote"],
    });
  }

  return errors;
}

function changedPatch<T extends Record<string, unknown>>(
  current: T,
  patch: CustomerPatch
): CustomerPatch {
  const result: CustomerPatch = {};

  for (const [key, value] of Object.entries(patch)) {
    const normalizedValue =
      key === "email" && typeof value === "string" ? value.trim() || null : value;
    if (current[key] !== normalizedValue) {
      Object.assign(result, { [key]: normalizedValue });
    }
  }

  return result;
}
