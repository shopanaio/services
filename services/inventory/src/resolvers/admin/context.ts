import type DataLoader from "dataloader";
import type {
  Product,
  Variant,
  ProductTranslation,
  VariantTranslation,
  ProductOption,
  ProductOptionValue,
  ProductOptionTranslation,
  ProductOptionValueTranslation,
  ProductOptionVariantLink,
  ProductFeature,
  ProductFeatureValue,
  ProductFeatureTranslation,
  ProductFeatureValueTranslation,
  ItemPricing,
  ItemDimensions,
  ItemWeight,
  VariantMedia,
  WarehouseStock,
  Warehouse,
} from "../../repositories/models/index.js";
import type { PaginationArgs } from "./args.js";
import type { WarehouseConnectionResult } from "../../repositories/WarehouseQueryRepository.js";

/**
 * Paginated query functions for cursor-based pagination
 */
export interface ProductQueries {
  /** Get variant IDs for a product with cursor pagination */
  variantIds: (productId: string, args: PaginationArgs) => Promise<string[]>;
  /** Get price IDs for a variant with cursor pagination */
  variantPriceIds: (
    variantId: string,
    args: PaginationArgs
  ) => Promise<string[]>;
  /** Get warehouse connection with relay pagination */
  warehouseConnection: (args: PaginationArgs) => Promise<WarehouseConnectionResult>;
}

/**
 * Product loaders for efficient data fetching
 */
export interface ProductLoaders {
  // Product
  product: DataLoader<string, Product | null>;
  productTranslation: DataLoader<string, ProductTranslation | null>;

  // Variant
  variant: DataLoader<string, Variant | null>;
  variantIds: DataLoader<string, string[]>;
  variantTranslation: DataLoader<string, VariantTranslation | null>;
  variantPricing: DataLoader<string, ItemPricing[]>;
  variantPriceById: DataLoader<string, ItemPricing | null>;
  variantPriceIds: DataLoader<string, string[]>;
  variantDimensions: DataLoader<string, ItemDimensions | null>;
  variantWeight: DataLoader<string, ItemWeight | null>;
  variantMedia: DataLoader<string, VariantMedia[]>;
  variantStock: DataLoader<string, WarehouseStock[]>;
  variantSelectedOptions: DataLoader<string, ProductOptionVariantLink[]>;

  // Options
  productOptionIds: DataLoader<string, string[]>;
  productOption: DataLoader<string, ProductOption | null>;
  optionTranslation: DataLoader<string, ProductOptionTranslation | null>;
  optionValueIds: DataLoader<string, string[]>;
  optionValue: DataLoader<string, ProductOptionValue | null>;
  optionValueTranslation: DataLoader<
    string,
    ProductOptionValueTranslation | null
  >;

  // Features
  productFeatureIds: DataLoader<string, string[]>;
  productFeature: DataLoader<string, ProductFeature | null>;
  featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  featureValueIds: DataLoader<string, string[]>;
  featureValue: DataLoader<string, ProductFeatureValue | null>;
  featureValueTranslation: DataLoader<
    string,
    ProductFeatureValueTranslation | null
  >;

  // Warehouse
  warehouse: DataLoader<string, Warehouse | null>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;
}
