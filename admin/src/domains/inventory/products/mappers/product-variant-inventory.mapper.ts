import type {
  ApiInventoryItemUpdateInput,
  ApiVariant,
  CurrencyCode,
} from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

export interface PrepareChangedVariantInventoryInputsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  warehouseId: string;
  defaultCurrency?: CurrencyCode | null;
}

function normalizeSku(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseQuantity(value: unknown, label: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  if (parsed < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return parsed;
}

export function prepareChangedVariantInventoryInputs({
  rows,
  variants,
  warehouseId,
  defaultCurrency,
}: PrepareChangedVariantInventoryInputsParams): ApiInventoryItemUpdateInput[] {
  void defaultCurrency;

  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );
  const inputs: ApiInventoryItemUpdateInput[] = [];

  for (const row of rows) {
    const variant = variantsById.get(row.id);

    if (!variant) {
      continue;
    }

    const inventoryItem = variant.inventoryItem ?? null;
    const stock = inventoryItem?.stock.find(
      (candidate) => candidate.warehouseId === warehouseId,
    );
    const sku = normalizeSku(row.sku);
    const originalSku = normalizeSku(inventoryItem?.sku ?? null);
    const onHand = parseQuantity(row.onHand, "On hand quantity");
    const unavailable = parseQuantity(row.unavailable, "Unavailable quantity");
    const reserved = parseQuantity(row.reserved, "Reserved quantity");
    const available = onHand - unavailable - reserved;
    const originalOnHand = stock?.quantityOnHand ?? 0;
    const originalUnavailable = stock?.unavailableQuantity ?? 0;
    const skuChanged = sku !== originalSku;
    const stockChanged =
      onHand !== originalOnHand || unavailable !== originalUnavailable;

    if (!skuChanged && !stockChanged) {
      continue;
    }

    if (!inventoryItem) {
      throw new Error(
        `Inventory item is missing for variant ${variant.title ?? variant.handle}.`,
      );
    }

    if (available < 0) {
      throw new Error("This change would result in negative availability.");
    }

    const input: ApiInventoryItemUpdateInput = {
      id: inventoryItem.id,
    };

    if (skuChanged) {
      input.sku = sku;
    }

    if (stockChanged) {
      input.stock = {
        warehouseId,
        onHand,
        unavailable,
      };
    }

    inputs.push(input);
  }

  return inputs;
}
