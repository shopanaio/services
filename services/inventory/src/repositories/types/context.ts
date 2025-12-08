import type { BaseContext } from "@shopana/type-executor";
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
} from "../models/index.js";

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
  optionValueTranslation: DataLoader<string, ProductOptionValueTranslation | null>;

  // Features
  productFeatureIds: DataLoader<string, string[]>;
  productFeature: DataLoader<string, ProductFeature | null>;
  featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  featureValueIds: DataLoader<string, string[]>;
  featureValue: DataLoader<string, ProductFeatureValue | null>;
  featureValueTranslation: DataLoader<string, ProductFeatureValueTranslation | null>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;
}

/**
 * Product type context extending BaseContext
 */
export interface ProductTypeContext extends BaseContext {
  loaders: ProductLoaders;
  locale: string;
  currency?: string;
}
