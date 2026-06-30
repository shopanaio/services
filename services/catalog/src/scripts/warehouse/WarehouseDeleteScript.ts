import { BaseScript, type UserError } from "../../kernel/BaseScript.js";

export interface WarehouseDeleteParams {
  readonly id: string;
}

export interface WarehouseDeleteResult {
  deletedWarehouseId?: string;
  userErrors: UserError[];
}

export class WarehouseDeleteScript extends BaseScript<WarehouseDeleteParams, WarehouseDeleteResult> {
  protected async execute(params: WarehouseDeleteParams): Promise<WarehouseDeleteResult> {
    const { id } = params;

    // 1. Check if warehouse exists
    const existing = await this.repository.warehouse.findById(id);
    if (!existing) {
      return {
        deletedWarehouseId: undefined,
        userErrors: [{ message: "Warehouse not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete warehouse (CASCADE will delete warehouse_stock)
    const deleted = await this.repository.warehouse.delete(id);
    if (!deleted) {
      return {
        deletedWarehouseId: undefined,
        userErrors: [{ message: "Failed to delete warehouse", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ warehouseId: id }, "Warehouse deleted successfully");

    return { deletedWarehouseId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): WarehouseDeleteResult {
    return {
      deletedWarehouseId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
