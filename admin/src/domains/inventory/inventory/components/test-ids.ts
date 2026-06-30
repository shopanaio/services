import type { InventoryVariantRow } from "../mappers";

export function getInventoryVariantRowTestIdSuffix(row: InventoryVariantRow) {
  return `${row.productHandle ?? row.productId}-${row.variantHandle}`;
}

export function getInventoryVariantCellTestId(
  row: InventoryVariantRow,
  field:
    | "product"
    | "product-title"
    | "variant-title"
    | "on-hand"
    | "unavailable"
    | "reserved"
    | "available",
) {
  return `inventory-table-${field}-cell-${getInventoryVariantRowTestIdSuffix(row)}`;
}
