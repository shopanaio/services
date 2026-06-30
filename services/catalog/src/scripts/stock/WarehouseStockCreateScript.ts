import { randomUUID } from "crypto";
import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { WarehouseStock } from "../../repositories/models/index.js";

export interface WarehouseStockCreateItemParams {
  readonly variantId: string;
  readonly warehouseId: string;
}

export interface WarehouseStockCreateParams {
  readonly items: WarehouseStockCreateItemParams[];
}

export interface WarehouseStockCreateResult {
  warehouseStocks: WarehouseStock[];
  userErrors: UserError[];
}

class WarehouseStockCreateRollbackError extends Error {
  constructor(readonly userErrors: UserError[]) {
    super(userErrors[0]?.message ?? "Warehouse stock create failed");
  }
}

export class WarehouseStockCreateScript extends BaseScript<
  WarehouseStockCreateParams,
  WarehouseStockCreateResult
> {
  @Transactional()
  protected async execute(
    params: WarehouseStockCreateParams,
  ): Promise<WarehouseStockCreateResult> {
    const userErrors: UserError[] = [];
    const validItems: WarehouseStockCreateItemParams[] = [];
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

      const variantExists = await this.repository.variant.exists(item.variantId);
      if (!variantExists) {
        userErrors.push({
          message: "Variant not found",
          code: "NOT_FOUND",
          field: [...fieldPrefix, "variantId"],
        });
        continue;
      }

      const warehouseExists = await this.repository.warehouse.exists(
        item.warehouseId,
      );
      if (!warehouseExists) {
        userErrors.push({
          message: "Warehouse not found",
          code: "NOT_FOUND",
          field: [...fieldPrefix, "warehouseId"],
        });
        continue;
      }

      const existingStock = await this.repository.stock.findByVariantWarehouse(
        item.variantId,
        item.warehouseId,
      );
      if (existingStock) {
        userErrors.push({
          message: "Warehouse stock already exists",
          code: "ALREADY_EXISTS",
          field: fieldPrefix,
        });
        continue;
      }

      validItems.push(item);
    }

    if (userErrors.length > 0) {
      return { warehouseStocks: [], userErrors };
    }

    const warehouseStocks: WarehouseStock[] = [];

    for (const [index, item] of validItems.entries()) {
      const applyResult = await this.repository.stock.applyStockChange({
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        deltaOnHand: 0,
        deltaUnavailable: 0,
        movementType: "SEED",
        reason: null,
        sourceSystem: "INVENTORY_ADMIN",
        sourceEventId: randomUUID(),
        createdBy: this.context.hasUser ? this.context.user.id : null,
      });

      if (applyResult.status === "REJECTED") {
        throw new WarehouseStockCreateRollbackError([
          {
            message: "Warehouse stock create rejected",
            code: "STOCK_REJECTED",
            field: ["items", String(index)],
          },
        ]);
      }

      const createdStock = await this.repository.stock.findByVariantWarehouse(
        item.variantId,
        item.warehouseId,
      );

      if (!createdStock) {
        throw new WarehouseStockCreateRollbackError([
          {
            message: "Warehouse stock was not created",
            code: "NOT_CREATED",
            field: ["items", String(index)],
          },
        ]);
      }

      warehouseStocks.push(createdStock);
    }

    return { warehouseStocks, userErrors };
  }

  protected handleError(error: unknown): WarehouseStockCreateResult {
    if (error instanceof WarehouseStockCreateRollbackError) {
      return {
        warehouseStocks: [],
        userErrors: error.userErrors,
      };
    }

    return {
      warehouseStocks: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
