import type { CoreModalContractMap } from "./contracts";

export const CORE_MODAL_TYPES: Record<keyof CoreModalContractMap, string> = {
  "catalog.product.details": "product",
  "catalog.product.picker": "product-picker",
  "catalog.variant.picker": "variant-picker",
  "media.file.picker": "media-picker",
};
