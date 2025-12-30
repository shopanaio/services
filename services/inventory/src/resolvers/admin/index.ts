// Base type
export { InventoryType, Cache } from "./InventoryType.js";

// Root resolvers
export { QueryResolver, InventoryQueryResolver } from "./QueryResolver.js";
export { MutationResolver, InventoryMutationResolver } from "./MutationResolver.js";

// Query namespace resolvers
export { ProductQueryResolver } from "./ProductQueryResolver.js";
export { VariantQueryResolver } from "./VariantQueryResolver.js";
export { WarehouseQueryResolver } from "./WarehouseQueryResolver.js";

// Mutation namespace resolvers
export { ProductMutationResolver } from "./ProductMutationResolver.js";
export { VariantMutationResolver } from "./VariantMutationResolver.js";
export { WarehouseMutationResolver } from "./WarehouseMutationResolver.js";
export { OptionMutationResolver } from "./OptionMutationResolver.js";
export { FeatureMutationResolver } from "./FeatureMutationResolver.js";

// Type resolvers
export { ProductResolver } from "./ProductResolver.js";
export { VariantResolver } from "./VariantResolver.js";
export { WarehouseResolver } from "./WarehouseResolver.js";
export { OptionResolver } from "./OptionResolver.js";
export { FeatureResolver } from "./FeatureResolver.js";
export { StockResolver } from "./StockResolver.js";
export { OptionValueResolver } from "./OptionValueResolver.js";
export { FeatureValueResolver } from "./FeatureValueResolver.js";
export { VariantPriceResolver } from "./VariantPriceResolver.js";

// Connection resolvers
export {
  ProductConnectionResolver,
  type ProductConnectionInput,
} from "./ProductConnectionResolver.js";
export {
  VariantConnectionResolver,
  type VariantConnectionInput,
} from "./VariantConnectionResolver.js";
export {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
export { StockConnectionResolver } from "./StockConnectionResolver.js";

// Interfaces
export * from "./interfaces/index.js";
