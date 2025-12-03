import type { GraphQLResolveInfo } from "graphql";
import type { GraphQLContext } from "../server.js";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;

export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: Date; output: Date };
  Email: { input: string; output: string };
  BigInt: { input: bigint; output: bigint };
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> };
};

// Enums
export enum OptionDisplayType {
  DROPDOWN = "DROPDOWN",
  SWATCH = "SWATCH",
  BUTTONS = "BUTTONS",
}

export enum SwatchType {
  COLOR = "COLOR",
  GRADIENT = "GRADIENT",
  IMAGE = "IMAGE",
}

export enum CurrencyCode {
  UAH = "UAH",
  USD = "USD",
  EUR = "EUR",
}

// Input types
export type DescriptionInput = {
  text: string;
  html: string;
  json: Record<string, unknown>;
};

export type ProductCreateInput = {
  title: string;
  description?: InputMaybe<DescriptionInput>;
  excerpt?: InputMaybe<string>;
  seoTitle?: InputMaybe<string>;
  seoDescription?: InputMaybe<string>;
  variants?: InputMaybe<VariantInput[]>;
  options?: InputMaybe<ProductOptionCreateInput[]>;
  publish?: InputMaybe<boolean>;
};

export type ProductUpdateInput = {
  id: string;
  title?: InputMaybe<string>;
  description?: InputMaybe<DescriptionInput>;
  excerpt?: InputMaybe<string>;
  seoTitle?: InputMaybe<string>;
  seoDescription?: InputMaybe<string>;
};

export type ProductDeleteInput = {
  id: string;
  permanent?: InputMaybe<boolean>;
};

export type ProductPublishInput = {
  id: string;
};

export type ProductUnpublishInput = {
  id: string;
};

export type VariantInput = {
  title?: InputMaybe<string>;
  sku?: InputMaybe<string>;
  externalSystem?: InputMaybe<string>;
  externalId?: InputMaybe<string>;
  options?: InputMaybe<SelectedOptionInput[]>;
  dimensions?: InputMaybe<DimensionsInput>;
  weight?: InputMaybe<WeightInput>;
};

export type VariantCreateInput = {
  productId: string;
  variant: VariantInput;
};

export type VariantDeleteInput = {
  id: string;
  permanent?: InputMaybe<boolean>;
};

export type VariantSetSkuInput = {
  variantId: string;
  sku: string;
};

export type VariantSetDimensionsInput = {
  variantId: string;
  dimensions: DimensionsInput;
};

export type VariantSetWeightInput = {
  variantId: string;
  weight: WeightInput;
};

export type VariantSetPricingInput = {
  variantId: string;
  currency: CurrencyCode;
  amountMinor: bigint;
  compareAtMinor?: InputMaybe<bigint>;
};

export type VariantSetCostInput = {
  variantId: string;
  currency: CurrencyCode;
  unitCostMinor: bigint;
};

export type VariantSetStockInput = {
  variantId: string;
  warehouseId: string;
  quantity: number;
};

export type VariantSetMediaInput = {
  variantId: string;
  fileIds: string[];
};

export type DimensionsInput = {
  width: number;
  length: number;
  height: number;
};

export type WeightInput = {
  value: number;
};

export type SelectedOptionInput = {
  optionId: string;
  optionValueId: string;
};

export type ProductOptionSwatchInput = {
  swatchType: SwatchType;
  colorOne?: InputMaybe<string>;
  colorTwo?: InputMaybe<string>;
  fileId?: InputMaybe<string>;
  metadata?: InputMaybe<Record<string, unknown>>;
};

