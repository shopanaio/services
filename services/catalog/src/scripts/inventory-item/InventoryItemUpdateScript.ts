import { randomUUID } from "crypto";
import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { InventoryItem } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  singleError,
  successResult,
  unchangedResult,
} from "../types/ScriptResult.js";

type Currency = "UAH" | "USD" | "EUR";

interface StockUpdateParams {
  readonly warehouseId: string;
  readonly onHand: number;
  readonly unavailable?: number | null;
}

interface DimensionsUpdateParams {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly lengthMm: number;
}

interface WeightUpdateParams {
  readonly weightGrams: number;
}

interface UnitCostUpdateParams {
  readonly currency: string;
  readonly amountMinor: number | string;
}

export interface InventoryItemUpdateParams {
  /** Raw InventoryItem UUID. Preferred for GraphQL inventoryItemUpdate. */
  readonly inventoryItemId?: string;
  /** Raw Variant UUID. Kept for broker/script compatibility. */
  readonly variantId?: string;
  /** Stock update branch. */
  readonly stock?: StockUpdateParams | null;
  /** Legacy stock fields used by broker actions. */
  readonly warehouseId?: string;
  readonly onHand?: number;
  readonly unavailable?: number | null;
  /** Inventory item fields. */
  readonly sku?: string | null;
  readonly trackInventory?: boolean | null;
  readonly continueSellingWhenOutOfStock?: boolean | null;
  /** Physical fields. */
  readonly dimensions?: DimensionsUpdateParams | null;
  readonly weight?: WeightUpdateParams | number | null;
  /** Cost update branch. */
  readonly unitCost?: UnitCostUpdateParams | null;
  /** Legacy cost fields used by broker actions. */
  readonly unitCostMinor?: number | null;
  readonly costCurrency?: string | null;
}

export interface InventoryItemUpdateChanges {
  warehouseId?: string;
  onHand?: number;
  unavailable?: number;
  sku?: string | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
  dimensions?: DimensionsUpdateParams;
  weight?: number;
  unitCostMinor?: number;
  costCurrency?: Currency;
}

export type InventoryItemUpdateResult = ScriptResult<
  InventoryItem,
  InventoryItemUpdateChanges
>;

class InventoryItemUpdateRollbackError extends Error {
  constructor(readonly userErrors: UserError[]) {
    super(userErrors[0]?.message ?? "Inventory item update failed");
  }
}

const SUPPORTED_CURRENCIES = new Set<Currency>(["UAH", "USD", "EUR"]);

/**
 * Script for updating inventory item data (stock, SKU, physical data, and unit cost).
 */
export class InventoryItemUpdateScript extends BaseScript<
  InventoryItemUpdateParams,
  InventoryItemUpdateResult
