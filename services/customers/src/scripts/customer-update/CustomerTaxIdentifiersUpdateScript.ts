import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  normalizeTaxIdentifier,
  type CustomerTaxIdentifierPatch,
} from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import type { CustomerTaxIdentifiersUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerTaxIdentifiersUpdateParams {
  customerId: string;
  operations: CustomerTaxIdentifiersUpdateOperation["params"];
}

export class CustomerTaxIdentifiersUpdateScript extends BaseScript<
  CustomerTaxIdentifiersUpdateParams,
  CustomerSectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxIdentifiersUpdateParams,
  ): Promise<CustomerSectionResult> {
    const errors = await this.validate(params.customerId, params.operations);
    if (errors.length > 0) return sectionErrors(errors);

    for (const input of params.operations.create) {
      await this.repository.taxIdentifier.create({
        ...input,
        customerId: params.customerId,
        status: input.status ?? undefined,
        isPrimary: input.isPrimary ?? false,
      });
    }
    for (const input of params.operations.update) {
      await this.repository.taxIdentifier.update(
        input.taxIdentifierId,
        input.operations as unknown as CustomerTaxIdentifierPatch,
      );
    }
    for (const id of params.operations.deleteIds) {
      await this.repository.taxIdentifier.softDelete(id);
    }

    const changed = hasChanges(params.operations);
    if (changed) {
      await this.invalidateDynamicSegments(params.customerId, ["taxIdentifier"], "taxIdentifier");
    }
    return sectionSuccess(changed);
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }

  private async validate(
    customerId: string,
    operations: CustomerTaxIdentifiersUpdateOperation["params"],
  ) {
    const errors: Array<{ message: string; code: string; field?: string[] }> = [];
    const updateIds = operations.update.map((item) => item.taxIdentifierId);
    const rows = await this.repository.taxIdentifier.getByIds([
      ...updateIds,
      ...operations.deleteIds,
    ]);
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const [index, input] of operations.create.entries()) {
      if (input.identifierType.trim().length === 0) {
        errors.push(invalidValue(["create", String(index), "identifierType"]));
      }
      if (normalizeTaxIdentifier(input.value).length === 0) {
        errors.push(invalidValue(["create", String(index), "value"]));
      }
      validateCountry(input.countryCode, ["create", String(index), "countryCode"], errors);
      validateDateRange(input.validFrom, input.validTo, ["create", String(index)], errors);
      if (input.status === "VERIFIED") {
        errors.push({
          message: "Verified tax identifiers require a verification workflow",
          code: "VERIFICATION_REQUIRED",
          field: ["create", String(index), "status"],
        });
      }
    }
    for (const [index, input] of operations.update.entries()) {
      validateOwned(
        byId,
        input.taxIdentifierId,
        customerId,
        ["update", String(index), "taxIdentifierId"],
        errors,
      );
      for (const field of ["identifierType", "value", "status"] as const) {
        const value = input.operations[field];
        if (
          value !== undefined &&
          (value === null || (typeof value === "string" && value.trim().length === 0))
        ) {
          errors.push(invalidValue(["update", String(index), "operations", field]));
        }
      }
      if (
        typeof input.operations.value === "string" &&
        input.operations.value.trim().length > 0 &&
        normalizeTaxIdentifier(input.operations.value).length === 0
      ) {
        errors.push(invalidValue(["update", String(index), "operations", "value"]));
      }
      validateCountry(
        input.operations.countryCode,
        ["update", String(index), "operations", "countryCode"],
        errors,
      );
      validateDateRange(
        input.operations.validFrom === undefined
          ? byId.get(input.taxIdentifierId)?.validFrom
          : input.operations.validFrom,
        input.operations.validTo === undefined
          ? byId.get(input.taxIdentifierId)?.validTo
          : input.operations.validTo,
        ["update", String(index), "operations"],
        errors,
      );
      if (input.operations.status === "VERIFIED") {
        errors.push({
          message: "Verified tax identifiers require a verification workflow",
          code: "VERIFICATION_REQUIRED",
          field: ["update", String(index), "operations", "status"],
        });
      }
    }
    for (const [index, id] of operations.deleteIds.entries()) {
      validateOwned(byId, id, customerId, ["deleteIds", String(index)], errors);
      if (updateIds.includes(id)) {
        errors.push({
          message: "Tax identifier cannot be updated and deleted together",
          code: "CONFLICTING_OPERATION",
          field: ["deleteIds", String(index)],
        });
      }
    }
    addDuplicateIds(updateIds, ["update"], "taxIdentifierId", errors);
    addDuplicateIds(operations.deleteIds, ["deleteIds"], undefined, errors);

    const keys = new Set<string>();
    for (const [index, input] of operations.create.entries()) {
      const key = taxIdentifierKey(input.identifierType, input.countryCode, input.value);
      if (
        keys.has(key) ||
        (await this.repository.taxIdentifier.findDuplicate({
          customerId,
          identifierType: input.identifierType,
          countryCode: input.countryCode,
          value: input.value,
        }))
      ) {
        errors.push(duplicateTaxIdentifier(["create", String(index), "value"]));
      }
      keys.add(key);
    }
    for (const [index, input] of operations.update.entries()) {
      const current = byId.get(input.taxIdentifierId);
      if (!current || current.customerId !== customerId) continue;
      const identifierType = input.operations.identifierType ?? current.identifierType;
      const countryCode =
        input.operations.countryCode === undefined
          ? current.countryCode
          : input.operations.countryCode;
      const value = input.operations.value ?? current.value;
      const key = taxIdentifierKey(identifierType, countryCode, value);
      if (
        keys.has(key) ||
        (await this.repository.taxIdentifier.findDuplicate({
          customerId,
          identifierType,
          countryCode,
          value,
          exceptId: input.taxIdentifierId,
        }))
      ) {
        errors.push(duplicateTaxIdentifier(["update", String(index), "operations", "value"]));
      }
      keys.add(key);
    }
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
      message: "Tax identifier not found for this customer",
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
        message: "Tax identifier ID cannot appear more than once",
        code: "DUPLICATE_ID",
        field: [...field, String(index), ...(childField ? [childField] : [])],
      });
    seen.add(value);
  });
}

function taxIdentifierKey(
  identifierType: string,
  countryCode: string | null | undefined,
  value: string,
) {
  return `${identifierType.trim()}\u0000${countryCode?.trim().toUpperCase() ?? ""}\u0000${normalizeTaxIdentifier(value)}`;
}

function duplicateTaxIdentifier(field: string[]) {
  return {
    message: "A matching tax identifier already exists",
    code: "DUPLICATE_TAX_IDENTIFIER",
    field,
  };
}

function hasChanges(operations: CustomerTaxIdentifiersUpdateOperation["params"]) {
  return (
    operations.create.length > 0 || operations.update.length > 0 || operations.deleteIds.length > 0
  );
}
