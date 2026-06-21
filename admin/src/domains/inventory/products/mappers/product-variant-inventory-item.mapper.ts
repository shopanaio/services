import type {
  ApiInventoryItemUpdateInput,
  ApiVariant,
  CurrencyCode,
} from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

export interface PrepareChangedVariantInventoryItemInputsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  warehouseId: string;
  defaultCurrency?: CurrencyCode | null;
}

type InventoryItemUpdateBranch = keyof Omit<ApiInventoryItemUpdateInput, "id">;

function normalizeSku(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInteger(
  value: unknown,
  label: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: unknown, label: string): number {
  const parsed = parseOptionalInteger(value, label);

  if (parsed === null) {
    throw new Error(`${label} is required.`);
  }

  if (parsed < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return parsed;
}

function parsePositiveInteger(value: unknown, label: string): number {
  const parsed = parseOptionalInteger(value, label);

  if (parsed === null) {
    throw new Error(`${label} is required.`);
  }

  if (parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return parsed;
}

function getOrCreateInput(
  inputsByInventoryItemId: Map<string, ApiInventoryItemUpdateInput>,
  inventoryItemId: string,
): ApiInventoryItemUpdateInput {
  const existing = inputsByInventoryItemId.get(inventoryItemId);

  if (existing) {
    return existing;
  }

  const input: ApiInventoryItemUpdateInput = {
    id: inventoryItemId,
  };

  inputsByInventoryItemId.set(inventoryItemId, input);

  return input;
}

function hasBranch(
  input: ApiInventoryItemUpdateInput,
  branch: InventoryItemUpdateBranch,
): boolean {
  return input[branch] !== undefined;
}

export function prepareChangedVariantInventoryItemInputs({
  rows,
  variants,
  warehouseId,
  defaultCurrency,
}: PrepareChangedVariantInventoryItemInputsParams): ApiInventoryItemUpdateInput[] {
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );
  const inputsByInventoryItemId = new Map<string, ApiInventoryItemUpdateInput>();

  for (const row of rows) {
    const variant = variantsById.get(row.id);

    if (!variant) {
      continue;
    }

    const inventoryItem = variant.inventoryItem ?? null;

    if (!inventoryItem) {
      throw new Error(
        `Inventory item is missing for variant ${variant.title ?? variant.handle}.`,
      );
    }

    const stock = inventoryItem.stock.find(
      (candidate) => candidate.warehouseId === warehouseId,
    );
    const input = getOrCreateInput(
      inputsByInventoryItemId,
      inventoryItem.id,
    );

    const sku = normalizeSku(row.sku);
    const originalSku = normalizeSku(inventoryItem.sku ?? null);

    if (sku !== originalSku) {
      input.sku = sku;
    }

    const onHand = parseNonNegativeInteger(row.onHand, "On hand quantity");
    const unavailable = parseNonNegativeInteger(
      row.unavailable,
      "Unavailable quantity",
    );
    const reserved = parseNonNegativeInteger(
      row.reserved,
      "Reserved quantity",
    );
    const available = onHand - unavailable - reserved;
    const originalOnHand = stock?.quantityOnHand ?? 0;
    const originalUnavailable = stock?.unavailableQuantity ?? 0;

    if (available < 0) {
      throw new Error("This change would result in negative availability.");
    }

    if (onHand !== originalOnHand || unavailable !== originalUnavailable) {
      input.stock = {
        warehouseId,
        onHand,
        unavailable,
      };
    }

    const costPrice = parseOptionalInteger(row.costPrice, "Cost");
    const originalCostPrice = inventoryItem.unitCost?.amountMinor ?? null;

    if (costPrice !== originalCostPrice) {
      if (costPrice === null && originalCostPrice !== null) {
        throw new Error("Clearing existing unit cost is not supported.");
      }

      if (costPrice !== null) {
        if (costPrice < 0) {
          throw new Error("Cost cannot be negative.");
        }

        if (!defaultCurrency) {
          throw new Error("Store default currency is required to save unit cost.");
        }

        input.unitCost = {
          currency: defaultCurrency,
          amountMinor: costPrice,
        };
      }
    }

    const weight = parseOptionalInteger(row.weight, "Weight");
    const originalWeight = inventoryItem.weight?.weightGrams ?? null;

    if (weight !== originalWeight) {
      if (weight === null && originalWeight !== null) {
        throw new Error("Clearing existing weight is not supported.");
      }

      if (weight !== null) {
        input.weight = {
          weightGrams: parsePositiveInteger(weight, "Weight"),
        };
      }
    }

    const originalLength = inventoryItem.dimensions?.lengthMm ?? null;
    const originalWidth = inventoryItem.dimensions?.widthMm ?? null;
    const originalHeight = inventoryItem.dimensions?.heightMm ?? null;
    const length = parseOptionalInteger(row.length, "Length");
    const width = parseOptionalInteger(row.width, "Width");
    const height = parseOptionalInteger(row.height, "Height");
    const dimensionsChanged =
      length !== originalLength ||
      width !== originalWidth ||
      height !== originalHeight;

    if (dimensionsChanged) {
      if (
        (length === null && originalLength !== null) ||
        (width === null && originalWidth !== null) ||
        (height === null && originalHeight !== null)
      ) {
        throw new Error("Clearing existing dimensions is not supported.");
      }

      if (length === null || width === null || height === null) {
        throw new Error("Length, width, and height are required to save dimensions.");
      }

      input.dimensions = {
        lengthMm: parsePositiveInteger(length, "Length"),
        widthMm: parsePositiveInteger(width, "Width"),
        heightMm: parsePositiveInteger(height, "Height"),
      };
    }

    if (
      !hasBranch(input, "sku") &&
      !hasBranch(input, "stock") &&
      !hasBranch(input, "unitCost") &&
      !hasBranch(input, "weight") &&
      !hasBranch(input, "dimensions")
    ) {
      inputsByInventoryItemId.delete(inventoryItem.id);
    }
  }

  return Array.from(inputsByInventoryItemId.values());
}
