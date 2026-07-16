import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerTaxExemption } from "../../repositories/models/index.js";
import type { CustomerTaxExemptionPatch } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import {
  validateCountryCode,
  validateDateRange,
} from "./CustomerTaxIdentifierCreateScript.js";

export interface CustomerTaxExemptionUpdateParams {
  id: string;
  operations: {
    code?: string | null;
    countryCode?: string | null;
    regionCode?: string | null;
    reason?: string | null;
    status?: CustomerTaxExemption["status"] | null;
    certificateFileId?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
  };
}

export interface CustomerTaxExemptionUpdateResult {
  taxExemption?: { id: string };
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerTaxExemptionUpdateScript extends BaseScript<
  CustomerTaxExemptionUpdateParams,
  CustomerTaxExemptionUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxExemptionUpdateParams
  ): Promise<CustomerTaxExemptionUpdateResult> {
    const current = await this.repository.taxExemption.findById(params.id);
    if (!current) return notFound();

    const errors = validateUpdate(current, params.operations);
    if (errors.length > 0) {
      return {
        taxExemption: undefined,
        customerId: current.customerId,
        userErrors: errors,
      };
    }

    try {
      const updated = await this.repository.taxExemption.update(
        params.id,
        patchFromOperations(params.operations)
      );
      if (!updated) return notFound();
      this.logger.info(
        { taxExemptionId: params.id, customerId: current.customerId },
        "Customer tax exemption updated"
      );
      return {
        taxExemption: { id: updated.id },
        customerId: current.customerId,
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_tax_exemption_active_unique")) {
        return {
          taxExemption: undefined,
          customerId: current.customerId,
          userErrors: [duplicateError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTaxExemptionUpdateResult {
    return {
      taxExemption: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateUpdate(
  current: CustomerTaxExemption,
  operations: CustomerTaxExemptionUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  if (
    hasOwn(operations, "code") &&
    (operations.code == null || operations.code.trim().length === 0)
  ) {
    errors.push({
      message: "Value cannot be empty",
      code: "INVALID_VALUE",
      field: ["code"],
    });
  }
  if (hasOwn(operations, "status") && operations.status == null) {
    errors.push({
      message: "Status cannot be null",
      code: "INVALID_VALUE",
      field: ["status"],
    });
  }
  validateCountryCode(operations.countryCode, errors);
  validateDateRange(
    hasOwn(operations, "validFrom") ? operations.validFrom : current.validFrom,
    hasOwn(operations, "validTo") ? operations.validTo : current.validTo,
    errors
  );
  return errors;
}

function patchFromOperations(
  operations: CustomerTaxExemptionUpdateParams["operations"]
): CustomerTaxExemptionPatch {
  const patch: CustomerTaxExemptionPatch = {};
  for (const field of [
    "code",
    "countryCode",
    "regionCode",
    "reason",
    "status",
    "certificateFileId",
    "validFrom",
    "validTo",
  ] as const) {
    if (hasOwn(operations, field)) {
      Object.assign(patch, { [field]: operations[field] });
    }
  }
  return patch;
}

function duplicateError(): UserError {
  return {
    message: "This tax exemption already exists for the customer",
    code: "DUPLICATE_TAX_EXEMPTION",
    field: ["code"],
  };
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerTaxExemptionUpdateResult {
  return {
    taxExemption: undefined,
    userErrors: [
      {
        message: "Customer tax exemption not found",
        field: ["taxExemptionId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
