import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Warehouse } from "../../repositories/models/index.js";

export interface WarehouseCreateParams {
  readonly code: string;
  readonly name: string;
  readonly isDefault?: boolean;
}

export interface WarehouseCreateResult {
  warehouse?: Warehouse;
  userErrors: UserError[];
}

export class WarehouseCreateScript extends BaseScript<WarehouseCreateParams, WarehouseCreateResult> {
  protected async execute(params: WarehouseCreateParams): Promise<WarehouseCreateResult> {
    const { code, name, isDefault } = params;

    // 1. Check if code is unique for this project
    const existing = await this.repository.warehouse.findByCode(code);
    if (existing) {
      return {
        warehouse: undefined,
        userErrors: [{ message: `Warehouse with code "${code}" already exists`, field: ["code"], code: "CODE_ALREADY_EXISTS" }],
      };
    }

    // 2. If isDefault=true, clear existing default
    if (isDefault) {
      await this.repository.warehouse.clearDefault();
    }

    // 3. Create warehouse
    const warehouse = await this.repository.warehouse.create({
      code,
      name,
      isDefault: isDefault ?? false,
    });

    this.logger.info({ warehouseId: warehouse.id }, "Warehouse created successfully");

    return { warehouse, userErrors: [] };
  }

  protected handleError(_error: unknown): WarehouseCreateResult {
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
