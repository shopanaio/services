import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerTaxExemptionPatch } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import type { CustomerTaxExemptionsUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerTaxExemptionsUpdateParams {
  customerId: string;
  operations: CustomerTaxExemptionsUpdateOperation["params"];
}

export class CustomerTaxExemptionsUpdateScript extends BaseScript<
  CustomerTaxExemptionsUpdateParams,
  CustomerSectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxExemptionsUpdateParams,
  ): Promise<CustomerSectionResult> {
    const errors = await this.validate(params.customerId, params.operations);
    if (errors.length > 0) return sectionErrors(errors);

    for (const input of params.operations.create) {
      await this.repository.taxExemption.create({
        ...input,
        customerId: params.customerId,
        status: input.status ?? "ACTIVE",
      });
    }
    for (const input of params.operations.update) {
      await this.repository.taxExemption.update(
        input.taxExemptionId,
        input.operations as unknown as CustomerTaxExemptionPatch,
      );
    }
    for (const id of params.operations.deleteIds) {
      await this.repository.taxExemption.softDelete(id);
    }

    const changed = hasChanges(params.operations);
    if (changed) {
      await this.invalidateDynamicSegments(params.customerId, ["taxExemption"], "taxExemption");
    }
    return sectionSuccess(changed);
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }

  private async validate(
    customerId: string,
    operations: CustomerTaxExemptionsUpdateOperation["params"],
  ) {
    const errors: Array<{ message: string; code: string; field?: string[] }> = [];
    const updateIds = operations.update.map((item) => item.taxExemptionId);
    const rows = await this.repository.taxExemption.getByIds([
      ...updateIds,
      ...operations.deleteIds,
    ]);
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const [index, input] of operations.create.entries()) {
      if (input.code.trim().length === 0) {
        errors.push(invalidValue(["create", String(index), "code"]));
      }
      validateCountry(input.countryCode, ["create", String(index), "countryCode"], errors);
      validateDateRange(input.validFrom, input.validTo, ["create", String(index)], errors);
    }
    for (const [index, input] of operations.update.entries()) {
      validateOwned(
        byId,
        input.taxExemptionId,
        customerId,
        ["update", String(index), "taxExemptionId"],
        errors,
      );
      for (const field of ["code", "status"] as const) {
        const value = input.operations[field];
        if (
          value !== undefined &&
          (value === null || (typeof value === "string" && value.trim().length === 0))
        ) {
          errors.push(invalidValue(["update", String(index), "operations", field]));
        }
      }
      validateCountry(
        input.operations.countryCode,
        ["update", String(index), "operations", "countryCode"],
        errors,
      );
      validateDateRange(
        input.operations.validFrom === undefined
          ? byId.get(input.taxExemptionId)?.validFrom
          : input.operations.validFrom,
        input.operations.validTo === undefined
          ? byId.get(input.taxExemptionId)?.validTo
          : input.operations.validTo,
        ["update", String(index), "operations"],
        errors,
      );
    }
    for (const [index, id] of operations.deleteIds.entries()) {
      validateOwned(byId, id, customerId, ["deleteIds", String(index)], errors);
      if (updateIds.includes(id)) {
        errors.push({
          message: "Tax exemption cannot be updated and deleted together",
          code: "CONFLICTING_OPERATION",
          field: ["deleteIds", String(index)],
        });
      }
    }
    addDuplicateIds(updateIds, ["update"], "taxExemptionId", errors);
    addDuplicateIds(operations.deleteIds, ["deleteIds"], undefined, errors);
    return errors;
  }
}

function validateOwned(
  byId: Map<string, { customerId: string }>,
  id: string,
  customerId: string,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  const row = byId.get(id);
  if (!row || row.customerId !== customerId) {
    errors.push({
      message: "Tax exemption not found for this customer",
      code: "NOT_FOUND",
      field,
    });
  }
}

function invalidValue(field: string[]) {
  return { message: "Value cannot be empty", code: "INVALID_VALUE", field };
}

function validateCountry(
  value: string | null | undefined,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  if (value != null && !/^[A-Za-z]{2}$/u.test(value.trim())) {
    errors.push({
      message: "Country code must use ISO alpha-2 format",
      code: "INVALID_COUNTRY_CODE",
      field,
    });
  }
}

function validateDateRange(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  if (validFrom && validTo && validTo < validFrom) {
    errors.push({
      message: "validTo must not precede validFrom",
      code: "INVALID_DATE_RANGE",
      field,
    });
  }
}

function addDuplicateIds(
  values: readonly string[],
  field: string[],
  childField: string | undefined,
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value))
      errors.push({
        message: "Tax exemption ID cannot appear more than once",
        code: "DUPLICATE_ID",
        field: [...field, String(index), ...(childField ? [childField] : [])],
      });
    seen.add(value);
  });
}

function hasChanges(operations: CustomerTaxExemptionsUpdateOperation["params"]) {
  return (
    operations.create.length > 0 || operations.update.length > 0 || operations.deleteIds.length > 0
  );
}
