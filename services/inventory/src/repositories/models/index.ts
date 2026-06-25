// Schema
export * from "./schema";

// InventoryItem (1:1 with Catalog.Variant)
export * from "./inventory-item";
export * from "./inventory-item-list-views";

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
