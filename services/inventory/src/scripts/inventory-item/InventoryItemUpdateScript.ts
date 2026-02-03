import { randomUUID } from "crypto";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { WarehouseStock } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { InventoryChanges } from "../types/ProductChanges.js";

export interface InventoryItemUpdateParams {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly onHand: number;
  /** Unavailable stock count (reserved, damaged, etc.) */
  readonly unavailable?: number;
  /** SKU code */
  readonly sku?: string | null;
  /** Weight in grams */
  readonly weight?: number | null;
  /** Unit cost in minor units (cents) */
  readonly unitCostMinor?: number | null;
  /** Currency code for unit cost */
  readonly costCurrency?: string | null;
}

export type InventoryItemUpdateResult = ScriptResult<
  WarehouseStock,
  InventoryChanges
>;

/**
 * Script for updating inventory item data (stock, SKU, weight, and unit cost).
 */
export class InventoryItemUpdateScript extends BaseScript<
  InventoryItemUpdateParams,
  InventoryItemUpdateResult
> {
  protected async execute(
    params: InventoryItemUpdateParams
  ): Promise<InventoryItemUpdateResult> {
    const { variantId, warehouseId, onHand, unavailable = 0, sku, weight, unitCostMinor, costCurrency } = params;

    // Validate quantities
    if (onHand < 0) {
      return singleError(
        "On-hand quantity must be a non-negative value",
        "INVALID_QUANTITY",
        ["onHand"]
      );
    }

    if (unavailable < 0) {
      return singleError(
        "Unavailable quantity must be a non-negative value",
        "INVALID_QUANTITY",
        ["unavailable"]
      );
    }

    // Validate weight if provided
    if (weight !== undefined && weight !== null && weight <= 0) {
      return singleError(
        "Weight must be a positive value",
        "INVALID_WEIGHT",
        ["weight"]
      );
    }

    // Validate unitCost - requires currency if provided
    if (unitCostMinor !== undefined && unitCostMinor !== null) {
      if (!costCurrency) {
        return singleError(
          "Currency is required when setting unit cost",
          "MISSING_CURRENCY",
          ["costCurrency"]
        );
      }
      if (unitCostMinor < 0) {
        return singleError(
          "Unit cost must be a non-negative value",
          "INVALID_COST",
          ["unitCostMinor"]
        );
      }
    }

    // Validate inventory item exists
    const existingItem = await this.repository.inventoryItem.findByVariantId(variantId);
    if (!existingItem) {
      return singleError("Inventory item not found", "NOT_FOUND", ["variantId"]);
    }

    // Validate warehouse exists
    const warehouseExists =
      await this.repository.warehouse.exists(warehouseId);
    if (!warehouseExists) {
      return singleError("Warehouse not found", "NOT_FOUND", ["warehouseId"]);
    }

    // Check SKU uniqueness if provided
    if (sku !== undefined && sku !== null && sku !== "") {
      const itemWithSku = await this.repository.inventoryItem.findBySku(sku);
      if (itemWithSku && itemWithSku.id !== existingItem.id) {
        return singleError(`SKU "${sku}" is already in use`, "SKU_ALREADY_EXISTS", [
          "sku",
        ]);
      }
    }

    // Get existing stock to compare
    const existingStock = await this.repository.stock.findByVariantWarehouse(
      variantId,
      warehouseId
    );

    const currentOnHand = existingStock?.quantityOnHand ?? 0;
    const currentUnavailable = existingStock?.unavailableQty ?? 0;
    const currentSku = existingItem.sku;

    // Get current weight to compare
    const currentWeights = await this.repository.physical.getWeightsByVariantIds([variantId]);
    const currentWeight = currentWeights[0]?.weightGr ?? null;

    // Get current cost to compare (if currency provided)
    let currentCost: { unitCostMinor: number } | null = null;
    if (costCurrency) {
      currentCost = await this.repository.cost.getCurrentCost({
        variantId,
        currency: costCurrency as "UAH" | "USD" | "EUR",
      });
    }

    // Calculate what changed
    const deltaOnHand = onHand - currentOnHand;
    const deltaUnavailable = unavailable - currentUnavailable;
    const stockChanged = deltaOnHand !== 0 || deltaUnavailable !== 0;
    const skuChanged = sku !== undefined && sku !== currentSku;
    const weightChanged = weight !== undefined && weight !== currentWeight;
    const costChanged = unitCostMinor !== undefined &&
      (!currentCost || currentCost.unitCostMinor !== unitCostMinor);

    // If nothing changed, return early
    if (!stockChanged && !skuChanged && !weightChanged && !costChanged && existingStock) {
      this.logger.debug(
        { variantId, warehouseId },
        "No inventory changes detected"
      );
      return unchangedResult(existingStock);
    }

    // Update stock if changed
    let stock: WarehouseStock | null = existingStock;
    if (stockChanged || !existingStock) {
      const movementType = deltaOnHand === 0 && !existingStock ? "SEED" : "ADJUST";

      const applyResult = await this.repository.stock.applyStockChange({
        variantId,
        warehouseId,
        deltaOnHand,
        deltaUnavailable,
        movementType,
        reason: movementType === "ADJUST" ? "MANUAL" : null,
        sourceSystem: "INVENTORY_ADMIN",
        sourceEventId: randomUUID(),
        createdBy: this.context.hasUser ? this.context.user.id : null,
      });

      if (applyResult.status === "REJECTED") {
        return singleError("Stock update rejected", "STOCK_REJECTED", [
          "onHand",
        ]);
      }

      stock = await this.repository.stock.findByVariantWarehouse(
        variantId,
        warehouseId
      );

      if (!stock) {
        return singleError(
          "Stock record not found after update",
          "NOT_FOUND"
        );
      }
    }

    // Update SKU if changed
    if (skuChanged) {
      await this.repository.inventoryItem.update(existingItem.id, { sku: sku ?? null });
    }

    // Update weight if changed
    if (weightChanged && weight !== undefined && weight !== null) {
      await this.repository.physical.upsertWeight(variantId, {
        weightGr: weight,
      });
    }

    // Update cost if changed
    if (costChanged && unitCostMinor !== undefined && unitCostMinor !== null && costCurrency) {
      await this.repository.cost.setCost(variantId, {
        currency: costCurrency as "UAH" | "USD" | "EUR",
        unitCostMinor,
      });
    }

    // Build changes object
    const changes: InventoryChanges = {
      warehouseId,
      onHand,
      unavailable,
    };

    if (sku !== undefined) {
      changes.sku = sku;
    }

    if (weight !== undefined) {
      changes.weight = weight;
    }

    if (unitCostMinor !== undefined) {
      changes.unitCostMinor = unitCostMinor;
      changes.costCurrency = costCurrency;
    }

    this.logger.info(
      { variantId, warehouseId, onHand, unavailable, sku, weight, unitCostMinor, costCurrency },
      "Inventory item updated successfully"
    );

    return successResult(stock!, changes);
  }

  protected handleError(error: unknown): InventoryItemUpdateResult {
    const msg = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && "cause" in error ? String(error.cause) : "";
    const stack = error instanceof Error ? error.stack : "";
    this.logger.error(
      { error, msg, cause, stack },
      "InventoryItemUpdateScript failed"
    );
    return {
      result: null,
      changes: null,
      userErrors: [
        { message: `Internal error: ${msg} | cause: ${cause}`, code: "INTERNAL_ERROR" },
      ],
    };
  }
}
