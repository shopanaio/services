import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerTaxIdentifier } from "../../repositories/models/index.js";

export interface CustomerTaxIdentifierCreateParams {
  customerId: string;
  identifierType: string;
  countryCode?: string | null;
  value: string;
  status?: CustomerTaxIdentifier["status"] | null;
  isPrimary?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxIdentifierCreateResult {
  taxIdentifier?: { id: string };
  userErrors: UserError[];
}

export class CustomerTaxIdentifierCreateScript extends BaseScript<
  CustomerTaxIdentifierCreateParams,
  CustomerTaxIdentifierCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxIdentifierCreateParams
  ): Promise<CustomerTaxIdentifierCreateResult> {
    const errors = validateTaxIdentifier(params);
    if (!(await this.repository.customer.exists(params.customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (errors.length > 0) {
      return { taxIdentifier: undefined, userErrors: errors };
    }

    try {
      const taxIdentifier = await this.repository.taxIdentifier.create({
        ...params,
        identifierType: params.identifierType.trim(),
        countryCode: params.countryCode?.trim() || null,
        value: params.value.trim(),
        status: params.status ?? undefined,
        isPrimary: params.isPrimary ?? false,
      });
      this.logger.info(
        { taxIdentifierId: taxIdentifier.id, customerId: params.customerId },
        "Customer tax identifier created"
      );
      return {
        taxIdentifier: { id: taxIdentifier.id },
        userErrors: [],
      };
    } catch (error) {
      if (
        isUniqueViolation(error, "customer_tax_identifier_active_unique")
      ) {
        return {
          taxIdentifier: undefined,
          userErrors: [
            {
              message: "This tax identifier already exists for the customer",
              code: "DUPLICATE_TAX_IDENTIFIER",
              field: ["value"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerTaxIdentifierCreateResult {
    return {
      taxIdentifier: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateTaxIdentifier(
  params: CustomerTaxIdentifierCreateParams
): UserError[] {
  const errors: UserError[] = [];
  if (params.identifierType.trim().length === 0) {
    errors.push(invalidValue("identifierType"));
  }
  if (params.value.trim().length === 0) {
    errors.push(invalidValue("value"));
  }
  validateCountryCode(params.countryCode, errors);
  validateDateRange(params.validFrom, params.validTo, errors);
  return errors;
}

function invalidValue(field: string): UserError {
  return {
    message: "Value cannot be empty",
    code: "INVALID_VALUE",
    field: [field],
  };
}

export function validateCountryCode(
  countryCode: string | null | undefined,
  errors: UserError[]
): void {
  if (countryCode != null && !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    errors.push({
      message: "Country code must use ISO 3166-1 alpha-2 format",
      code: "INVALID_COUNTRY_CODE",
      field: ["countryCode"],
    });
  }
}

export function validateDateRange(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  errors: UserError[]
): void {
  if (validFrom && validTo && validTo < validFrom) {
    errors.push({
      message: "Valid-to date cannot be before valid-from date",
      code: "INVALID_DATE_RANGE",
      field: ["validTo"],
    });
  }
}
