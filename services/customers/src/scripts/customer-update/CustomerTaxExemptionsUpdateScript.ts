import { BaseScript } from "../../kernel/BaseScript.js";
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
  protected async execute(
    params: CustomerTaxExemptionsUpdateParams
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
        input.operations as unknown as CustomerTaxExemptionPatch
      );
    }
    for (const id of params.operations.deleteIds) {
      await this.repository.taxExemption.softDelete(id);
    }

    return sectionSuccess(hasChanges(params.operations));
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }

  private async validate(
    customerId: string,
    operations: CustomerTaxExemptionsUpdateOperation["params"]
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
    }
    for (const [index, input] of operations.update.entries()) {
      validateOwned(
        byId,
        input.taxExemptionId,
        customerId,
        ["update", String(index), "taxExemptionId"],
        errors
      );
      for (const field of ["code", "status"] as const) {
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
          message: "Tax exemption cannot be updated and deleted together",
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
      message: "Tax exemption not found for this customer",
      code: "NOT_FOUND",
      field,
    });
  }
}

function invalidValue(field: string[]) {
  return { message: "Value cannot be empty", code: "INVALID_VALUE", field };
}

function hasChanges(
  operations: CustomerTaxExemptionsUpdateOperation["params"]
) {
  return (
    operations.create.length > 0 ||
    operations.update.length > 0 ||
    operations.deleteIds.length > 0
  );
}
