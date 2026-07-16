import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerTaxExemption } from "../../repositories/models/index.js";
import {
  validateCountryCode,
  validateDateRange,
} from "./CustomerTaxIdentifierCreateScript.js";

export interface CustomerTaxExemptionCreateParams {
  customerId: string;
  code: string;
  countryCode?: string | null;
  regionCode?: string | null;
  reason?: string | null;
  status?: CustomerTaxExemption["status"] | null;
  certificateFileId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxExemptionCreateResult {
  taxExemption?: { id: string };
  userErrors: UserError[];
}

export class CustomerTaxExemptionCreateScript extends BaseScript<
  CustomerTaxExemptionCreateParams,
  CustomerTaxExemptionCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxExemptionCreateParams
  ): Promise<CustomerTaxExemptionCreateResult> {
    const errors = validateTaxExemption(params);
    if (!(await this.repository.customer.exists(params.customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (errors.length > 0) {
      return { taxExemption: undefined, userErrors: errors };
    }

    try {
      const taxExemption = await this.repository.taxExemption.create({
        ...params,
        code: params.code.trim(),
        countryCode: params.countryCode?.trim() || null,
        status: params.status ?? "ACTIVE",
      });
      this.logger.info(
        { taxExemptionId: taxExemption.id, customerId: params.customerId },
        "Customer tax exemption created"
      );
      return { taxExemption: { id: taxExemption.id }, userErrors: [] };
    } catch (error) {
      if (
        isUniqueViolation(error, "customer_tax_exemption_active_unique")
      ) {
        return {
          taxExemption: undefined,
          userErrors: [
            {
              message: "This tax exemption already exists for the customer",
              code: "DUPLICATE_TAX_EXEMPTION",
              field: ["code"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTaxExemptionCreateResult {
    return {
      taxExemption: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateTaxExemption(
  params: CustomerTaxExemptionCreateParams
): UserError[] {
  const errors: UserError[] = [];
  if (params.code.trim().length === 0) {
    errors.push({
      message: "Value cannot be empty",
      code: "INVALID_VALUE",
      field: ["code"],
    });
  }
  validateCountryCode(params.countryCode, errors);
  validateDateRange(params.validFrom, params.validTo, errors);
  return errors;
}