> {
  @Transactional()
  protected async execute(
    params: InventoryItemUpdateParams,
  ): Promise<InventoryItemUpdateResult> {
    const existingItem = await this.loadInventoryItem(params);
    if (!existingItem) {
      return singleError("Inventory item not found", "NOT_FOUND", [
        params.inventoryItemId ? "id" : "variantId",
      ]);
    }

    if (params.variantId && params.variantId !== existingItem.variantId) {
      return singleError(
        "Inventory item does not belong to the provided variant",
        "INVALID_VARIANT",
        ["variantId"],
      );
    }

    const stockInput = this.getStockInput(params);
    if (stockInput instanceof InventoryItemUpdateRollbackError) {
      return {
        result: null,
        changes: null,
        userErrors: stockInput.userErrors,
      };
    }

    const weightGrams = this.getWeightGrams(params);
    const unitCostInput = this.getUnitCostInput(params);

    const validationError = await this.validateInput(
      existingItem,
      stockInput,
      weightGrams,
      unitCostInput,
      params,
    );
    if (validationError) {
      return validationError;
    }

    const variantId = existingItem.variantId;
    const itemUpdateData: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    } = {};
    const changes: InventoryItemUpdateChanges = {};

    const skuChanged =
      params.sku !== undefined && params.sku !== existingItem.sku;
    if (skuChanged) {
      itemUpdateData.sku = params.sku ?? null;
      changes.sku = params.sku ?? null;
    }

    const trackInventoryChanged =
      params.trackInventory != null &&
      params.trackInventory !== existingItem.trackInventory;
    if (trackInventoryChanged) {
      itemUpdateData.trackInventory = params.trackInventory;
      changes.trackInventory = params.trackInventory;
    }

    const continueSellingChanged =
      params.continueSellingWhenOutOfStock != null &&
      params.continueSellingWhenOutOfStock !==
        existingItem.continueSellingWhenOutOfStock;
    if (continueSellingChanged) {
      itemUpdateData.continueSellingWhenOutOfStock =
        params.continueSellingWhenOutOfStock;
      changes.continueSellingWhenOutOfStock =
        params.continueSellingWhenOutOfStock;
    }

    const existingStock = stockInput
      ? await this.repository.stock.findByVariantWarehouse(
          variantId,
          stockInput.warehouseId,
        )
      : null;
    const currentOnHand = existingStock?.quantityOnHand ?? 0;
    const currentUnavailable = existingStock?.unavailableQty ?? 0;
    const nextUnavailable = stockInput?.unavailable ?? 0;
    const deltaOnHand = stockInput ? stockInput.onHand - currentOnHand : 0;
    const deltaUnavailable = stockInput
      ? nextUnavailable - currentUnavailable
      : 0;
    const stockChanged =
      stockInput !== undefined &&
      (deltaOnHand !== 0 || deltaUnavailable !== 0 || !existingStock);

    if (stockInput && stockChanged) {
      changes.warehouseId = stockInput.warehouseId;
      changes.onHand = stockInput.onHand;
      changes.unavailable = nextUnavailable;
    }

    const currentDimensions = params.dimensions
      ? (
          await this.repository.physical.getDimensionsByVariantIds([variantId])
        )[0]
      : null;
    const dimensionsChanged =
      params.dimensions !== undefined &&
      params.dimensions !== null &&
      (params.dimensions.widthMm !== (currentDimensions?.wMm ?? 0) ||
        params.dimensions.heightMm !== (currentDimensions?.hMm ?? 0) ||
        params.dimensions.lengthMm !== (currentDimensions?.lMm ?? 0));
    if (dimensionsChanged && params.dimensions) {
      changes.dimensions = params.dimensions;
    }

    const currentWeights =
      weightGrams !== undefined
        ? await this.repository.physical.getWeightsByVariantIds([variantId])
        : [];
    const currentWeight = currentWeights[0]?.weightGr ?? null;
    const weightChanged =
      weightGrams !== undefined && weightGrams !== currentWeight;
    if (weightChanged && weightGrams !== undefined) {
      changes.weight = weightGrams;
    }

    const currentCost = unitCostInput
      ? await this.repository.cost.getCurrentCost({
          variantId,
          currency: unitCostInput.currency,
        })
      : null;
    const costChanged =
      unitCostInput !== undefined &&
      (!currentCost || currentCost.unitCostMinor !== unitCostInput.amountMinor);
    if (costChanged && unitCostInput) {
      changes.unitCostMinor = unitCostInput.amountMinor;
      changes.costCurrency = unitCostInput.currency;
    }

    const hasItemUpdates = Object.keys(itemUpdateData).length > 0;
    const hasChanges =
      hasItemUpdates ||
      stockChanged ||
      dimensionsChanged ||
      weightChanged ||
      costChanged;

    if (!hasChanges) {
      this.logger.debug(
        { inventoryItemId: existingItem.id, variantId },
        "No inventory item changes detected",
      );
      return unchangedResult(existingItem);
    }

    if (stockInput && stockChanged) {
      const movementType = !existingStock ? "SEED" : "ADJUST";
      const applyResult = await this.repository.stock.applyStockChange({
        variantId,
        warehouseId: stockInput.warehouseId,
        deltaOnHand,
        deltaUnavailable,
        movementType,
        reason: movementType === "ADJUST" ? "MANUAL" : null,
        sourceSystem: "INVENTORY_ADMIN",
        sourceEventId: randomUUID(),
        createdBy: this.context.hasUser ? this.context.user.id : null,
      });

      if (applyResult.status === "REJECTED") {
        throw new InventoryItemUpdateRollbackError([
          {
            message: "Stock update rejected",
            code: "STOCK_REJECTED",
            field: ["stock", "onHand"],
          },
        ]);
      }
    }

    if (hasItemUpdates) {
      await this.repository.inventoryItem.update(existingItem.id, itemUpdateData);
    }

    if (dimensionsChanged && params.dimensions) {
      await this.repository.physical.upsertDimensions(variantId, {
        wMm: params.dimensions.widthMm,
        hMm: params.dimensions.heightMm,
        lMm: params.dimensions.lengthMm,
      });
    }

    if (weightChanged && weightGrams !== undefined) {
      await this.repository.physical.upsertWeight(variantId, {
        weightGr: weightGrams,
      });
    }

    if (costChanged && unitCostInput) {
      await this.repository.cost.setCost(variantId, {
        currency: unitCostInput.currency,
        unitCostMinor: unitCostInput.amountMinor,
      });
    }

    const updatedItem =
      (await this.repository.inventoryItem.findById(existingItem.id)) ??
      existingItem;

    this.logger.info(
      { inventoryItemId: updatedItem.id, variantId, changes },
      "Inventory item updated successfully",
    );

    return successResult(updatedItem, changes);
  }

  private async loadInventoryItem(
    params: InventoryItemUpdateParams,
  ): Promise<InventoryItem | null> {
    if (params.inventoryItemId) {
      return this.repository.inventoryItem.findById(params.inventoryItemId);
    }

    if (params.variantId) {
      return this.repository.inventoryItem.findByVariantId(params.variantId);
    }

    return null;
  }

  private getStockInput(
    params: InventoryItemUpdateParams,
  ): StockUpdateParams | undefined | InventoryItemUpdateRollbackError {
    if (params.stock) {
      return {
        warehouseId: params.stock.warehouseId,
        onHand: params.stock.onHand,
        unavailable: params.stock.unavailable,
      };
    }

    const hasLegacyStockInput =
      params.warehouseId !== undefined ||
      params.onHand !== undefined ||
      params.unavailable !== undefined;

    if (!hasLegacyStockInput) {
      return undefined;
    }

    if (!params.warehouseId || params.onHand === undefined) {
      return new InventoryItemUpdateRollbackError([
        {
          message: "Warehouse and on-hand quantity are required for stock update",
          code: "INVALID_STOCK_INPUT",
          field: ["stock"],
        },
      ]);
    }

    return {
      warehouseId: params.warehouseId,
      onHand: params.onHand,
      unavailable: params.unavailable,
    };
  }

  private getWeightGrams(
    params: InventoryItemUpdateParams,
  ): number | undefined {
    if (params.weight == null) {
      return undefined;
    }

    return typeof params.weight === "number"
      ? params.weight
      : params.weight.weightGrams;
  }

  private getUnitCostInput(
    params: InventoryItemUpdateParams,
  ): { currency: Currency; amountMinor: number } | undefined {
    const rawUnitCost =
      params.unitCost ??
      (params.unitCostMinor != null
        ? {
            currency: params.costCurrency,
            amountMinor: params.unitCostMinor,
          }
        : null);

    if (!rawUnitCost) {
      return undefined;
    }

    return {
      currency: rawUnitCost.currency as Currency,
      amountMinor: Number(rawUnitCost.amountMinor),
    };
  }

  private async validateInput(
    item: InventoryItem,
    stockInput: StockUpdateParams | undefined,
    weightGrams: number | undefined,
    unitCostInput: { currency: Currency; amountMinor: number } | undefined,
    params: InventoryItemUpdateParams,
  ): Promise<InventoryItemUpdateResult | null> {
    if (stockInput) {
      if (!Number.isInteger(stockInput.onHand) || stockInput.onHand < 0) {
        return singleError(
          "On-hand quantity must be a non-negative integer",
          "INVALID_QUANTITY",
          ["stock", "onHand"],
        );
      }

      const unavailable = stockInput.unavailable ?? 0;
      if (!Number.isInteger(unavailable) || unavailable < 0) {
        return singleError(
          "Unavailable quantity must be a non-negative integer",
          "INVALID_QUANTITY",
          ["stock", "unavailable"],
        );
      }

      const warehouseExists = await this.repository.warehouse.exists(
        stockInput.warehouseId,
      );
      if (!warehouseExists) {
        return singleError("Warehouse not found", "NOT_FOUND", [
          "stock",
          "warehouseId",
        ]);
      }

      const existingStock =
        await this.repository.stock.findByVariantWarehouse(
          item.variantId,
          stockInput.warehouseId,
        );
      const reservedQuantity = existingStock?.reservedQty ?? 0;
      if (stockInput.onHand - reservedQuantity - unavailable < 0) {
        return singleError(
          "Available quantity cannot be negative",
          "INVALID_QUANTITY",
          ["stock", "onHand"],
        );
      }
    }

    if (params.sku !== undefined && params.sku !== null && params.sku !== "") {
      const itemWithSku = await this.repository.inventoryItem.findBySku(
        params.sku,
      );
      if (itemWithSku && itemWithSku.id !== item.id) {
        return singleError(
          `SKU "${params.sku}" is already in use`,
          "SKU_ALREADY_EXISTS",
          ["sku"],
        );
      }
    }

    if (params.dimensions) {
      if (
        !Number.isInteger(params.dimensions.widthMm) ||
        params.dimensions.widthMm <= 0
      ) {
        return singleError("Width must be a positive integer", "INVALID_DIMENSION", [
          "dimensions",
          "widthMm",
        ]);
      }

      if (
        !Number.isInteger(params.dimensions.heightMm) ||
        params.dimensions.heightMm <= 0
      ) {
        return singleError(
          "Height must be a positive integer",
          "INVALID_DIMENSION",
          ["dimensions", "heightMm"],
        );
      }

      if (
        !Number.isInteger(params.dimensions.lengthMm) ||
        params.dimensions.lengthMm <= 0
      ) {
        return singleError(
          "Length must be a positive integer",
          "INVALID_DIMENSION",
          ["dimensions", "lengthMm"],
        );
      }
    }

    if (weightGrams !== undefined) {
      if (!Number.isInteger(weightGrams) || weightGrams <= 0) {
        return singleError("Weight must be a positive integer", "INVALID_WEIGHT", [
          "weight",
          "weightGrams",
        ]);
      }
    }

    if (unitCostInput) {
      if (!SUPPORTED_CURRENCIES.has(unitCostInput.currency)) {
        return singleError("Unsupported currency", "INVALID_CURRENCY", [
          "unitCost",
          "currency",
        ]);
      }

      if (
        !Number.isInteger(unitCostInput.amountMinor) ||
        unitCostInput.amountMinor < 0
      ) {
        return singleError(
          "Unit cost must be a non-negative integer",
          "INVALID_COST",
          ["unitCost", "amountMinor"],
        );
      }
    }

    return null;
  }

  protected handleError(error: unknown): InventoryItemUpdateResult {
    if (error instanceof InventoryItemUpdateRollbackError) {
      return {
        result: null,
        changes: null,
        userErrors: error.userErrors,
      };
    }

    const msg = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && "cause" in error ? String(error.cause) : "";
    const stack = error instanceof Error ? error.stack : "";
    this.logger.error(
      { error, msg, cause, stack },
      "InventoryItemUpdateScript failed",
    );
    return {
      result: null,
      changes: null,
      userErrors: [
        {
          message: `Internal error: ${msg} | cause: ${cause}`,
          code: "INTERNAL_ERROR",
        },
      ],
    };
  }
}
