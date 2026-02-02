// Base type
export { InventoryType, Cache } from "./InventoryType.js";

// Root resolvers
export { QueryResolver, InventoryQueryResolver } from "./QueryResolver.js";
export { MutationResolver, InventoryMutationResolver } from "./MutationResolver.js";

// Type resolvers
export { WarehouseResolver } from "./WarehouseResolver.js";
export { StockResolver } from "./StockResolver.js";
export { InventoryItemResolver } from "./InventoryItemResolver.js";

// Widget resolvers
export { WidgetQueryResolver, InventoryWidgetResolver } from "./InventoryWidgetResolver.js";

// Federation resolvers
export { VariantFederationResolver } from "./VariantFederationResolver.js";

// Connection resolvers
export {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
export { StockConnectionResolver } from "./StockConnectionResolver.js";

// Interfaces
export * from "./interfaces/index.js";