export type ProductOptionValueCreateInput = {
  slug: string;
  name: string;
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

export type ProductOptionCreateInput = {
  productId?: InputMaybe<string>;
  slug: string;
  name: string;
  displayType: OptionDisplayType;
  values: ProductOptionValueCreateInput[];
};

export type ProductOptionValueUpdateInput = {
  id: string;
  slug?: InputMaybe<string>;
  name?: InputMaybe<string>;
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

export type ProductOptionValuesInput = {
  create?: InputMaybe<ProductOptionValueCreateInput[]>;
  update?: InputMaybe<ProductOptionValueUpdateInput[]>;
  delete?: InputMaybe<string[]>;
};

export type ProductOptionUpdateInput = {
  id: string;
  slug?: InputMaybe<string>;
  name?: InputMaybe<string>;
  displayType?: InputMaybe<OptionDisplayType>;
  values?: InputMaybe<ProductOptionValuesInput>;
};

export type ProductOptionDeleteInput = {
  id: string;
};

export type ProductFeatureValueCreateInput = {
  slug: string;
  name: string;
};

export type ProductFeatureCreateInput = {
  productId: string;
  slug: string;
  name: string;
  values: ProductFeatureValueCreateInput[];
};

export type ProductFeatureValueUpdateInput = {
  id: string;
  slug?: InputMaybe<string>;
  name?: InputMaybe<string>;
};

export type ProductFeatureValuesInput = {
  create?: InputMaybe<ProductFeatureValueCreateInput[]>;
  update?: InputMaybe<ProductFeatureValueUpdateInput[]>;
  delete?: InputMaybe<string[]>;
};

export type ProductFeatureUpdateInput = {
  id: string;
  slug?: InputMaybe<string>;
  name?: InputMaybe<string>;
  values?: InputMaybe<ProductFeatureValuesInput>;
};

export type ProductFeatureDeleteInput = {
  id: string;
};

export type WarehouseCreateInput = {
  code: string;
  name: string;
  isDefault?: InputMaybe<boolean>;
};

export type WarehouseUpdateInput = {
  id: string;
  code?: InputMaybe<string>;
  name?: InputMaybe<string>;
  isDefault?: InputMaybe<boolean>;
};

export type WarehouseDeleteInput = {
  id: string;
};

export type PaginationArgs = {
  first?: InputMaybe<number>;
  after?: InputMaybe<string>;
  last?: InputMaybe<number>;
  before?: InputMaybe<string>;
};

// Resolver fn helper
type ResolverFn<TResult, TParent, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

// Resolvers type
export type Resolvers = {
  Query?: {
    inventoryQuery?: ResolverFn<unknown, unknown, unknown>;
  };

  Mutation?: {
    inventoryMutation?: ResolverFn<unknown, unknown, unknown>;
  };

  InventoryQuery?: {
    node?: ResolverFn<unknown, unknown, { id: string }>;
    nodes?: ResolverFn<unknown[], unknown, { ids: string[] }>;
    product?: ResolverFn<unknown, unknown, { id: string }>;
    products?: ResolverFn<unknown, unknown, PaginationArgs>;
    variant?: ResolverFn<unknown, unknown, { id: string }>;
    variants?: ResolverFn<unknown, unknown, PaginationArgs>;
    warehouse?: ResolverFn<unknown, unknown, { id: string }>;
    warehouses?: ResolverFn<unknown, unknown, PaginationArgs>;
  };

  InventoryMutation?: {
    productCreate?: ResolverFn<unknown, unknown, { input: ProductCreateInput }>;
    productUpdate?: ResolverFn<unknown, unknown, { input: ProductUpdateInput }>;
    productDelete?: ResolverFn<unknown, unknown, { input: ProductDeleteInput }>;
    productPublish?: ResolverFn<
      unknown,
      unknown,
      { input: ProductPublishInput }
    >;
    productUnpublish?: ResolverFn<
      unknown,
      unknown,
      { input: ProductUnpublishInput }
    >;
    variantCreate?: ResolverFn<unknown, unknown, { input: VariantCreateInput }>;
    variantDelete?: ResolverFn<unknown, unknown, { input: VariantDeleteInput }>;
    variantSetSku?: ResolverFn<unknown, unknown, { input: VariantSetSkuInput }>;
    variantSetDimensions?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetDimensionsInput }
    >;
    variantSetWeight?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetWeightInput }
    >;
    variantSetPricing?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetPricingInput }
    >;
    variantSetCost?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetCostInput }
    >;
    productOptionCreate?: ResolverFn<
      unknown,
      unknown,
      { input: ProductOptionCreateInput }
    >;
    productOptionUpdate?: ResolverFn<
      unknown,
      unknown,
      { input: ProductOptionUpdateInput }
    >;
    productOptionDelete?: ResolverFn<
      unknown,
      unknown,
      { input: ProductOptionDeleteInput }
    >;
    productFeatureCreate?: ResolverFn<
      unknown,
      unknown,
      { input: ProductFeatureCreateInput }
    >;
    productFeatureUpdate?: ResolverFn<
      unknown,
      unknown,
      { input: ProductFeatureUpdateInput }
    >;
    productFeatureDelete?: ResolverFn<
      unknown,
      unknown,
      { input: ProductFeatureDeleteInput }
    >;
    warehouseCreate?: ResolverFn<
      unknown,
      unknown,
      { input: WarehouseCreateInput }
    >;
    warehouseUpdate?: ResolverFn<
      unknown,
      unknown,
      { input: WarehouseUpdateInput }
    >;
    warehouseDelete?: ResolverFn<
      unknown,
      unknown,
      { input: WarehouseDeleteInput }
    >;
    variantSetStock?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetStockInput }
    >;
    variantSetMedia?: ResolverFn<
      unknown,
      unknown,
      { input: VariantSetMediaInput }
    >;
  };

  Product?: {
    __resolveReference?: ResolverFn<unknown, { id: string }, unknown>;
    variants?: ResolverFn<unknown, unknown, PaginationArgs>;
    options?: ResolverFn<unknown[], unknown, unknown>;
    features?: ResolverFn<unknown[], unknown, unknown>;
    variantsCount?: ResolverFn<number, unknown, unknown>;
  };

  Variant?: {
    __resolveReference?: ResolverFn<unknown, { id: string }, unknown>;
    product?: ResolverFn<unknown, unknown, unknown>;
    price?: ResolverFn<unknown, unknown, unknown>;
    priceHistory?: ResolverFn<unknown, unknown, PaginationArgs>;
    cost?: ResolverFn<unknown, unknown, unknown>;
    costHistory?: ResolverFn<unknown, unknown, PaginationArgs>;
    selectedOptions?: ResolverFn<unknown[], unknown, unknown>;
    stock?: ResolverFn<unknown[], unknown, unknown>;
    inStock?: ResolverFn<boolean, unknown, unknown>;
    media?: ResolverFn<unknown[], unknown, unknown>;
  };

  ProductOption?: {
    values?: ResolverFn<unknown[], unknown, unknown>;
  };

  ProductOptionValue?: {
    swatch?: ResolverFn<unknown, unknown, unknown>;
  };

  ProductOptionSwatch?: {
    file?: ResolverFn<unknown, unknown, unknown>;
  };

  ProductFeature?: {
    values?: ResolverFn<unknown[], unknown, unknown>;
  };

  Warehouse?: {
    stock?: ResolverFn<unknown, unknown, PaginationArgs>;
    variantsCount?: ResolverFn<number, unknown, unknown>;
  };

  WarehouseStock?: {
    warehouse?: ResolverFn<unknown, unknown, unknown>;
    variant?: ResolverFn<unknown, unknown, unknown>;
  };

  Node?: {
    __resolveType?: (obj: unknown) => string | null;
  };

  UserError?: {
    __resolveType?: (obj: unknown) => string;
  };
};
