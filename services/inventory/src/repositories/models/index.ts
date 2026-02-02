// Schema
export * from "./schema";

// Variants (reference-only for foreign keys)
export * from "./variants";

// InventoryItem (new - 1:1 with Variant)
export * from "./inventory-item";

// Cost
export * from "./cost";

// Physical attributes (dimensions, weight)
export * from "./physical";

// Stock & Warehouses
export * from "./stock";
export * from "./stock-changes";
export * from "./reservations";
export * from "./product-inventory-settings";
export * from "./inbound-supply";

// Translations (i18n) - warehouse translations only
export * from "./translations";
