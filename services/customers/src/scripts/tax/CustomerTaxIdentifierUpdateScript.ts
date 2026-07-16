import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerTaxIdentifierPatch } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import type { CustomerTaxIdentifier } from "../../repositories/models/index.js";
import {
  validateCountryCode,
  validateDateRange,
} from "./CustomerTaxIdentifierCreateScript.js";

export interface CustomerTaxIdentifierUpdateParams {
  id: string;
  operations: {
    identifierType?: string | null;
    countryCode?: string | null;
    value?: string | null;
    status?: CustomerTaxIdentifier["status"] | null;
    isPrimary?: boolean | null;
    validFrom?: string | null;
    validTo?: string | null;
  };
}

export interface CustomerTaxIdentifierUpdateResult {
  taxIdentifier?: { id: string };
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerTaxIdentifierUpdateScript extends BaseScript<
  CustomerTaxIdentifierUpdateParams,
  CustomerTaxIdentifierUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxIdentifierUpdateParams
  ): Promise<CustomerTaxIdentifierUpdateResult> {
    const current = await this.repository.taxIdentifier.findById(params.id);
    if (!current) return notFound();

    const errors = validateUpdate(current, params.operations);
    if (errors.length > 0) {
      return {
        taxIdentifier: undefined,
        customerId: current.customerId,
        userErrors: errors,
      };
    }

    try {
      const updated = await this.repository.taxIdentifier.update(
        params.id,
        patchFromOperations(params.operations)
      );
      if (!updated) return notFound();
      this.logger.info(
        { taxIdentifierId: params.id, customerId: current.customerId },
        "Customer tax identifier updated"
      );
      return {
        taxIdentifier: { id: updated.id },
        customerId: current.customerId,
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_tax_identifier_active_unique")) {
        return {
          taxIdentifier: undefined,
          customerId: current.customerId,
          userErrors: [duplicateError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTaxIdentifierUpdateResult {
    return {
      taxIdentifier: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateUpdate(
  current: CustomerTaxIdentifier,
  operations: CustomerTaxIdentifierUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  for (const field of ["identifierType", "value"] as const) {
    if (
      hasOwn(operations, field) &&
      (operations[field] == null || operations[field].trim().length === 0)
    ) {
      errors.push({
        message: "Value cannot be empty",
        code: "INVALID_VALUE",
        field: [field],
      });
    }
  }
  if (hasOwn(operations, "status") && operations.status == null) {
    errors.push({
      message: "Status cannot be null",
      code: "INVALID_VALUE",
      field: ["status"],
    });
  }
  if (hasOwn(operations, "isPrimary") && operations.isPrimary == null) {
    errors.push({
      message: "Primary flag cannot be null",
      code: "INVALID_VALUE",
      field: ["isPrimary"],
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
  operations: CustomerTaxIdentifierUpdateParams["operations"]
): CustomerTaxIdentifierPatch {
  const patch: CustomerTaxIdentifierPatch = {};
  for (const field of [
    "identifierType",
    "countryCode",
    "value",
    "status",
    "isPrimary",
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
    message: "This tax identifier already exists for the customer",
    code: "DUPLICATE_TAX_IDENTIFIER",
    field: ["value"],
  };
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerTaxIdentifierUpdateResult {
  return {
    taxIdentifier: undefined,
    userErrors: [
      {
        message: "Customer tax identifier not found",
        field: ["taxIdentifierId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
