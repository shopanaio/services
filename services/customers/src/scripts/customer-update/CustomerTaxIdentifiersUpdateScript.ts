import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerTaxIdentifierPatch } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
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
    params: CustomerTaxIdentifiersUpdateParams
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
        input.operations as unknown as CustomerTaxIdentifierPatch
      );
    }
    for (const id of params.operations.deleteIds) {
      await this.repository.taxIdentifier.softDelete(id);
    }

    const changed = hasChanges(params.operations);
    if (changed) {
      await this.invalidateDynamicSegments(
        params.customerId,
        ["taxIdentifier"],
        "taxIdentifier",
      );
    }
    return sectionSuccess(changed);
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }

  private async validate(
    customerId: string,
    operations: CustomerTaxIdentifiersUpdateOperation["params"]
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
      if (input.value.trim().length === 0) {
        errors.push(invalidValue(["create", String(index), "value"]));
      }
    }
    for (const [index, input] of operations.update.entries()) {
      validateOwned(
        byId,
        input.taxIdentifierId,
        customerId,
        ["update", String(index), "taxIdentifierId"],
        errors
      );
      for (const field of ["identifierType", "value", "status"] as const) {
        const value = input.operations[field];
        if (
          value !== undefined &&
          (value === null || (typeof value === "string" && value.trim().length === 0))
        ) {
          errors.push(
            invalidValue(["update", String(index), "operations", field])
          );
        }
      }
    }
    for (const [index, id] of operations.deleteIds.entries()) {
      validateOwned(
        byId,
        id,
        customerId,
        ["deleteIds", String(index)],
        errors
      );
      if (updateIds.includes(id)) {
        errors.push({
          message: "Tax identifier cannot be updated and deleted together",
          code: "CONFLICTING_OPERATION",
          field: ["deleteIds", String(index)],
        });
      }
    }
    return errors;
  }
}

function validateOwned(
  byId: Map<string, { customerId: string }>,
  id: string,
  customerId: string,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>
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

function hasChanges(
  operations: CustomerTaxIdentifiersUpdateOperation["params"]
) {
  return (
    operations.create.length > 0 ||
    operations.update.length > 0 ||
    operations.deleteIds.length > 0
  );
}
