import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  Email: { input: any; output: any; }
  JSON: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

/** Filter operators for Boolean fields */
export type BooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Supported currency codes. */
export enum CurrencyCode {
  Eur = 'EUR',
  Uah = 'UAH',
  Usd = 'USD'
}

/** Filter operators for DateTime fields */
export type DateTimeFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['DateTime']['input']>>;
};

/** Product description in multiple formats. */
export type Description = {
  __typename?: 'Description';
  /** HTML description. */
  html: Scalars['String']['output'];
  /** EditorJS JSON description. */
  json: Scalars['JSON']['output'];
  /** Plain text description. */
  text: Scalars['String']['output'];
};

/** Input for product description (all fields required). */
export type DescriptionInput = {
  /** HTML description. */
  html: Scalars['String']['input'];
  /** EditorJS JSON description. */
  json: Scalars['JSON']['input'];
  /** Plain text description. */
  text: Scalars['String']['input'];
};

/** Input for setting dimensions (in millimeters). */
export type DimensionsInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** Filter operators for Float fields */
export type FloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Float']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Float']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Float']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type IdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter operators for Int fields */
export type IntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type InventoryMutation = {
  __typename?: 'InventoryMutation';
  productCreate: ProductCreatePayload;
  productDelete: ProductDeletePayload;
  productFeatureCreate: ProductFeatureCreatePayload;
  productFeatureDelete: ProductFeatureDeletePayload;
  productFeatureUpdate: ProductFeatureUpdatePayload;
  productOptionCreate: ProductOptionCreatePayload;
  productOptionDelete: ProductOptionDeletePayload;
  productOptionUpdate: ProductOptionUpdatePayload;
  productPublish: ProductPublishPayload;
  productUnpublish: ProductUnpublishPayload;
  productUpdate: ProductUpdatePayload;
  variantCreate: VariantCreatePayload;
  variantDelete: VariantDeletePayload;
  variantSetCost: VariantSetCostPayload;
  variantSetDimensions: VariantSetDimensionsPayload;
  variantSetMedia: VariantSetMediaPayload;
  variantSetPricing: VariantSetPricingPayload;
  variantSetSku: VariantSetSkuPayload;
  variantSetStock: VariantSetStockPayload;
  variantSetWeight: VariantSetWeightPayload;
  warehouseCreate: WarehouseCreatePayload;
  warehouseDelete: WarehouseDeletePayload;
  warehouseUpdate: WarehouseUpdatePayload;
};


export type InventoryMutationProductDeleteArgs = {
  input: ProductDeleteInput;
};


export type InventoryMutationProductFeatureCreateArgs = {
  input: ProductFeatureCreateInput;
};


export type InventoryMutationProductFeatureDeleteArgs = {
  input: ProductFeatureDeleteInput;
};


export type InventoryMutationProductFeatureUpdateArgs = {
  input: ProductFeatureUpdateInput;
};


export type InventoryMutationProductOptionCreateArgs = {
  input: ProductOptionCreateInput;
};


export type InventoryMutationProductOptionDeleteArgs = {
  input: ProductOptionDeleteInput;
};


export type InventoryMutationProductOptionUpdateArgs = {
  input: ProductOptionUpdateInput;
};


export type InventoryMutationProductPublishArgs = {
  input: ProductPublishInput;
};


export type InventoryMutationProductUnpublishArgs = {
  input: ProductUnpublishInput;
};


export type InventoryMutationProductUpdateArgs = {
  input: ProductUpdateInput;
};


export type InventoryMutationVariantCreateArgs = {
  input: VariantCreateInput;
};


export type InventoryMutationVariantDeleteArgs = {
  input: VariantDeleteInput;
};


export type InventoryMutationVariantSetCostArgs = {
  input: VariantSetCostInput;
};


export type InventoryMutationVariantSetDimensionsArgs = {
  input: VariantSetDimensionsInput;
};


export type InventoryMutationVariantSetMediaArgs = {
  input: VariantSetMediaInput;
};


export type InventoryMutationVariantSetPricingArgs = {
  input: VariantSetPricingInput;
};


export type InventoryMutationVariantSetSkuArgs = {
  input: VariantSetSkuInput;
};


export type InventoryMutationVariantSetStockArgs = {
  input: VariantSetStockInput;
};


export type InventoryMutationVariantSetWeightArgs = {
  input: VariantSetWeightInput;
};


export type InventoryMutationWarehouseCreateArgs = {
  input: WarehouseCreateInput;
};


export type InventoryMutationWarehouseDeleteArgs = {
  input: WarehouseDeleteInput;
};


export type InventoryMutationWarehouseUpdateArgs = {
  input: WarehouseUpdateInput;
};

export type InventoryQuery = {
  __typename?: 'InventoryQuery';
  /** Get a node by its global ID */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
  /** Get a product by ID */
  product: Maybe<Product>;
  /** Get products with Relay-style pagination */
  products: ProductConnection;
  /** Get a variant by ID */
  variant: Maybe<Variant>;
  /** Get variants with Relay-style pagination */
  variants: VariantConnection;
  /** Get a warehouse by ID */
  warehouse: Maybe<Warehouse>;
  /** Get all warehouses */
  warehouses: WarehouseConnection;
};


export type InventoryQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type InventoryQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type InventoryQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type InventoryQueryWarehouseArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  where?: InputMaybe<WarehouseWhereInput>;
};

export type Mutation = {
  __typename?: 'Mutation';
  inventoryMutation: InventoryMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Display type for product options in the UI. */
export enum OptionDisplayType {
  Buttons = 'BUTTONS',
  Dropdown = 'DROPDOWN',
  Swatch = 'SWATCH'
}

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor: Maybe<Scalars['String']['output']>;
};

