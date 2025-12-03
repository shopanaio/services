import { GraphQLResolveInfo, GraphQLScalarType } from "graphql";
import { GraphQLContext } from "../server.js";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};

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
  text: Scalars["String"]["input"];
  html: Scalars["String"]["input"];
  json: Scalars["JSON"]["input"];
};

export type ProductCreateInput = {
  title: Scalars["String"]["input"];
  description?: InputMaybe<DescriptionInput>;
  excerpt?: InputMaybe<Scalars["String"]["input"]>;
  seoTitle?: InputMaybe<Scalars["String"]["input"]>;
  seoDescription?: InputMaybe<Scalars["String"]["input"]>;
  variants?: InputMaybe<VariantInput[]>;
  options?: InputMaybe<ProductOptionCreateInput[]>;
  publish?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ProductUpdateInput = {
  id: Scalars["ID"]["input"];
  title?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<DescriptionInput>;
  excerpt?: InputMaybe<Scalars["String"]["input"]>;
  seoTitle?: InputMaybe<Scalars["String"]["input"]>;
  seoDescription?: InputMaybe<Scalars["String"]["input"]>;
};

export type ProductDeleteInput = {
  id: Scalars["ID"]["input"];
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ProductPublishInput = {
  id: Scalars["ID"]["input"];
};

export type ProductUnpublishInput = {
  id: Scalars["ID"]["input"];
};

export type VariantInput = {
  title?: InputMaybe<Scalars["String"]["input"]>;
  sku?: InputMaybe<Scalars["String"]["input"]>;
  externalSystem?: InputMaybe<Scalars["String"]["input"]>;
  externalId?: InputMaybe<Scalars["String"]["input"]>;
  options?: InputMaybe<SelectedOptionInput[]>;
  dimensions?: InputMaybe<DimensionsInput>;
  weight?: InputMaybe<WeightInput>;
};

export type VariantCreateInput = {
  productId: Scalars["ID"]["input"];
  variant: VariantInput;
};

export type VariantDeleteInput = {
  id: Scalars["ID"]["input"];
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type VariantSetSkuInput = {
  variantId: Scalars["ID"]["input"];
  sku: Scalars["String"]["input"];
};

export type VariantSetDimensionsInput = {
  variantId: Scalars["ID"]["input"];
  dimensions: DimensionsInput;
};

export type VariantSetWeightInput = {
  variantId: Scalars["ID"]["input"];
  weight: WeightInput;
};

export type VariantSetPricingInput = {
  variantId: Scalars["ID"]["input"];
  currency: CurrencyCode;
  amountMinor: Scalars["BigInt"]["input"];
  compareAtMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
};

export type VariantSetCostInput = {
  variantId: Scalars["ID"]["input"];
  currency: CurrencyCode;
  unitCostMinor: Scalars["BigInt"]["input"];
};

export type VariantSetStockInput = {
  variantId: Scalars["ID"]["input"];
  warehouseId: Scalars["ID"]["input"];
  quantity: Scalars["Int"]["input"];
};

export type VariantSetMediaInput = {
  variantId: Scalars["ID"]["input"];
  fileIds: Scalars["ID"]["input"][];
};

export type DimensionsInput = {
  width: Scalars["Int"]["input"];
  length: Scalars["Int"]["input"];
  height: Scalars["Int"]["input"];
};

export type WeightInput = {
  value: Scalars["Int"]["input"];
};

export type SelectedOptionInput = {
  optionId: Scalars["ID"]["input"];
  optionValueId: Scalars["ID"]["input"];
};

export type ProductOptionSwatchInput = {
  swatchType: SwatchType;
  colorOne?: InputMaybe<Scalars["String"]["input"]>;
  colorTwo?: InputMaybe<Scalars["String"]["input"]>;
  fileId?: InputMaybe<Scalars["ID"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ProductOptionValueCreateInput = {
  slug: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

export type ProductOptionCreateInput = {
  productId?: InputMaybe<Scalars["ID"]["input"]>;
  slug: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  displayType: OptionDisplayType;
  values: ProductOptionValueCreateInput[];
};

export type ProductOptionValueUpdateInput = {
  id: Scalars["ID"]["input"];
  slug?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

export type ProductOptionValuesInput = {
  create?: InputMaybe<ProductOptionValueCreateInput[]>;
  update?: InputMaybe<ProductOptionValueUpdateInput[]>;
  delete?: InputMaybe<Scalars["ID"]["input"][]>;
};

export type ProductOptionUpdateInput = {
  id: Scalars["ID"]["input"];
  slug?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  displayType?: InputMaybe<OptionDisplayType>;
  values?: InputMaybe<ProductOptionValuesInput>;
};

export type ProductOptionDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ProductFeatureValueCreateInput = {
  slug: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
};

export type ProductFeatureCreateInput = {
  productId: Scalars["ID"]["input"];
  slug: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  values: ProductFeatureValueCreateInput[];
};

export type ProductFeatureValueUpdateInput = {
  id: Scalars["ID"]["input"];
  slug?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type ProductFeatureValuesInput = {
  create?: InputMaybe<ProductFeatureValueCreateInput[]>;
  update?: InputMaybe<ProductFeatureValueUpdateInput[]>;
  delete?: InputMaybe<Scalars["ID"]["input"][]>;
};

export type ProductFeatureUpdateInput = {
  id: Scalars["ID"]["input"];
  slug?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  values?: InputMaybe<ProductFeatureValuesInput>;
};

export type ProductFeatureDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type WarehouseCreateInput = {
  code: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type WarehouseUpdateInput = {
  id: Scalars["ID"]["input"];
  code?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type WarehouseDeleteInput = {
  id: Scalars["ID"]["input"];
};

// Pagination args
export type PaginationArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
};

// Model types (simplified - expand as needed)
export type ProductModel = {
  id: string;
  publishedAt?: Date | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  title: string;
  descriptionText?: string | null;
  descriptionHtml?: string | null;
  descriptionJson?: Record<string, unknown> | null;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type VariantModel = {
  id: string;
  productId: string;
  sku?: string | null;
  title?: string | null;
  externalSystem?: string | null;
  externalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  weight?: number | null;
};

export type ProductOptionModel = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  displayType: OptionDisplayType;
};

export type ProductOptionValueModel = {
  id: string;
  optionId: string;
  slug: string;
  name: string;
};

export type ProductOptionSwatchModel = {
  id: string;
  optionValueId: string;
  swatchType: SwatchType;
  colorOne?: string | null;
  colorTwo?: string | null;
  fileId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ProductFeatureModel = {
  id: string;
  productId: string;
  slug: string;
  name: string;
};

export type ProductFeatureValueModel = {
  id: string;
  featureId: string;
  slug: string;
  name: string;
};

export type WarehouseModel = {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WarehouseStockModel = {
  id: string;
  warehouseId: string;
  variantId: string;
  quantityOnHand: number;
  createdAt: Date;
  updatedAt: Date;
};

export type VariantPriceModel = {
  id: string;
  variantId: string;
  currency: CurrencyCode;
  amountMinor: bigint;
  compareAtMinor?: bigint | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  recordedAt: Date;
  isCurrent: boolean;
};

export type VariantCostModel = {
  id: string;
  variantId: string;
  currency: CurrencyCode;
  unitCostMinor: bigint;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  recordedAt: Date;
  isCurrent: boolean;
};

// Generic resolver type helper
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

// Resolver types
export type Resolvers<ContextType = GraphQLContext> = {
  // Scalars
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  JSON?: GraphQLScalarType;

  // Root types
  Query?: {
    inventoryQuery?: ResolverFn<
      Record<string, unknown>,
      Record<string, unknown>,
      ContextType,
      Record<string, unknown>
    >;
  };

  Mutation?: {
    inventoryMutation?: ResolverFn<
      Record<string, unknown>,
      Record<string, unknown>,
      ContextType,
      Record<string, unknown>
    >;
  };

  InventoryQuery?: {
    node?: ResolverFn<unknown, unknown, ContextType, { id: string }>;
    nodes?: ResolverFn<unknown[], unknown, ContextType, { ids: string[] }>;
    product?: ResolverFn<
      ProductModel | null,
      unknown,
      ContextType,
      { id: string }
    >;
    products?: ResolverFn<unknown, unknown, ContextType, PaginationArgs>;
    variant?: ResolverFn<
      VariantModel | null,
      unknown,
      ContextType,
      { id: string }
    >;
    variants?: ResolverFn<unknown, unknown, ContextType, PaginationArgs>;
    warehouse?: ResolverFn<
      WarehouseModel | null,
      unknown,
      ContextType,
      { id: string }
    >;
    warehouses?: ResolverFn<unknown, unknown, ContextType, PaginationArgs>;
  };

  InventoryMutation?: {
    productCreate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductCreateInput }
    >;
    productUpdate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductUpdateInput }
    >;
    productDelete?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductDeleteInput }
    >;
    productPublish?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductPublishInput }
    >;
    productUnpublish?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductUnpublishInput }
    >;
    variantCreate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantCreateInput }
    >;
    variantDelete?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantDeleteInput }
    >;
    variantSetSku?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetSkuInput }
    >;
    variantSetDimensions?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetDimensionsInput }
    >;
    variantSetWeight?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetWeightInput }
    >;
    variantSetPricing?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetPricingInput }
    >;
    variantSetCost?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetCostInput }
    >;
    productOptionCreate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductOptionCreateInput }
    >;
    productOptionUpdate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductOptionUpdateInput }
    >;
    productOptionDelete?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductOptionDeleteInput }
    >;
    productFeatureCreate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductFeatureCreateInput }
    >;
    productFeatureUpdate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductFeatureUpdateInput }
    >;
    productFeatureDelete?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: ProductFeatureDeleteInput }
    >;
    warehouseCreate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: WarehouseCreateInput }
    >;
    warehouseUpdate?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: WarehouseUpdateInput }
    >;
    warehouseDelete?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: WarehouseDeleteInput }
    >;
    variantSetStock?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetStockInput }
    >;
    variantSetMedia?: ResolverFn<
      unknown,
      unknown,
      ContextType,
      { input: VariantSetMediaInput }
    >;
  };

  Product?: {
    __resolveReference?: ResolverFn<
      ProductModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    variants?: ResolverFn<unknown, ProductModel, ContextType, PaginationArgs>;
    options?: ResolverFn<
      ProductOptionModel[],
      ProductModel,
      ContextType,
      Record<string, unknown>
    >;
    features?: ResolverFn<
      ProductFeatureModel[],
      ProductModel,
      ContextType,
      Record<string, unknown>
    >;
    variantsCount?: ResolverFn<
      number,
      ProductModel,
      ContextType,
      Record<string, unknown>
    >;
    description?: ResolverFn<
      unknown,
      ProductModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  Variant?: {
    __resolveReference?: ResolverFn<
      VariantModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    product?: ResolverFn<
      ProductModel,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    price?: ResolverFn<
      VariantPriceModel | null,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    priceHistory?: ResolverFn<
      unknown,
      VariantModel,
      ContextType,
      PaginationArgs
    >;
    cost?: ResolverFn<
      VariantCostModel | null,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    costHistory?: ResolverFn<
      unknown,
      VariantModel,
      ContextType,
      PaginationArgs
    >;
    selectedOptions?: ResolverFn<
      unknown[],
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    dimensions?: ResolverFn<
      unknown,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    weight?: ResolverFn<
      unknown,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    stock?: ResolverFn<
      WarehouseStockModel[],
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    inStock?: ResolverFn<
      boolean,
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
    media?: ResolverFn<
      unknown[],
      VariantModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  ProductOption?: {
    __resolveReference?: ResolverFn<
      ProductOptionModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    values?: ResolverFn<
      ProductOptionValueModel[],
      ProductOptionModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  ProductOptionValue?: {
    __resolveReference?: ResolverFn<
      ProductOptionValueModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    swatch?: ResolverFn<
      ProductOptionSwatchModel | null,
      ProductOptionValueModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  ProductOptionSwatch?: {
    __resolveReference?: ResolverFn<
      ProductOptionSwatchModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    file?: ResolverFn<
      unknown,
      ProductOptionSwatchModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  ProductFeature?: {
    __resolveReference?: ResolverFn<
      ProductFeatureModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    values?: ResolverFn<
      ProductFeatureValueModel[],
      ProductFeatureModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  ProductFeatureValue?: {
    __resolveReference?: ResolverFn<
      ProductFeatureValueModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
  };

  Warehouse?: {
    __resolveReference?: ResolverFn<
      WarehouseModel | null,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
    stock?: ResolverFn<unknown, WarehouseModel, ContextType, PaginationArgs>;
    variantsCount?: ResolverFn<
      number,
      WarehouseModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  WarehouseStock?: {
    warehouse?: ResolverFn<
      WarehouseModel,
      WarehouseStockModel,
      ContextType,
      Record<string, unknown>
    >;
    variant?: ResolverFn<
      VariantModel,
      WarehouseStockModel,
      ContextType,
      Record<string, unknown>
    >;
  };

  VariantPrice?: Record<string, unknown>;
  VariantCost?: Record<string, unknown>;

  // Connection types
  ProductConnection?: Record<string, unknown>;
  ProductEdge?: Record<string, unknown>;
  VariantConnection?: Record<string, unknown>;
  VariantEdge?: Record<string, unknown>;
  WarehouseConnection?: Record<string, unknown>;
  WarehouseEdge?: Record<string, unknown>;
  WarehouseStockConnection?: Record<string, unknown>;
  WarehouseStockEdge?: Record<string, unknown>;
  VariantPriceConnection?: Record<string, unknown>;
  VariantPriceEdge?: Record<string, unknown>;
  VariantCostConnection?: Record<string, unknown>;
  VariantCostEdge?: Record<string, unknown>;

  // Payload types
  ProductCreatePayload?: Record<string, unknown>;
  ProductUpdatePayload?: Record<string, unknown>;
  ProductDeletePayload?: Record<string, unknown>;
  ProductPublishPayload?: Record<string, unknown>;
  ProductUnpublishPayload?: Record<string, unknown>;
  VariantCreatePayload?: Record<string, unknown>;
  VariantDeletePayload?: Record<string, unknown>;
  VariantSetSkuPayload?: Record<string, unknown>;
  VariantSetDimensionsPayload?: Record<string, unknown>;
  VariantSetWeightPayload?: Record<string, unknown>;
  VariantSetPricingPayload?: Record<string, unknown>;
  VariantSetCostPayload?: Record<string, unknown>;
  ProductOptionCreatePayload?: Record<string, unknown>;
  ProductOptionUpdatePayload?: Record<string, unknown>;
  ProductOptionDeletePayload?: Record<string, unknown>;
  ProductFeatureCreatePayload?: Record<string, unknown>;
  ProductFeatureUpdatePayload?: Record<string, unknown>;
  ProductFeatureDeletePayload?: Record<string, unknown>;
  WarehouseCreatePayload?: Record<string, unknown>;
  WarehouseUpdatePayload?: Record<string, unknown>;
  WarehouseDeletePayload?: Record<string, unknown>;
  VariantSetStockPayload?: Record<string, unknown>;
  VariantSetMediaPayload?: Record<string, unknown>;

  // Other types
  PageInfo?: Record<string, unknown>;
  GenericUserError?: Record<string, unknown>;
  Description?: Record<string, unknown>;
  VariantDimensions?: Record<string, unknown>;
  VariantWeight?: Record<string, unknown>;
  SelectedOption?: Record<string, unknown>;
  VariantMediaItem?: Record<string, unknown>;

  // Federation entities (external)
  User?: {
    __resolveReference?: ResolverFn<
      unknown,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
  };
  ApiKey?: {
    __resolveReference?: ResolverFn<
      unknown,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
  };
  File?: {
    __resolveReference?: ResolverFn<
      unknown,
      { id: string },
      ContextType,
      Record<string, unknown>
    >;
  };
};
