import type { ApiProductBulkUpdateInput, ApiVariantUpdateInput } from "@/graphql/types";
import type {
  InventorySubmitError,
  ItemEdits,
} from "../hooks/use-inventory-edit-store";
import type { InventoryVariantRow } from "./inventory-variant-row.mapper";

const MAX_PRODUCTS_PER_BULK_UPDATE = 100;
const MAX_VARIANT_OPERATIONS_PER_BULK_UPDATE = 500;

export interface InventoryVariantEditMappingResult {
  input: ApiProductBulkUpdateInput;
  rowErrors: Record<string, InventorySubmitError[]>;
  submitErrors: InventorySubmitError[];
  operationsCount: number;
}

function hasPendingFieldEdits(edits: ItemEdits | undefined): edits is ItemEdits {
  return Boolean(edits && Object.keys(edits).length > 0);
}

function addRowError(
  rowErrors: Record<string, InventorySubmitError[]>,
  rowId: string,
  error: InventorySubmitError,
) {
  rowErrors[rowId] = [...(rowErrors[rowId] ?? []), error];
}

export function mapInventoryVariantEditsToProductBulkUpdateInput(
  rows: InventoryVariantRow[],
  edits: Record<string, ItemEdits>,
  activeWarehouseId: string | null,
): InventoryVariantEditMappingResult {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rowErrors: Record<string, InventorySubmitError[]> = {};
  const submitErrors: InventorySubmitError[] = [];
  const variantsByProduct = new Map<string, ApiVariantUpdateInput[]>();

  for (const [rowId, rowEdits] of Object.entries(edits)) {
    if (!hasPendingFieldEdits(rowEdits)) {
      continue;
    }

    const row = rowsById.get(rowId);

    if (!row) {
      submitErrors.push({
        message: "Edited inventory row is no longer loaded.",
        code: "INVENTORY_ROW_NOT_LOADED",
      });
      continue;
    }

    if (!row.inventoryItemId) {
      addRowError(rowErrors, row.id, {
        message: "Inventory item is missing for this variant.",
        code: "INVENTORY_ITEM_MISSING",
        field: ["products", "operations", "variants"],
      });
      continue;
    }

    const warehouseId = row.warehouseId ?? activeWarehouseId;

    if (!warehouseId) {
      addRowError(rowErrors, row.id, {
        message: "Select a warehouse to edit inventory.",
        code: "WAREHOUSE_SCOPE_REQUIRED",
        field: [
          "products",
          "operations",
          "variants",
          "inventory",
          "warehouseId",
        ],
      });
      continue;
    }

    const nextOnHand = rowEdits.onHand?.currentValue ?? row.onHand;
    const nextUnavailable =
      rowEdits.unavailable?.currentValue ?? row.unavailable;

    const variantInput: ApiVariantUpdateInput = {
      variantId: row.variantId,
      inventory: {
        warehouseId,
        onHand: nextOnHand,
        unavailable: nextUnavailable,
      },
    };

    variantsByProduct.set(row.productId, [
      ...(variantsByProduct.get(row.productId) ?? []),
      variantInput,
    ]);
  }

  const operationsCount = [...variantsByProduct.values()].reduce(
    (count, variants) => count + variants.length,
    0,
  );

  if (variantsByProduct.size > MAX_PRODUCTS_PER_BULK_UPDATE) {
    submitErrors.push({
      message: `Bulk update is limited to ${MAX_PRODUCTS_PER_BULK_UPDATE} products.`,
      code: "PRODUCT_BULK_UPDATE_PRODUCT_LIMIT_EXCEEDED",
      field: ["products"],
    });
  }

  if (operationsCount > MAX_VARIANT_OPERATIONS_PER_BULK_UPDATE) {
    submitErrors.push({
      message: `Bulk update is limited to ${MAX_VARIANT_OPERATIONS_PER_BULK_UPDATE} variant operations.`,
      code: "PRODUCT_BULK_UPDATE_OPERATION_LIMIT_EXCEEDED",
      field: ["products", "operations", "variants"],
    });
  }

  if (
    operationsCount === 0 &&
    submitErrors.length === 0 &&
    Object.keys(rowErrors).length === 0
  ) {
    submitErrors.push({
      message: "There are no editable inventory changes to save.",
      code: "NO_INVENTORY_CHANGES",
    });
  }

  return {
    input: {
      products: [...variantsByProduct.entries()].map(([productId, variants]) => ({
        productId,
        operations: {
          variants,
        },
      })),
    },
    rowErrors,
    submitErrors,
    operationsCount,
  };
}