/** A product represents an item that can be sold. */
export type Product = Node & {
  __typename?: 'Product';
  /** The date and time when the product was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the product was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** Product description. */
  description: Maybe<Description>;
  /** Short excerpt. */
  excerpt: Maybe<Scalars['String']['output']>;
  /** The features of this product. */
  features: Array<ProductFeature>;
  /** The URL-friendly handle for the product. */
  handle: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the product. */
  id: Scalars['ID']['output'];
  /** Whether the product is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** The options available for this product. */
  options: Array<ProductOption>;
  /** The date and time when the product was published, or null if unpublished. */
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  /** SEO description. */
  seoDescription: Maybe<Scalars['String']['output']>;
  /** SEO title. */
  seoTitle: Maybe<Scalars['String']['output']>;
  /** Product title. */
  title: Scalars['String']['output'];
  /** The date and time when the product was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this product. */
  variants: VariantConnection;
  /** The total number of variants for this product. */
  variantsCount: Scalars['Int']['output'];
};


/** A product represents an item that can be sold. */
export type ProductVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Product items. */
export type ProductConnection = {
  __typename?: 'ProductConnection';
  /** A list of edges. */
  edges: Array<ProductEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of products. */
  totalCount: Scalars['Int']['output'];
};

/** Payload for product creation. */
export type ProductCreatePayload = {
  __typename?: 'ProductCreatePayload';
  /** The created product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a product. */
export type ProductDeleteInput = {
  /** The ID of the product to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the product (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for product deletion. */
export type ProductDeletePayload = {
  __typename?: 'ProductDeletePayload';
  /** The ID of the deleted product. */
  deletedProductId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Product connection. */
export type ProductEdge = {
  __typename?: 'ProductEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Product;
};

/** A product feature represents a searchable attribute of a product (e.g., Material, Brand). */
export type ProductFeature = Node & {
  __typename?: 'ProductFeature';
  /** The globally unique ID of the feature. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this feature. */
  slug: Scalars['String']['output'];
  /** The available values for this feature. */
  values: Array<ProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ProductFeatureCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ProductFeatureValueCreateInput>;
};

/** Payload for feature create. */
export type ProductFeatureCreatePayload = {
  __typename?: 'ProductFeatureCreatePayload';
  /** The created feature. */
  feature: Maybe<ProductFeature>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a feature from a product. */
export type ProductFeatureDeleteInput = {
  /** The ID of the feature to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for feature delete. */
export type ProductFeatureDeletePayload = {
  __typename?: 'ProductFeatureDeletePayload';
  /** The ID of the deleted feature. */
  deletedFeatureId: Maybe<Scalars['ID']['output']>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for creating a feature during product creation. */
export type ProductFeatureInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ProductFeatureValueCreateInput>;
};

/** Input for updating a feature. */
export type ProductFeatureUpdateInput = {
  /** The ID of the feature to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the feature. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ProductFeatureValuesInput>;
};

/** Payload for feature update. */
export type ProductFeatureUpdatePayload = {
  __typename?: 'ProductFeatureUpdatePayload';
  /** The updated feature. */
  feature: Maybe<ProductFeature>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A value for a product feature. */
export type ProductFeatureValue = Node & {
  __typename?: 'ProductFeatureValue';
  /** The globally unique ID of the feature value. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this value. */
  slug: Scalars['String']['output'];
};

/** Input for creating a feature value. */
export type ProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
};

/** Input for updating an existing feature value. */
export type ProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for nested value operations in feature update. */
export type ProductFeatureValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ProductFeatureValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ProductFeatureValueUpdateInput>>;
};

/** A product option defines a configurable aspect of a product, such as Size or Color. */
export type ProductOption = Node & {
  __typename?: 'ProductOption';
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** The globally unique ID of the option. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this option. */
  slug: Scalars['String']['output'];
  /** The available values for this option. */
  values: Array<ProductOptionValue>;
};

/** Input for creating an option on a product. */
export type ProductOptionCreateInput = {
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product (optional when creating with product). */
  productId?: InputMaybe<Scalars['ID']['input']>;
  /** The URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** The values for this option. */
  values: Array<ProductOptionValueCreateInput>;
};

/** Payload for option create. Returns the product with new variants. */
export type ProductOptionCreatePayload = {
  __typename?: 'ProductOptionCreatePayload';
  /** The created option. */
  option: Maybe<ProductOption>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting an option from a product. */
export type ProductOptionDeleteInput = {
  /** The ID of the option to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for option delete. */
export type ProductOptionDeletePayload = {
  __typename?: 'ProductOptionDeletePayload';
  /** The ID of the deleted option. */
  deletedOptionId: Maybe<Scalars['ID']['output']>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A visual swatch for representing an option value. */
export type ProductOptionSwatch = Node & {
  __typename?: 'ProductOptionSwatch';
  /** The primary color (hex code or color name). */
  colorOne: Maybe<Scalars['String']['output']>;
  /** The secondary color for gradients. */
  colorTwo: Maybe<Scalars['String']['output']>;
  /** The file for image-based swatches. */
  file: Maybe<File>;
  /** The globally unique ID of the swatch. */
  id: Scalars['ID']['output'];
  /** Additional metadata for the swatch. */
  metadata: Maybe<Scalars['JSON']['output']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for creating/updating a swatch. */
export type ProductOptionSwatchInput = {
  /** The primary color (hex code or color name). */
  colorOne?: InputMaybe<Scalars['String']['input']>;
  /** The secondary color for gradients. */
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  /** The file ID for image-based swatches. */
  fileId?: InputMaybe<Scalars['ID']['input']>;
  /** Additional metadata. */
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for updating an option. */
export type ProductOptionUpdateInput = {
  /** The new display type. */
  displayType?: InputMaybe<OptionDisplayType>;
  /** The ID of the option to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the option. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ProductOptionValuesInput>;
};

/** Payload for option update. */
export type ProductOptionUpdatePayload = {
  __typename?: 'ProductOptionUpdatePayload';
  /** The updated option. */
  option: Maybe<ProductOption>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A value for a product option, such as "Red" for Color or "Large" for Size. */
export type ProductOptionValue = Node & {
  __typename?: 'ProductOptionValue';
  /** The globally unique ID of the option value. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this value. */
  slug: Scalars['String']['output'];
  /** The visual swatch for this value (if applicable). */
  swatch: Maybe<ProductOptionSwatch>;
};

/** Input for creating an option value. */
export type ProductOptionValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** The swatch for this value. */
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

/** Input for updating an existing option value. */
export type ProductOptionValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

/** Input for nested value operations in option update. */
export type ProductOptionValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ProductOptionValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ProductOptionValueUpdateInput>>;
};

/** Input for publishing a product. */
export type ProductPublishInput = {
  /** The ID of the product to publish. */
  id: Scalars['ID']['input'];
};

/** Payload for product publish. */
export type ProductPublishPayload = {
  __typename?: 'ProductPublishPayload';
  /** The published product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for unpublishing a product. */
export type ProductUnpublishInput = {
  /** The ID of the product to unpublish. */
  id: Scalars['ID']['input'];
};

/** Payload for product unpublish. */
export type ProductUnpublishPayload = {
  __typename?: 'ProductUnpublishPayload';
  /** The unpublished product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating a product. */
export type ProductUpdateInput = {
  /** Product description. */
  description?: InputMaybe<DescriptionInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The product ID. */
  id: Scalars['ID']['input'];
  /** SEO description. */
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  /** SEO title. */
  seoTitle?: InputMaybe<Scalars['String']['input']>;
  /** Product title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for product update. */
export type ProductUpdatePayload = {
  __typename?: 'ProductUpdatePayload';
  /** The updated product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

export type Query = {
  __typename?: 'Query';
  inventoryQuery: InventoryQuery;
};

/** Represents a selected option for a variant. */
export type SelectedOption = {
  __typename?: 'SelectedOption';
  /** The option ID. */
  optionId: Scalars['ID']['output'];
  /** The selected value ID. */
  optionValueId: Scalars['ID']['output'];
};

/** Input for selecting an option value for a variant. */
export type SelectedOptionInput = {
  /** The ID of the option. */
  optionId: Scalars['ID']['input'];
  /** The ID of the option value. */
  optionValueId: Scalars['ID']['input'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type StringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-sensitive) */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive) */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
  /** Equals */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-sensitive) */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive) */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** Type of visual swatch for option values. */
export enum SwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT',
  Image = 'IMAGE'
}

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** A variant represents a specific version of a product, such as a size or color. */
export type Variant = Node & {
  __typename?: 'Variant';
  /** Current cost for this variant. */
  cost: Maybe<VariantCost>;
  /** Cost history for this variant. */
  costHistory: VariantCostConnection;
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** Physical dimensions of this variant. */
  dimensions: Maybe<VariantDimensions>;
  /** The external ID in the external system. */
  externalId: Maybe<Scalars['String']['output']>;
  /** The external system identifier for integration purposes. */
  externalSystem: Maybe<Scalars['String']['output']>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the variant. */
  id: Scalars['ID']['output'];
  /** Whether the variant is in stock (has quantity > 0 in any warehouse). */
  inStock: Scalars['Boolean']['output'];
  /** Whether this is the default variant for the product. */
  isDefault: Scalars['Boolean']['output'];
  /** Media attached to this variant (images, videos). */
  media: Array<VariantMediaItem>;
  /** Current price for this variant. */
  price: Maybe<VariantPrice>;
  /** Price history for this variant. */
  priceHistory: VariantPriceConnection;
  /** The product this variant belongs to. */
  product: Product;
  /** The selected option values for this variant. */
  selectedOptions: Array<SelectedOption>;
  /** The SKU (Stock Keeping Unit) of the variant. */
  sku: Maybe<Scalars['String']['output']>;
  /** Stock levels for this variant across warehouses. */
  stock: Array<WarehouseStock>;
  /** Variant title. */
  title: Maybe<Scalars['String']['output']>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Physical weight of this variant. */
  weight: Maybe<VariantWeight>;
};


/** A variant represents a specific version of a product, such as a size or color. */
export type VariantCostHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A variant represents a specific version of a product, such as a size or color. */
export type VariantPriceHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Variant items. */
export type VariantConnection = {
  __typename?: 'VariantConnection';
  /** A list of edges. */
  edges: Array<VariantEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of variants. */
  totalCount: Scalars['Int']['output'];
};

/** Represents the cost of a variant. */
export type VariantCost = Node & {
  __typename?: 'VariantCost';
  /** The currency code. */
  currency: CurrencyCode;
  /** When this cost became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this cost stopped being effective (null if current). */
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the cost record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active cost. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this cost record was created. */
  recordedAt: Scalars['DateTime']['output'];
  /** The unit cost in minor units. */
  unitCostMinor: Scalars['BigInt']['output'];
};

/** A connection to a list of VariantCost items. */
export type VariantCostConnection = {
  __typename?: 'VariantCostConnection';
  /** A list of edges. */
  edges: Array<VariantCostEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of cost records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantCost connection. */
export type VariantCostEdge = {
  __typename?: 'VariantCostEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: VariantCost;
};

/** Input for creating a variant with a product ID. */
export type VariantCreateInput = {
  /** The ID of the product to add the variant to. */
  productId: Scalars['ID']['input'];
  /** The variant data. */
  variant: VariantInput;
};

/** Payload for variant creation. */
export type VariantCreatePayload = {
  __typename?: 'VariantCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created variant. */
  variant: Maybe<Variant>;
};

/** Input for deleting a variant. */
export type VariantDeleteInput = {
  /** The ID of the variant to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the variant (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for variant deletion. */
export type VariantDeletePayload = {
  __typename?: 'VariantDeletePayload';
  /** The ID of the deleted variant. */
  deletedVariantId: Maybe<Scalars['ID']['output']>;
  /** The product the variant belonged to. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type VariantDimensions = {
  __typename?: 'VariantDimensions';
  /** Height in millimeters. */
  height: Scalars['Int']['output'];
  /** Length in millimeters. */
  length: Scalars['Int']['output'];
  /** Width in millimeters. */
  width: Scalars['Int']['output'];
};

/** An edge in a Variant connection. */
export type VariantEdge = {
  __typename?: 'VariantEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Variant;
};

/** Input for creating a variant. */
export type VariantInput = {
  /** Physical dimensions. */
  dimensions?: InputMaybe<DimensionsInput>;
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  /** Selected option values for the variant (required). */
  options: Array<SelectedOptionInput>;
  /** The SKU for the variant. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Variant title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Physical weight. */
  weight?: InputMaybe<WeightInput>;
};

/** Media attached to a variant with sort order. */
export type VariantMediaItem = {
  __typename?: 'VariantMediaItem';
  /** The file from the Media service. */
  file: File;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** Represents a price for a variant. */
export type VariantPrice = Node & {
  __typename?: 'VariantPrice';
  /** The price amount in minor units (cents, kopecks, etc.). */
  amountMinor: Scalars['BigInt']['output'];
  /** The compare-at price in minor units (strikethrough price). */
  compareAtMinor: Maybe<Scalars['BigInt']['output']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** When this price became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this price stopped being effective (null if current). */
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the price record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active price. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this price record was created. */
  recordedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of VariantPrice items. */
export type VariantPriceConnection = {
  __typename?: 'VariantPriceConnection';
  /** A list of edges. */
  edges: Array<VariantPriceEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of price records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantPrice connection. */
export type VariantPriceEdge = {
  __typename?: 'VariantPriceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: VariantPrice;
};

/** Input for setting a cost on a variant. */
export type VariantSetCostInput = {
  /** The currency code. */
  currency: CurrencyCode;
  /** The unit cost in minor units. */
  unitCostMinor: Scalars['BigInt']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant cost set. */
export type VariantSetCostPayload = {
  __typename?: 'VariantSetCostPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting variant dimensions. */
export type VariantSetDimensionsInput = {
  /** The dimensions to set. */
  dimensions: DimensionsInput;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant dimensions set. */
export type VariantSetDimensionsPayload = {
  __typename?: 'VariantSetDimensionsPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting variant media (replaces all existing media). */
export type VariantSetMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars['ID']['input']>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant set media. */
export type VariantSetMediaPayload = {
  __typename?: 'VariantSetMediaPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting a price on a variant. */
export type VariantSetPricingInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant pricing set. */
export type VariantSetPricingPayload = {
  __typename?: 'VariantSetPricingPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting variant SKU. */
export type VariantSetSkuInput = {
  /** The new SKU value. */
  sku: Scalars['String']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant SKU set. */
export type VariantSetSkuPayload = {
  __typename?: 'VariantSetSkuPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting stock on a variant. */
export type VariantSetStockInput = {
  /** The quantity to set. */
  quantity: Scalars['Int']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
  /** The warehouse ID. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for variant stock set. */
export type VariantSetStockPayload = {
  __typename?: 'VariantSetStockPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for setting variant weight. */
export type VariantSetWeightInput = {
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
  /** The weight to set. */
  weight: WeightInput;
};

/** Payload for variant weight set. */
export type VariantSetWeightPayload = {
  __typename?: 'VariantSetWeightPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Physical weight of a variant (stored in grams). */
export type VariantWeight = {
  __typename?: 'VariantWeight';
  /** Weight in grams. */
  value: Scalars['Int']['output'];
};

/** A warehouse represents a physical location where inventory is stored. */
export type Warehouse = Node & {
  __typename?: 'Warehouse';
  /** The unique code identifying this warehouse. */
  code: Scalars['String']['output'];
  /** The date and time when the warehouse was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the warehouse. */
  id: Scalars['ID']['output'];
  /** Whether this is the default warehouse for the project. */
  isDefault: Scalars['Boolean']['output'];
  /** The display name of the warehouse. */
  name: Scalars['String']['output'];
  /** Stock levels for all variants in this warehouse. */
  stock: WarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars['Int']['output'];
};


/** A warehouse represents a physical location where inventory is stored. */
export type WarehouseStockArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Warehouse items. */
export type WarehouseConnection = {
  __typename?: 'WarehouseConnection';
  /** A list of edges. */
  edges: Array<WarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for Warehouse */
export type WarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<WarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type WarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars['String']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name for the warehouse. */
  name: Scalars['String']['input'];
};

/** Payload for warehouse creation. */
export type WarehouseCreatePayload = {
  __typename?: 'WarehouseCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Input for deleting a warehouse. */
export type WarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for warehouse deletion. */
export type WarehouseDeletePayload = {
  __typename?: 'WarehouseDeletePayload';
  /** The ID of the deleted warehouse. */
  deletedWarehouseId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Warehouse connection. */
export type WarehouseEdge = {
  __typename?: 'WarehouseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Warehouse;
};

/** Ordering configuration for Warehouse */
export type WarehouseOrderByInput = {
  /** Field to order by */
  field: WarehouseOrderField;
  /** Sort direction */
  order: SortDirection;
};

/** Fields available for sorting Warehouse */
export enum WarehouseOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Represents stock level for a variant in a specific warehouse. */
export type WarehouseStock = Node & {
  __typename?: 'WarehouseStock';
  /** The date and time when the stock was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the stock record. */
  id: Scalars['ID']['output'];
  /** The quantity currently on hand. */
  quantityOnHand: Scalars['Int']['output'];
  /** The date and time when the stock was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variant this stock record is for. */
  variant: Variant;
  /** The warehouse where this stock is located. */
  warehouse: Warehouse;
};

/** A connection to a list of WarehouseStock items. */
export type WarehouseStockConnection = {
  __typename?: 'WarehouseStockConnection';
  /** A list of edges. */
  edges: Array<WarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of stock records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a WarehouseStock connection. */
export type WarehouseStockEdge = {
  __typename?: 'WarehouseStockEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: WarehouseStock;
};

/** Input for updating a warehouse. */
export type WarehouseUpdateInput = {
  /** The new code for the warehouse. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the warehouse to update. */
  id: Scalars['ID']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The new name for the warehouse. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for warehouse update. */
export type WarehouseUpdatePayload = {
  __typename?: 'WarehouseUpdatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Filter conditions for Warehouse */
export type WarehouseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Input for setting weight (in grams). */
export type WeightInput = {
  /** Weight in grams. */
  value: Scalars['Int']['input'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Product ) | ( ProductFeature ) | ( ProductFeatureValue ) | ( ProductOption ) | ( ProductOptionSwatch ) | ( ProductOptionValue ) | ( Variant ) | ( VariantCost ) | ( VariantPrice ) | ( Warehouse ) | ( WarehouseStock );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  Description: ResolverTypeWrapper<Description>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  DescriptionInput: DescriptionInput;
  DimensionsInput: DimensionsInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryMutation: ResolverTypeWrapper<InventoryMutation>;
  InventoryQuery: ResolverTypeWrapper<Omit<InventoryQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  OptionDisplayType: OptionDisplayType;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<Product>;
  ProductConnection: ResolverTypeWrapper<ProductConnection>;
  ProductCreatePayload: ResolverTypeWrapper<ProductCreatePayload>;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ResolverTypeWrapper<ProductDeletePayload>;
  ProductEdge: ResolverTypeWrapper<ProductEdge>;
  ProductFeature: ResolverTypeWrapper<ProductFeature>;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: ResolverTypeWrapper<ProductFeatureCreatePayload>;
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: ResolverTypeWrapper<ProductFeatureDeletePayload>;
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: ResolverTypeWrapper<ProductFeatureUpdatePayload>;
  ProductFeatureValue: ResolverTypeWrapper<ProductFeatureValue>;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductOption: ResolverTypeWrapper<ProductOption>;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: ResolverTypeWrapper<ProductOptionCreatePayload>;
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: ResolverTypeWrapper<ProductOptionDeletePayload>;
  ProductOptionSwatch: ResolverTypeWrapper<ProductOptionSwatch>;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: ResolverTypeWrapper<ProductOptionUpdatePayload>;
  ProductOptionValue: ResolverTypeWrapper<ProductOptionValue>;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductPublishInput: ProductPublishInput;
  ProductPublishPayload: ResolverTypeWrapper<ProductPublishPayload>;
  ProductUnpublishInput: ProductUnpublishInput;
  ProductUnpublishPayload: ResolverTypeWrapper<ProductUnpublishPayload>;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: ResolverTypeWrapper<ProductUpdatePayload>;
  Query: ResolverTypeWrapper<{}>;
  SelectedOption: ResolverTypeWrapper<SelectedOption>;
  SelectedOptionInput: SelectedOptionInput;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  SwatchType: SwatchType;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  Variant: ResolverTypeWrapper<Variant>;
  VariantConnection: ResolverTypeWrapper<VariantConnection>;
  VariantCost: ResolverTypeWrapper<VariantCost>;
  VariantCostConnection: ResolverTypeWrapper<VariantCostConnection>;
  VariantCostEdge: ResolverTypeWrapper<VariantCostEdge>;
  VariantCreateInput: VariantCreateInput;
  VariantCreatePayload: ResolverTypeWrapper<VariantCreatePayload>;
  VariantDeleteInput: VariantDeleteInput;
  VariantDeletePayload: ResolverTypeWrapper<VariantDeletePayload>;
  VariantDimensions: ResolverTypeWrapper<VariantDimensions>;
  VariantEdge: ResolverTypeWrapper<VariantEdge>;
  VariantInput: VariantInput;
  VariantMediaItem: ResolverTypeWrapper<VariantMediaItem>;
  VariantPrice: ResolverTypeWrapper<VariantPrice>;
  VariantPriceConnection: ResolverTypeWrapper<VariantPriceConnection>;
  VariantPriceEdge: ResolverTypeWrapper<VariantPriceEdge>;
  VariantSetCostInput: VariantSetCostInput;
  VariantSetCostPayload: ResolverTypeWrapper<VariantSetCostPayload>;
  VariantSetDimensionsInput: VariantSetDimensionsInput;
  VariantSetDimensionsPayload: ResolverTypeWrapper<VariantSetDimensionsPayload>;
  VariantSetMediaInput: VariantSetMediaInput;
  VariantSetMediaPayload: ResolverTypeWrapper<VariantSetMediaPayload>;
  VariantSetPricingInput: VariantSetPricingInput;
  VariantSetPricingPayload: ResolverTypeWrapper<VariantSetPricingPayload>;
  VariantSetSkuInput: VariantSetSkuInput;
  VariantSetSkuPayload: ResolverTypeWrapper<VariantSetSkuPayload>;
  VariantSetStockInput: VariantSetStockInput;
  VariantSetStockPayload: ResolverTypeWrapper<VariantSetStockPayload>;
  VariantSetWeightInput: VariantSetWeightInput;
  VariantSetWeightPayload: ResolverTypeWrapper<VariantSetWeightPayload>;
  VariantWeight: ResolverTypeWrapper<VariantWeight>;
  Warehouse: ResolverTypeWrapper<Warehouse>;
  WarehouseConnection: ResolverTypeWrapper<WarehouseConnection>;
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: ResolverTypeWrapper<WarehouseCreatePayload>;
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: ResolverTypeWrapper<WarehouseDeletePayload>;
  WarehouseEdge: ResolverTypeWrapper<WarehouseEdge>;
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseOrderField: WarehouseOrderField;
  WarehouseStock: ResolverTypeWrapper<WarehouseStock>;
  WarehouseStockConnection: ResolverTypeWrapper<WarehouseStockConnection>;
  WarehouseStockEdge: ResolverTypeWrapper<WarehouseStockEdge>;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: ResolverTypeWrapper<WarehouseUpdatePayload>;
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Description: Description;
  String: Scalars['String']['output'];
  DescriptionInput: DescriptionInput;
  DimensionsInput: DimensionsInput;
  Int: Scalars['Int']['output'];
  Email: Scalars['Email']['output'];
  File: File;
  ID: Scalars['ID']['output'];
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryMutation: InventoryMutation;
  InventoryQuery: Omit<InventoryQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  ProductConnection: ProductConnection;
  ProductCreatePayload: ProductCreatePayload;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ProductDeletePayload;
  ProductEdge: ProductEdge;
  ProductFeature: ProductFeature;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: ProductFeatureCreatePayload;
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: ProductFeatureDeletePayload;
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: ProductFeatureUpdatePayload;
  ProductFeatureValue: ProductFeatureValue;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductOption: ProductOption;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: ProductOptionCreatePayload;
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: ProductOptionDeletePayload;
  ProductOptionSwatch: ProductOptionSwatch;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: ProductOptionUpdatePayload;
  ProductOptionValue: ProductOptionValue;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductPublishInput: ProductPublishInput;
  ProductPublishPayload: ProductPublishPayload;
  ProductUnpublishInput: ProductUnpublishInput;
  ProductUnpublishPayload: ProductUnpublishPayload;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: ProductUpdatePayload;
  Query: {};
  SelectedOption: SelectedOption;
  SelectedOptionInput: SelectedOptionInput;
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Variant;
  VariantConnection: VariantConnection;
  VariantCost: VariantCost;
  VariantCostConnection: VariantCostConnection;
  VariantCostEdge: VariantCostEdge;
  VariantCreateInput: VariantCreateInput;
  VariantCreatePayload: VariantCreatePayload;
  VariantDeleteInput: VariantDeleteInput;
  VariantDeletePayload: VariantDeletePayload;
  VariantDimensions: VariantDimensions;
  VariantEdge: VariantEdge;
  VariantInput: VariantInput;
  VariantMediaItem: VariantMediaItem;
  VariantPrice: VariantPrice;
  VariantPriceConnection: VariantPriceConnection;
  VariantPriceEdge: VariantPriceEdge;
  VariantSetCostInput: VariantSetCostInput;
  VariantSetCostPayload: VariantSetCostPayload;
  VariantSetDimensionsInput: VariantSetDimensionsInput;
  VariantSetDimensionsPayload: VariantSetDimensionsPayload;
  VariantSetMediaInput: VariantSetMediaInput;
  VariantSetMediaPayload: VariantSetMediaPayload;
  VariantSetPricingInput: VariantSetPricingInput;
  VariantSetPricingPayload: VariantSetPricingPayload;
  VariantSetSkuInput: VariantSetSkuInput;
  VariantSetSkuPayload: VariantSetSkuPayload;
  VariantSetStockInput: VariantSetStockInput;
  VariantSetStockPayload: VariantSetStockPayload;
  VariantSetWeightInput: VariantSetWeightInput;
  VariantSetWeightPayload: VariantSetWeightPayload;
  VariantWeight: VariantWeight;
  Warehouse: Warehouse;
  WarehouseConnection: WarehouseConnection;
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: WarehouseCreatePayload;
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: WarehouseDeletePayload;
  WarehouseEdge: WarehouseEdge;
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseStock: WarehouseStock;
  WarehouseStockConnection: WarehouseStockConnection;
  WarehouseStockEdge: WarehouseStockEdge;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: WarehouseUpdatePayload;
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DescriptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Description'] = ResolversParentTypes['Description']> = ResolversObject<{
  html?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, { __typename: 'File' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryMutation'] = ResolversParentTypes['InventoryMutation']> = ResolversObject<{
  productCreate?: Resolver<ResolversTypes['ProductCreatePayload'], ParentType, ContextType>;
  productDelete?: Resolver<ResolversTypes['ProductDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductDeleteArgs, 'input'>>;
  productFeatureCreate?: Resolver<ResolversTypes['ProductFeatureCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductFeatureCreateArgs, 'input'>>;
  productFeatureDelete?: Resolver<ResolversTypes['ProductFeatureDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductFeatureDeleteArgs, 'input'>>;
  productFeatureUpdate?: Resolver<ResolversTypes['ProductFeatureUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductFeatureUpdateArgs, 'input'>>;
  productOptionCreate?: Resolver<ResolversTypes['ProductOptionCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductOptionCreateArgs, 'input'>>;
  productOptionDelete?: Resolver<ResolversTypes['ProductOptionDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductOptionDeleteArgs, 'input'>>;
  productOptionUpdate?: Resolver<ResolversTypes['ProductOptionUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductOptionUpdateArgs, 'input'>>;
  productPublish?: Resolver<ResolversTypes['ProductPublishPayload'], ParentType, ContextType, RequireFields<InventoryMutationProductPublishArgs, 'input'>>;
  productUnpublish?: Resolver<ResolversTypes['ProductUnpublishPayload'], ParentType, ContextType, RequireFields<InventoryMutationProductUnpublishArgs, 'input'>>;
  productUpdate?: Resolver<ResolversTypes['ProductUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationProductUpdateArgs, 'input'>>;
  variantCreate?: Resolver<ResolversTypes['VariantCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantCreateArgs, 'input'>>;
  variantDelete?: Resolver<ResolversTypes['VariantDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantDeleteArgs, 'input'>>;
  variantSetCost?: Resolver<ResolversTypes['VariantSetCostPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetCostArgs, 'input'>>;
  variantSetDimensions?: Resolver<ResolversTypes['VariantSetDimensionsPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetDimensionsArgs, 'input'>>;
  variantSetMedia?: Resolver<ResolversTypes['VariantSetMediaPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetMediaArgs, 'input'>>;
  variantSetPricing?: Resolver<ResolversTypes['VariantSetPricingPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetPricingArgs, 'input'>>;
  variantSetSku?: Resolver<ResolversTypes['VariantSetSkuPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetSkuArgs, 'input'>>;
  variantSetStock?: Resolver<ResolversTypes['VariantSetStockPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetStockArgs, 'input'>>;
  variantSetWeight?: Resolver<ResolversTypes['VariantSetWeightPayload'], ParentType, ContextType, RequireFields<InventoryMutationVariantSetWeightArgs, 'input'>>;
  warehouseCreate?: Resolver<ResolversTypes['WarehouseCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseCreateArgs, 'input'>>;
  warehouseDelete?: Resolver<ResolversTypes['WarehouseDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseDeleteArgs, 'input'>>;
  warehouseUpdate?: Resolver<ResolversTypes['WarehouseUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryQuery'] = ResolversParentTypes['InventoryQuery']> = ResolversObject<{
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<InventoryQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<InventoryQueryNodesArgs, 'ids'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<InventoryQueryProductArgs, 'id'>>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<InventoryQueryProductsArgs>>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType, RequireFields<InventoryQueryVariantArgs, 'id'>>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<InventoryQueryVariantsArgs>>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType, RequireFields<InventoryQueryWarehouseArgs, 'id'>>;
  warehouses?: Resolver<ResolversTypes['WarehouseConnection'], ParentType, ContextType, Partial<InventoryQueryWarehousesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  inventoryMutation?: Resolver<ResolversTypes['InventoryMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Product' | 'ProductFeature' | 'ProductFeatureValue' | 'ProductOption' | 'ProductOptionSwatch' | 'ProductOptionValue' | 'Variant' | 'VariantCost' | 'VariantPrice' | 'Warehouse' | 'WarehouseStock', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['Description']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  handle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  seoDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<ProductVariantsArgs>>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductConnection'] = ResolversParentTypes['ProductConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductCreatePayload'] = ResolversParentTypes['ProductCreatePayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductDeletePayload'] = ResolversParentTypes['ProductDeletePayload']> = ResolversObject<{
  deletedProductId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductEdge'] = ResolversParentTypes['ProductEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeature'] = ResolversParentTypes['ProductFeature']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeature']>, { __typename: 'ProductFeature' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ProductFeatureValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureCreatePayload'] = ResolversParentTypes['ProductFeatureCreatePayload']> = ResolversObject<{
  feature?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureDeletePayload'] = ResolversParentTypes['ProductFeatureDeletePayload']> = ResolversObject<{
  deletedFeatureId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureUpdatePayload'] = ResolversParentTypes['ProductFeatureUpdatePayload']> = ResolversObject<{
  feature?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureValue'] = ResolversParentTypes['ProductFeatureValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeatureValue']>, { __typename: 'ProductFeatureValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOption'] = ResolversParentTypes['ProductOption']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOption']>, { __typename: 'ProductOption' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  displayType?: Resolver<ResolversTypes['OptionDisplayType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ProductOptionValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionCreatePayload'] = ResolversParentTypes['ProductOptionCreatePayload']> = ResolversObject<{
  option?: Resolver<Maybe<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionDeletePayload'] = ResolversParentTypes['ProductOptionDeletePayload']> = ResolversObject<{
  deletedOptionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionSwatch'] = ResolversParentTypes['ProductOptionSwatch']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionSwatch']>, { __typename: 'ProductOptionSwatch' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  colorOne?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  colorTwo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  swatchType?: Resolver<ResolversTypes['SwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionUpdatePayload'] = ResolversParentTypes['ProductOptionUpdatePayload']> = ResolversObject<{
  option?: Resolver<Maybe<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionValue'] = ResolversParentTypes['ProductOptionValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionValue']>, { __typename: 'ProductOptionValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['ProductOptionSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductPublishPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductPublishPayload'] = ResolversParentTypes['ProductPublishPayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUnpublishPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUnpublishPayload'] = ResolversParentTypes['ProductUnpublishPayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUpdatePayload'] = ResolversParentTypes['ProductUpdatePayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  inventoryQuery?: Resolver<ResolversTypes['InventoryQuery'], ParentType, ContextType>;
}>;

export type SelectedOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SelectedOption'] = ResolversParentTypes['SelectedOption']> = ResolversObject<{
  optionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionValueId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, { __typename: 'Variant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  cost?: Resolver<Maybe<ResolversTypes['VariantCost']>, ParentType, ContextType>;
  costHistory?: Resolver<ResolversTypes['VariantCostConnection'], ParentType, ContextType, Partial<VariantCostHistoryArgs>>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['VariantDimensions']>, ParentType, ContextType>;
  externalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalSystem?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['VariantMediaItem']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['VariantPrice']>, ParentType, ContextType>;
  priceHistory?: Resolver<ResolversTypes['VariantPriceConnection'], ParentType, ContextType, Partial<VariantPriceHistoryArgs>>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  selectedOptions?: Resolver<Array<ResolversTypes['SelectedOption']>, ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stock?: Resolver<Array<ResolversTypes['WarehouseStock']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['VariantWeight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantConnection'] = ResolversParentTypes['VariantConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCost'] = ResolversParentTypes['VariantCost']> = ResolversObject<{
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCurrent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  unitCostMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCostConnection'] = ResolversParentTypes['VariantCostConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantCostEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCostEdge'] = ResolversParentTypes['VariantCostEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['VariantCost'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCreatePayload'] = ResolversParentTypes['VariantCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantDeletePayload'] = ResolversParentTypes['VariantDeletePayload']> = ResolversObject<{
  deletedVariantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantDimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantDimensions'] = ResolversParentTypes['VariantDimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantEdge'] = ResolversParentTypes['VariantEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantMediaItem'] = ResolversParentTypes['VariantMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPrice'] = ResolversParentTypes['VariantPrice']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  compareAtMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCurrent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceConnection'] = ResolversParentTypes['VariantPriceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantPriceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceEdge'] = ResolversParentTypes['VariantPriceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['VariantPrice'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetCostPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetCostPayload'] = ResolversParentTypes['VariantSetCostPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetDimensionsPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetDimensionsPayload'] = ResolversParentTypes['VariantSetDimensionsPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetMediaPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetMediaPayload'] = ResolversParentTypes['VariantSetMediaPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetPricingPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetPricingPayload'] = ResolversParentTypes['VariantSetPricingPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetSkuPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetSkuPayload'] = ResolversParentTypes['VariantSetSkuPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetStockPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetStockPayload'] = ResolversParentTypes['VariantSetStockPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantSetWeightPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantSetWeightPayload'] = ResolversParentTypes['VariantSetWeightPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantWeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantWeight'] = ResolversParentTypes['VariantWeight']> = ResolversObject<{
  value?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Warehouse'] = ResolversParentTypes['Warehouse']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Warehouse']>, { __typename: 'Warehouse' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['WarehouseStockConnection'], ParentType, ContextType, Partial<WarehouseStockArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseConnection'] = ResolversParentTypes['WarehouseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseCreatePayload'] = ResolversParentTypes['WarehouseCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseDeletePayload'] = ResolversParentTypes['WarehouseDeletePayload']> = ResolversObject<{
  deletedWarehouseId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseEdge'] = ResolversParentTypes['WarehouseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStock'] = ResolversParentTypes['WarehouseStock']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantityOnHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  warehouse?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockConnection'] = ResolversParentTypes['WarehouseStockConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseStockEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockEdge'] = ResolversParentTypes['WarehouseStockEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['WarehouseStock'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseUpdatePayload'] = ResolversParentTypes['WarehouseUpdatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Description?: DescriptionResolvers<ContextType>;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  InventoryMutation?: InventoryMutationResolvers<ContextType>;
  InventoryQuery?: InventoryQueryResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductCreatePayload?: ProductCreatePayloadResolvers<ContextType>;
  ProductDeletePayload?: ProductDeletePayloadResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  ProductFeature?: ProductFeatureResolvers<ContextType>;
  ProductFeatureCreatePayload?: ProductFeatureCreatePayloadResolvers<ContextType>;
  ProductFeatureDeletePayload?: ProductFeatureDeletePayloadResolvers<ContextType>;
  ProductFeatureUpdatePayload?: ProductFeatureUpdatePayloadResolvers<ContextType>;
  ProductFeatureValue?: ProductFeatureValueResolvers<ContextType>;
  ProductOption?: ProductOptionResolvers<ContextType>;
  ProductOptionCreatePayload?: ProductOptionCreatePayloadResolvers<ContextType>;
  ProductOptionDeletePayload?: ProductOptionDeletePayloadResolvers<ContextType>;
  ProductOptionSwatch?: ProductOptionSwatchResolvers<ContextType>;
  ProductOptionUpdatePayload?: ProductOptionUpdatePayloadResolvers<ContextType>;
  ProductOptionValue?: ProductOptionValueResolvers<ContextType>;
  ProductPublishPayload?: ProductPublishPayloadResolvers<ContextType>;
  ProductUnpublishPayload?: ProductUnpublishPayloadResolvers<ContextType>;
  ProductUpdatePayload?: ProductUpdatePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SelectedOption?: SelectedOptionResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
  VariantConnection?: VariantConnectionResolvers<ContextType>;
  VariantCost?: VariantCostResolvers<ContextType>;
  VariantCostConnection?: VariantCostConnectionResolvers<ContextType>;
  VariantCostEdge?: VariantCostEdgeResolvers<ContextType>;
  VariantCreatePayload?: VariantCreatePayloadResolvers<ContextType>;
  VariantDeletePayload?: VariantDeletePayloadResolvers<ContextType>;
  VariantDimensions?: VariantDimensionsResolvers<ContextType>;
  VariantEdge?: VariantEdgeResolvers<ContextType>;
  VariantMediaItem?: VariantMediaItemResolvers<ContextType>;
  VariantPrice?: VariantPriceResolvers<ContextType>;
  VariantPriceConnection?: VariantPriceConnectionResolvers<ContextType>;
  VariantPriceEdge?: VariantPriceEdgeResolvers<ContextType>;
  VariantSetCostPayload?: VariantSetCostPayloadResolvers<ContextType>;
  VariantSetDimensionsPayload?: VariantSetDimensionsPayloadResolvers<ContextType>;
  VariantSetMediaPayload?: VariantSetMediaPayloadResolvers<ContextType>;
  VariantSetPricingPayload?: VariantSetPricingPayloadResolvers<ContextType>;
  VariantSetSkuPayload?: VariantSetSkuPayloadResolvers<ContextType>;
  VariantSetStockPayload?: VariantSetStockPayloadResolvers<ContextType>;
  VariantSetWeightPayload?: VariantSetWeightPayloadResolvers<ContextType>;
  VariantWeight?: VariantWeightResolvers<ContextType>;
  Warehouse?: WarehouseResolvers<ContextType>;
  WarehouseConnection?: WarehouseConnectionResolvers<ContextType>;
  WarehouseCreatePayload?: WarehouseCreatePayloadResolvers<ContextType>;
  WarehouseDeletePayload?: WarehouseDeletePayloadResolvers<ContextType>;
  WarehouseEdge?: WarehouseEdgeResolvers<ContextType>;
  WarehouseStock?: WarehouseStockResolvers<ContextType>;
  WarehouseStockConnection?: WarehouseStockConnectionResolvers<ContextType>;
  WarehouseStockEdge?: WarehouseStockEdgeResolvers<ContextType>;
  WarehouseUpdatePayload?: WarehouseUpdatePayloadResolvers<ContextType>;
}>;

