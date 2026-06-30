import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";

export interface WarehouseStockDeleteItemParams {
  readonly variantId: string;
  readonly warehouseId: string;
}

export interface WarehouseStockDeleteParams {
  readonly items: WarehouseStockDeleteItemParams[];
}

export interface WarehouseStockDeleteResult {
  deletedWarehouseStockIds: string[];
  userErrors: UserError[];
}

class WarehouseStockDeleteRollbackError extends Error {
  constructor(readonly userErrors: UserError[]) {
    super(userErrors[0]?.message ?? "Warehouse stock delete failed");
  }
}

export class WarehouseStockDeleteScript extends BaseScript<
  WarehouseStockDeleteParams,
  WarehouseStockDeleteResult
> {
  @Transactional()
  protected async execute(
    params: WarehouseStockDeleteParams,
  ): Promise<WarehouseStockDeleteResult> {
    const userErrors: UserError[] = [];
    const validItems: Array<WarehouseStockDeleteItemParams & { stockId: string }> =
      [];
    const seenKeys = new Set<string>();

    for (const [index, item] of params.items.entries()) {
      const fieldPrefix = ["items", String(index)];
      const key = `${item.variantId}:${item.warehouseId}`;

      if (seenKeys.has(key)) {
        userErrors.push({
          message: "Duplicate warehouse stock item",
          code: "DUPLICATE",
          field: fieldPrefix,
        });
        continue;
      }
      seenKeys.add(key);

      const stock = await this.repository.stock.findByVariantWarehouse(
        item.variantId,
        item.warehouseId,
      );

      if (!stock) {
        userErrors.push({
          message: "Warehouse stock not found",
          code: "NOT_FOUND",
          field: fieldPrefix,
        });
        continue;
      }

      if (
        stock.quantityOnHand !== 0 ||
        stock.reservedQty !== 0 ||
        stock.unavailableQty !== 0
      ) {
        userErrors.push({
          message: "Warehouse stock must be empty before deletion",
          code: "STOCK_NOT_EMPTY",
          field: fieldPrefix,
        });
        continue;
      }

      validItems.push({ ...item, stockId: stock.id });
    }

    if (userErrors.length > 0) {
      return { deletedWarehouseStockIds: [], userErrors };
    }

    const deletedWarehouseStockIds: string[] = [];

    for (const [index, item] of validItems.entries()) {
      const deleted = await this.repository.stock.delete(
        item.variantId,
        item.warehouseId,
      );

      if (!deleted) {
        throw new WarehouseStockDeleteRollbackError([
          {
            message: "Warehouse stock was not deleted",
            code: "NOT_DELETED",
            field: ["items", String(index)],
          },
        ]);
      }

      deletedWarehouseStockIds.push(item.stockId);
    }

    return { deletedWarehouseStockIds, userErrors };
  }

  protected handleError(error: unknown): WarehouseStockDeleteResult {
    if (error instanceof WarehouseStockDeleteRollbackError) {
      return {
        deletedWarehouseStockIds: [],
        userErrors: error.userErrors,
      };
    }

    return {
      deletedWarehouseStockIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
