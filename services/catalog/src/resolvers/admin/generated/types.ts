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
  BigInt: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
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

export enum BulkUpdateCancelReason {
  Superseded = 'SUPERSEDED',
  System = 'SYSTEM',
  User = 'USER'
}

/** Single operation in bulk update job. */
export type BulkUpdateItem = {
  __typename?: 'BulkUpdateItem';
  /** Cancel reason (only for CANCELLED/SUPERSEDED). */
  cancelReason: Maybe<BulkUpdateCancelReason>;
  /** Execution errors. */
  errors: Array<BulkUpdateUserError>;
  /** When finished. */
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Item ID. */
  id: Scalars['ID']['output'];
  /** Order within product. */
  opIndex: Scalars['Int']['output'];
  /** Operation type. */
  opType: BulkUpdateOpType;
  /** Product ID. */
  productId: Scalars['ID']['output'];
  /** When started. */
  startedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateItemStatus;
  /** Job that superseded this item. */
  supersededByJobId: Maybe<Scalars['ID']['output']>;
  /** Variant ID (null for product-level operations). */
  variantId: Maybe<Scalars['ID']['output']>;
};

export type BulkUpdateItemConnection = {
  __typename?: 'BulkUpdateItemConnection';
  edges: Array<BulkUpdateItemEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BulkUpdateItemEdge = {
  __typename?: 'BulkUpdateItemEdge';
  cursor: Scalars['String']['output'];
  node: BulkUpdateItem;
};

export enum BulkUpdateItemStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED',
  Superseded = 'SUPERSEDED'
}

/** Job progress. All counters computed from items. */
export type BulkUpdateJobProgress = {
  __typename?: 'BulkUpdateJobProgress';
  /** Cancelled. */
  cancelled: Scalars['Int']['output'];
  /** Done (succeeded + failed + cancelled + superseded). */
  done: Scalars['Int']['output'];
  /** Failed. */
  failed: Scalars['Int']['output'];
  /** Pending execution. */
  pending: Scalars['Int']['output'];
  /** Currently running. */
  running: Scalars['Int']['output'];
  /** Successfully applied. */
  succeeded: Scalars['Int']['output'];
  /** Superseded by another job. */
  superseded: Scalars['Int']['output'];
  /** Total operations. */
  total: Scalars['Int']['output'];
};

export enum BulkUpdateJobStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export enum BulkUpdateOpType {
  ProductUpdate = 'PRODUCT_UPDATE',
  VariantUpdate = 'VARIANT_UPDATE'
}

/** Bulk update error with operation context. */
export type BulkUpdateUserError = UserError & {
  __typename?: 'BulkUpdateUserError';
  /** Error code. */
  code: Maybe<Scalars['String']['output']>;
  /** Input field path. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Error message. */
  message: Scalars['String']['output'];
  /** Operation that failed. */
  operation: Maybe<Scalars['String']['output']>;
  /** Product ID. */
  productId: Maybe<Scalars['ID']['output']>;
  /** Variant ID. */
  variantId: Maybe<Scalars['ID']['output']>;
};

export type CatalogMutation = {
  __typename?: 'CatalogMutation';
  categoryCreate: CategoryCreatePayload;
  categoryDelete: CategoryDeletePayload;
  categoryMove: CategoryMovePayload;
  categoryUpdate: CategoryUpdatePayload;
  /**
   * Start async bulk update.
   * Requires X-Idempotency-Key header.
   */
  productBulkUpdate: ProductBulkUpdatePayload;
  productCreate: ProductCreatePayload;
  productDelete: ProductDeletePayload;
  productFeatureCreate: ProductFeatureCreatePayload;
  productFeatureDelete: ProductFeatureDeletePayload;
  productFeatureUpdate: ProductFeatureUpdatePayload;
  productFeaturesSync: ProductFeaturesSyncPayload;
  productOptionCreate: ProductOptionCreatePayload;
  productOptionDelete: ProductOptionDeletePayload;
  productOptionUpdate: ProductOptionUpdatePayload;
  /**
   * Sync all product options. This is a complete replace operation.
   * Options not in the input list will be deleted.
   * Does NOT affect variants - only option definitions are synced.
   */
  productOptionsSync: ProductOptionsSyncPayload;
  /**
   * Unified product update with optimistic locking.
   * Supports product and variant updates in a single request.
   */
  productUpdate: ProductUpdatePayload;
  productUpdateStatus: ProductUpdateStatusPayload;
  tagCreate: TagCreatePayload;
  tagDelete: TagDeletePayload;
  tagUpdate: TagUpdatePayload;
  variantCreate: VariantCreatePayload;
  variantDelete: VariantDeletePayload;
  variantUpdateMedia: VariantUpdateMediaPayload;
  variantUpdateOptions: VariantUpdateOptionsPayload;
  variantUpdatePricing: VariantUpdatePricingPayload;
};


export type CatalogMutationCategoryCreateArgs = {
  input: CategoryCreateInput;
};


export type CatalogMutationCategoryDeleteArgs = {
  input: CategoryDeleteInput;
};


export type CatalogMutationCategoryMoveArgs = {
  input: CategoryMoveInput;
};


export type CatalogMutationCategoryUpdateArgs = {
  input: CategoryUpdateInput;
};


export type CatalogMutationProductBulkUpdateArgs = {
  input: ProductBulkUpdateInput;
};


export type CatalogMutationProductCreateArgs = {
  input: ProductCreateInput;
};


export type CatalogMutationProductDeleteArgs = {
  input: ProductDeleteInput;
};


export type CatalogMutationProductFeatureCreateArgs = {
  input: ProductFeatureCreateInput;
};


export type CatalogMutationProductFeatureDeleteArgs = {
  input: ProductFeatureDeleteInput;
};


export type CatalogMutationProductFeatureUpdateArgs = {
  input: ProductFeatureUpdateInput;
};


export type CatalogMutationProductFeaturesSyncArgs = {
  input: ProductFeaturesSyncInput;
};


export type CatalogMutationProductOptionCreateArgs = {
  input: ProductOptionCreateInput;
};


export type CatalogMutationProductOptionDeleteArgs = {
  input: ProductOptionDeleteInput;
};


export type CatalogMutationProductOptionUpdateArgs = {
  input: ProductOptionUpdateInput;
};


export type CatalogMutationProductOptionsSyncArgs = {
  input: ProductOptionsSyncInput;
};


export type CatalogMutationProductUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ProductUpdateInput>;
  productId: Scalars['ID']['input'];
};


export type CatalogMutationProductUpdateStatusArgs = {
  input: ProductUpdateStatusInput;
};


export type CatalogMutationTagCreateArgs = {
  input: TagCreateInput;
};


export type CatalogMutationTagDeleteArgs = {
  input: TagDeleteInput;
};


export type CatalogMutationTagUpdateArgs = {
  input: TagUpdateInput;
};


export type CatalogMutationVariantCreateArgs = {
  input: VariantCreateInput;
};


export type CatalogMutationVariantDeleteArgs = {
  input: VariantDeleteInput;
};


export type CatalogMutationVariantUpdateMediaArgs = {
  input: VariantUpdateMediaInput;
};


export type CatalogMutationVariantUpdateOptionsArgs = {
  input: VariantUpdateOptionsInput;
};


export type CatalogMutationVariantUpdatePricingArgs = {
  input: VariantUpdatePricingInput;
};

export type CatalogQuery = {
  __typename?: 'CatalogQuery';
  /** Get categories with Relay-style pagination */
  categories: CategoryConnection;
  /** Get a category by ID */
  category: Maybe<Category>;
  /** Get a node by its global ID */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
  /** Get a product by ID */
  product: Maybe<Product>;
  /** Get bulk update job by ID. */
  productBulkUpdateJob: Maybe<ProductBulkUpdateJob>;
  /** Get products with Relay-style pagination */
  products: ProductConnection;
  /** Get a tag by ID */
  tag: Maybe<Tag>;
  /** Get tags with Relay-style pagination */
  tags: TagConnection;
  /** Get a variant by ID */
  variant: Maybe<Variant>;
  /** Get variants with Relay-style pagination */
  variants: VariantConnection;
};


export type CatalogQueryCategoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CatalogQueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type CatalogQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryProductBulkUpdateJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type CatalogQueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CatalogQueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CatalogQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A category represents a hierarchical grouping of products. */
export type Category = Node & {
  __typename?: 'Category';
  /** All ancestor categories from root to parent. */
  ancestors: Array<Category>;
  /** Direct child categories. */
  children: Array<Category>;
  /** The date and time when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the category was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** The depth of this category in the hierarchy (0 for root). */
  depth: Scalars['Int']['output'];
  /** The category description. */
  description: Maybe<Description>;
  /** The URL-friendly handle for the category. */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the category. */
  id: Scalars['ID']['output'];
  /** Whether the category is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Media files associated with this category. */
  media: Array<CategoryMediaItem>;
  /** The display name of the category. */
  name: Scalars['String']['output'];
  /** The parent category, if any. */
  parent: Maybe<Category>;
  /** The materialized path for this category. */
  path: Scalars['String']['output'];
  /** Products in this category with pagination. */
  products: ProductConnection;
  /** The total number of products in this category. */
  productsCount: Scalars['Int']['output'];
  /** The date and time when the category was published, or null if unpublished. */
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  /** The date and time when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A category represents a hierarchical grouping of products. */
export type CategoryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Category items. */
export type CategoryConnection = {
  __typename?: 'CategoryConnection';
  /** A list of edges. */
  edges: Array<CategoryEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of categories. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a category. */
export type CategoryCreateInput = {
  /** Optional description. */
  description?: InputMaybe<DescriptionInput>;
  /** The URL-friendly handle for the category. */
  handle: Scalars['String']['input'];
  /** File IDs for category media. */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The display name of the category. */
  name: Scalars['String']['input'];
  /** Optional parent category ID. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** Whether to publish immediately. */
  publish?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for category creation. */
export type CategoryCreatePayload = {
  __typename?: 'CategoryCreatePayload';
  /** The created category. */
  category: Maybe<Category>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a category. */
export type CategoryDeleteInput = {
  /** The ID of the category to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for category deletion. */
export type CategoryDeletePayload = {
  __typename?: 'CategoryDeletePayload';
  /** The ID of the deleted category. */
  deletedCategoryId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Category connection. */
export type CategoryEdge = {
  __typename?: 'CategoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Category;
};

/** A media item for a category. */
export type CategoryMediaItem = {
  __typename?: 'CategoryMediaItem';
  /** The file reference. */
  file: File;
  /** The sort index for ordering. */
  sortIndex: Scalars['Int']['output'];
};

/** Input for moving a category in the hierarchy. */
export type CategoryMoveInput = {
  /** The ID of the category to move. */
  id: Scalars['ID']['input'];
  /** The new parent category ID, or null for root. */
  newParentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Payload for category move. */
export type CategoryMovePayload = {
  __typename?: 'CategoryMovePayload';
  /** The moved category. */
  category: Maybe<Category>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating a category. */
export type CategoryUpdateInput = {
  /** The category description. */
  description?: InputMaybe<DescriptionInput>;
  /** The URL-friendly handle for the category. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the category to update. */
  id: Scalars['ID']['input'];
  /** File IDs for category media (replaces existing). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The display name of the category. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for category update. */
export type CategoryUpdatePayload = {
  __typename?: 'CategoryUpdatePayload';
  /** The updated category. */
  category: Maybe<Category>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = 'AED',
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = 'AFN',
  /** Albanian Lek (Albania) - 0 decimals */
  All = 'ALL',
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = 'AMD',
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = 'ANG',
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = 'AOA',
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = 'ARS',
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = 'AUD',
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = 'AWG',
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = 'AZN',
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = 'BAM',
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = 'BBD',
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = 'BDT',
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = 'BGN',
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = 'BHD',
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = 'BIF',
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = 'BMD',
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = 'BND',
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = 'BOB',
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = 'BRL',
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = 'BSD',
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = 'BTN',
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = 'BWP',
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = 'BYN',
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = 'BZD',
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = 'CAD',
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = 'CDF',
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = 'CHF',
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = 'CLP',
  /** Chinese Yuan (China) - 2 decimals */
  Cny = 'CNY',
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = 'COP',
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = 'CRC',
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = 'CUP',
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = 'CVE',
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = 'CZK',
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = 'DJF',
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = 'DKK',
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = 'DOP',
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = 'DZD',
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = 'EGP',
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = 'ERN',
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = 'ETB',
  /** Euro (European Union) - 2 decimals */
  Eur = 'EUR',
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = 'FJD',
  /** Falkland Islands Pound - 2 decimals */
  Fkp = 'FKP',
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = 'FOK',
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = 'GBP',
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = 'GEL',
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = 'GGP',
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = 'GHS',
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = 'GIP',
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = 'GMD',
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = 'GNF',
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = 'GTQ',
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = 'GYD',
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = 'HKD',
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = 'HNL',
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = 'HRK',
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = 'HTG',
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = 'HUF',
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = 'IDR',
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = 'ILS',
  /** Isle of Man Pound - 2 decimals */
  Imp = 'IMP',
  /** Indian Rupee (India) - 2 decimals */
  Inr = 'INR',
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = 'IQD',
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = 'IRR',
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = 'ISK',
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = 'JEP',
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = 'JMD',
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = 'JOD',
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = 'JPY',
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = 'KES',
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = 'KGS',
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = 'KHR',
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = 'KMF',
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = 'KPW',
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = 'KRW',
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = 'KWD',
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = 'KYD',
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = 'KZT',
  /** Lao Kip (Laos) - 2 decimals */
  Lak = 'LAK',
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = 'LBP',
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = 'LKR',
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = 'LRD',
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = 'LSL',
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = 'LYD',
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = 'MAD',
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = 'MDL',
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = 'MGA',
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = 'MKD',
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = 'MMK',
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = 'MNT',
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = 'MOP',
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = 'MRU',
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = 'MUR',
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = 'MVR',
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = 'MWK',
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = 'MXN',
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = 'MYR',
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = 'MZN',
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = 'NAD',
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = 'NGN',
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = 'NIO',
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = 'NOK',
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = 'NPR',
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = 'NZD',
  /** Omani Rial (Oman) - 3 decimals */
  Omr = 'OMR',
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = 'PAB',
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = 'PEN',
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = 'PGK',
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = 'PHP',
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = 'PKR',
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = 'PLN',
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = 'PYG',
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = 'QAR',
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = 'RON',
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = 'RSD',
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = 'RUB',
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = 'RWF',
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = 'SAR',
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = 'SBD',
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = 'SCR',
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = 'SDG',
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = 'SEK',
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = 'SGD',
  /** Saint Helena Pound - 2 decimals */
  Shp = 'SHP',
  /** Sierra Leonean Leone - 2 decimals */
  Sle = 'SLE',
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = 'SOS',
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = 'SRD',
  /** South Sudanese Pound - 2 decimals */
  Ssp = 'SSP',
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = 'STN',
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = 'SVC',
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = 'SYP',
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = 'SZL',
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = 'THB',
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = 'TJS',
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = 'TMT',
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = 'TND',
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = 'TOP',
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = 'TRY',
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = 'TTD',
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = 'TWD',
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = 'TZS',
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = 'UAH',
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = 'UGX',
  /** United States Dollar (USA) - 2 decimals */
  Usd = 'USD',
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = 'UYU',
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = 'UZS',
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = 'VES',
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = 'VND',
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = 'VUV',
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = 'WST',
  /** Central African CFA Franc - 0 decimals */
  Xaf = 'XAF',
  /** East Caribbean Dollar - 2 decimals */
  Xcd = 'XCD',
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = 'XDR',
  /** West African CFA Franc - 0 decimals */
  Xof = 'XOF',
  /** CFP Franc - 0 decimals */
  Xpf = 'XPF',
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = 'YER',
  /** South African Rand (South Africa) - 2 decimals */
  Zar = 'ZAR',
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = 'ZMW',
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = 'ZWL'
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

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = 'cm',
  /** Foot */
  Ft = 'ft',
  /** Inch */
  In = 'in',
  /** Meter */
  M = 'm',
  /** Millimeter */
  Mm = 'mm'
}

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

/** Inventory tracking settings for product creation. */
export type InventoryItemInput = {
  /** Allow sales when stock is zero. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Stock Keeping Unit. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Whether to track inventory for this product. */
  tracked: Scalars['Boolean']['input'];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = 'ak',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Assamese */
  As = 'as',
  /** Azerbaijani */
  Az = 'az',
  /** Belarusian */
  Be = 'be',
  /** Bulgarian */
  Bg = 'bg',
  /** Bambara */
  Bm = 'bm',
  /** Bangla */
  Bn = 'bn',
  /** Tibetan */
  Bo = 'bo',
  /** Breton */
  Br = 'br',
  /** Bosnian */
  Bs = 'bs',
  /** Catalan */
  Ca = 'ca',
  /** Chechen */
  Ce = 'ce',
  /** Central Kurdish */
  Ckb = 'ckb',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
  /** Dzongkha */
  Dz = 'dz',
  /** Ewe */
  Ee = 'ee',
  /** Greek */
  El = 'el',
  /** English */
  En = 'en',
  /** Esperanto */
  Eo = 'eo',
  /** Spanish */
  Es = 'es',
  /** Estonian */
  Et = 'et',
  /** Basque */
  Eu = 'eu',
  /** Persian */
  Fa = 'fa',
  /** Fulah */
  Ff = 'ff',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** Faroese */
  Fo = 'fo',
  /** French */
  Fr = 'fr',
  /** Western Frisian */
  Fy = 'fy',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Manx */
  Gv = 'gv',
  /** Hausa */
  Ha = 'ha',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Interlingua */
  Ia = 'ia',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Sichuan Yi */
  Ii = 'ii',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Javanese */
  Jv = 'jv',
  /** Georgian */
  Ka = 'ka',
  /** Kikuyu */
  Ki = 'ki',
  /** Kazakh */
  Kk = 'kk',
  /** Kalaallisut */
  Kl = 'kl',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kashmiri */
  Ks = 'ks',
  /** Kurdish */
  Ku = 'ku',
  /** Cornish */
  Kw = 'kw',
  /** Kyrgyz */
  Ky = 'ky',
  /** Luxembourgish */
  Lb = 'lb',
  /** Ganda */
  Lg = 'lg',
  /** Lingala */
  Ln = 'ln',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Luba-Katanga */
  Lu = 'lu',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Māori */
  Mi = 'mi',
  /** Macedonian */
  Mk = 'mk',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Maltese */
  Mt = 'mt',
  /** Burmese */
  My = 'my',
  /** Norwegian Bokmål */
  Nb = 'nb',
  /** North Ndebele */
  Nd = 'nd',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian Nynorsk */
  Nn = 'nn',
  /** Norwegian */
  No = 'no',
  /** Oromo */
  Om = 'om',
  /** Odia */
  Or = 'or',
  /** Ossetic */
  Os = 'os',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Brazil) */
  PtBr = 'pt_BR',
  /** Portuguese (Portugal) */
  PtPt = 'pt_PT',
  /** Quechua */
  Qu = 'qu',
  /** Romansh */
  Rm = 'rm',
  /** Rundi */
  Rn = 'rn',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Kinyarwanda */
  Rw = 'rw',
  /** Sanskrit */
  Sa = 'sa',
  /** Sardinian */
  Sc = 'sc',
  /** Sindhi */
  Sd = 'sd',
  /** Northern Sami */
  Se = 'se',
  /** Sango */
  Sg = 'sg',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Shona */
  Sn = 'sn',
  /** Somali */
  So = 'so',
  /** Albanian */
  Sq = 'sq',
  /** Serbian */
  Sr = 'sr',
  /** Sundanese */
  Su = 'su',
  /** Swedish */
  Sv = 'sv',
  /** Swahili */
  Sw = 'sw',
  /** Tamil */
  Ta = 'ta',
  /** Telugu */
  Te = 'te',
  /** Tajik */
  Tg = 'tg',
  /** Thai */
  Th = 'th',
  /** Tigrinya */
  Ti = 'ti',
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Tatar */
  Tt = 'tt',
  /** Uyghur */
  Ug = 'ug',
  /** Ukrainian */
  Uk = 'uk',
  /** Urdu */
  Ur = 'ur',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Wolof */
  Wo = 'wo',
  /** Xhosa */
  Xh = 'xh',
  /** Yiddish */
  Yi = 'yi',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

export type Mutation = {
  __typename?: 'Mutation';
  catalogMutation: CatalogMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Result of a single operation in the unified update. */
export type OperationResult = {
  __typename?: 'OperationResult';
  /** Whether the operation was applied successfully. */
  applied: Scalars['Boolean']['output'];
  /** Errors that occurred during this operation. */
  errors: Array<GenericUserError>;
  /** The type of operation. */
  type: OperationType;
};

/** Type of operation in the unified update. */
export enum OperationType {
  ProductUpdate = 'PRODUCT_UPDATE',
  VariantUpdate = 'VARIANT_UPDATE'
}

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

/** Input for pricing widget query. */
export type PricingWidgetInput = {
  /** Pagination: cursor after. */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Currency code to filter by. */
  currency: CurrencyCode;
  /** Pagination: first N items. */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Start of the period (optional, defaults to 30 days ago). */
  from?: InputMaybe<Scalars['DateTime']['input']>;
  /** End of the period (optional, defaults to now). */
  to?: InputMaybe<Scalars['DateTime']['input']>;
  /** The variant ID to get pricing data for. */
  variantId: Scalars['ID']['input'];
};

/** Pricing widget payload with current price, cost, history and statistics. */
export type PricingWidgetPayload = {
  __typename?: 'PricingWidgetPayload';
  /** Current active cost. */
  currentCostPrice: Maybe<VariantCost>;
  /** Current active price. */
  currentPrice: Maybe<VariantPrice>;
  /** Price history for the period. */
  history: VariantPriceConnection;
  /** Computed statistics for the period. */
  statistics: VariantPriceHistoryStatistics;
};

/** A product represents an item that can be sold. */
export type Product = Node & {
  __typename?: 'Product';
  /** The categories this product belongs to. */
  categories: Array<Category>;
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
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO and Open Graph metadata. */
  seo: Maybe<ProductSeo>;
  /** The tags associated with this product. */
  tags: Array<Tag>;
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

/**
 * Bulk update input - same structure as productUpdate but for multiple products.
 * Max 100 products, 500 operations total.
 */
export type ProductBulkUpdateInput = {
  /** List of products to update with their operations. */
  products: Array<ProductBulkUpdateItem>;
};

/** A single product's update within a bulk request. */
export type ProductBulkUpdateItem = {
  /** Expected revision for optimistic locking. If provided, fails if product was modified. */
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  /** Product-level operations. */
  operations?: InputMaybe<ProductUpdateInput>;
  /** The product ID to update. */
  productId: Scalars['ID']['input'];
};

/** Bulk update job with progress. */
export type ProductBulkUpdateJob = {
  __typename?: 'ProductBulkUpdateJob';
  /** When created. */
  createdAt: Scalars['DateTime']['output'];
  /** When finished. */
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Job ID. */
  id: Scalars['ID']['output'];
  /** Items with pagination and filtering. */
  items: BulkUpdateItemConnection;
  /** Progress computed from items. */
  progress: BulkUpdateJobProgress;
  /** When started running. */
  startedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateJobStatus;
  /** Total products in batch. */
  totalProducts: Scalars['Int']['output'];
};


/** Bulk update job with progress. */
export type ProductBulkUpdateJobItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statusFilter?: InputMaybe<Array<BulkUpdateItemStatus>>;
};

/** Result of bulk update start/cancel. */
export type ProductBulkUpdatePayload = {
  __typename?: 'ProductBulkUpdatePayload';
  /** Created or updated job (null on validation error). */
  job: Maybe<ProductBulkUpdateJob>;
  /** Validation/execution errors. */
  userErrors: Array<BulkUpdateUserError>;
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

/** Input for product content (description, excerpt). */
export type ProductContentInput = {
  /** Product description in multiple formats. */
  description?: InputMaybe<DescriptionInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a product with all its data in one request. */
export type ProductCreateInput = {
  /** Product description. */
  description?: InputMaybe<DescriptionInput>;
  /** URL-friendly handle for the product. */
  handle: Scalars['String']['input'];
  /** Inventory tracking settings for the product. */
  inventoryItem?: InputMaybe<InventoryItemInput>;
  /** File IDs for product media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Product options (e.g., Color, Size). */
  options?: InputMaybe<Array<ProductCreateOptionInput>>;
  /** Product title. */
  title: Scalars['String']['input'];
  /** Variants to create (only enabled ones from UI). */
  variants?: InputMaybe<Array<ProductCreateVariantInput>>;
};

/** Input for creating an option during product creation. */
export type ProductCreateOptionInput = {
  /** How to display the option (default: DROPDOWN). */
  displayType?: InputMaybe<Scalars['String']['input']>;
  /** Display name for the option. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** The values for this option. */
  values: Array<ProductCreateOptionValueInput>;
};

/** Input for creating an option value during product creation. */
export type ProductCreateOptionValueInput = {
  /** Display name for the value. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
};

/** Payload for product creation. */
export type ProductCreatePayload = {
  __typename?: 'ProductCreatePayload';
  /** The created product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for creating a variant during product creation. */
export type ProductCreateVariantInput = {
  /** Handle built from option value slugs (e.g., "red-s"). */
  handle: Scalars['String']['input'];
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

/** A product feature represents either a group or an attribute. */
export type ProductFeature = Node & {
  __typename?: 'ProductFeature';
  /** Child features. Returns empty array for attributes (isGroup = false). */
  children: Array<ProductFeature>;
  /** The globally unique ID of the feature. */
  id: Scalars['ID']['output'];
  /** Tree position as array: [0] for root, [0, 1] for child of first group. */
  index: Array<Scalars['Int']['output']>;
  /** Whether this feature is a group (container) or an attribute (leaf). */
  isGroup: Scalars['Boolean']['output'];
  /** Display name (from translations). */
  name: Scalars['String']['output'];
  /** Parent group, if this feature belongs to a group. */
  parent: Maybe<ProductFeature>;
  /** Values. Returns empty array for groups (isGroup = true). */
  values: Array<ProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ProductFeatureCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
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

export type ProductFeatureSyncItemInput = {
  /**
   * Database ID. Null for new records.
   * - If provided: update existing feature
   * - If null/omitted: create new feature (backend generates ID)
   * Features in DB but not in this list will be DELETED.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Tree position as integer array.
   * - [0], [1], [2] for root items
   * - [0, 0], [0, 1], [1, 0] for children
   * Parent is derived: parent of [0, 1] is [0].
   * Groups must have length 1 (root only).
   */
  index: Array<Scalars['Int']['input']>;
  /** Whether this is a group (true) or attribute (false). */
  isGroup: Scalars['Boolean']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /** Values for this feature (only when isGroup = false). */
  values?: InputMaybe<Array<ProductFeatureValueSyncInput>>;
};

/** Input for updating a feature. */
export type ProductFeatureUpdateInput = {
  /** The ID of the feature to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
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
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars['Int']['output'];
  /** Display name (from translations). */
  name: Scalars['String']['output'];
};

/** Input for creating a feature value. */
export type ProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
};

export type ProductFeatureValueSyncInput = {
  /** Database ID. Null for new records. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars['Int']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
};

/** Input for updating an existing feature value. */
export type ProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
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

/** Sync all product features in a single transaction. */
export type ProductFeaturesSyncInput = {
  /** Complete list of features (replaces all existing features). */
  features: Array<ProductFeatureSyncItemInput>;
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
};

export type ProductFeaturesSyncPayload = {
  __typename?: 'ProductFeaturesSyncPayload';
  /** List of all synced features with their final IDs. */
  features: Array<ProductFeature>;
  /** The updated product. */
  product: Maybe<Product>;
  /** Any validation errors. */
  userErrors: Array<GenericUserError>;
};

/** Input for product media. */
export type ProductMediaInput = {
  /** File IDs for product media. */
  fileIds: Array<Scalars['ID']['input']>;
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

/** Input for syncing a single option. */
export type ProductOptionSyncItemInput = {
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** Existing option ID (null = create new). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Position in the options list (0, 1, 2...). */
  index: Scalars['Int']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** The values for this option. */
  values: Array<ProductOptionValueSyncInput>;
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

/** Input for syncing a single option value. */
export type ProductOptionValueSyncInput = {
  /** Existing value ID (null = create new). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Position within the option (0, 1, 2...). */
  index: Scalars['Int']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** The swatch for this value (null to remove). */
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

/** Input for syncing all product options. */
export type ProductOptionsSyncInput = {
  /** Complete list of options (replaces existing). */
  options: Array<ProductOptionSyncItemInput>;
  /** The product to sync options for. */
  productId: Scalars['ID']['input'];
};

/** Payload for options sync mutation. */
export type ProductOptionsSyncPayload = {
  __typename?: 'ProductOptionsSyncPayload';
  /** All synced options with final IDs. */
  options: Array<ProductOption>;
  /** The product with updated options. */
  product: Maybe<Product>;
  /** List of errors that occurred. */
  userErrors: Array<GenericUserError>;
};

/** SEO and Open Graph metadata for a product. */
export type ProductSeo = {
  __typename?: 'ProductSeo';
  /** Open Graph description for social media sharing. */
  ogDescription: Maybe<Scalars['String']['output']>;
  /** Open Graph image for social media sharing. */
  ogImage: Maybe<File>;
  /** Open Graph title for social media sharing (max 95 chars). */
  ogTitle: Maybe<Scalars['String']['output']>;
  /** SEO description for search engines (max 160 chars). */
  seoDescription: Maybe<Scalars['String']['output']>;
  /** SEO title for search engines (max 70 chars). */
  seoTitle: Maybe<Scalars['String']['output']>;
};

/** Input for updating product SEO data. */
export type ProductSeoInput = {
  /** Open Graph description. */
  ogDescription?: InputMaybe<Scalars['String']['input']>;
  /** Open Graph image file ID. */
  ogImageId?: InputMaybe<Scalars['ID']['input']>;
  /** Open Graph title (max 95 chars). */
  ogTitle?: InputMaybe<Scalars['String']['input']>;
  /** SEO description (max 160 chars). */
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  /** SEO title (max 70 chars). */
  seoTitle?: InputMaybe<Scalars['String']['input']>;
};

export enum ProductStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export enum ProductStatusAction {
  Publish = 'PUBLISH',
  Unpublish = 'UNPUBLISH'
}

/** Input for product-level fields in the unified update. */
export type ProductUpdateInput = {
  /** Product content (description, excerpt). */
  content?: InputMaybe<ProductContentInput>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Product media. */
  media?: InputMaybe<ProductMediaInput>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ProductSeoInput>;
  /** Product status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Product title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Variant updates. */
  variants?: InputMaybe<Array<VariantUpdateInput>>;
};

/** Payload for the unified product update mutation. */
export type ProductUpdatePayload = {
  __typename?: 'ProductUpdatePayload';
  /** Results of each operation. */
  operationResults: Array<OperationResult>;
  /** The updated product with new revision. */
  product: Maybe<Product>;
  /** All errors from all operations. */
  userErrors: Array<GenericUserError>;
};

/**
 * Input for updating product status (publish or unpublish).
 * Reused in bulk operations.
 */
export type ProductUpdateStatusInput = {
  /** Action: PUBLISH or UNPUBLISH. */
  action: ProductStatusAction;
  /** Product ID. */
  productId: Scalars['ID']['input'];
};

/** Payload for product update status. */
export type ProductUpdateStatusPayload = {
  __typename?: 'ProductUpdateStatusPayload';
  /** The updated product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

export type Query = {
  __typename?: 'Query';
  catalogQuery: CatalogQuery;
  widgetQuery: WidgetQuery;
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

/** A tag represents a simple label for organizing and filtering products. */
export type Tag = Node & {
  __typename?: 'Tag';
  /** The date and time when the tag was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The URL-friendly handle for the tag. */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the tag. */
  id: Scalars['ID']['output'];
  /** The display name of the tag. */
  name: Scalars['String']['output'];
  /** Products with this tag, with pagination. */
  products: ProductConnection;
  /** The total number of products with this tag. */
  productsCount: Scalars['Int']['output'];
};


/** A tag represents a simple label for organizing and filtering products. */
export type TagProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Tag items. */
export type TagConnection = {
  __typename?: 'TagConnection';
  /** A list of edges. */
  edges: Array<TagEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of tags. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a tag. */
export type TagCreateInput = {
  /** The URL-friendly handle for the tag. */
  handle: Scalars['String']['input'];
  /** The display name of the tag (optional, defaults to handle). */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag creation. */
export type TagCreatePayload = {
  __typename?: 'TagCreatePayload';
  /** The created tag. */
  tag: Maybe<Tag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a tag. */
export type TagDeleteInput = {
  /** The ID of the tag to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for tag deletion. */
export type TagDeletePayload = {
  __typename?: 'TagDeletePayload';
  /** The ID of the deleted tag. */
  deletedTagId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Tag connection. */
export type TagEdge = {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Tag;
};

/** Input for updating a tag. */
export type TagUpdateInput = {
  /** The URL-friendly handle for the tag. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag to update. */
  id: Scalars['ID']['input'];
  /** The display name of the tag. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag update. */
export type TagUpdatePayload = {
  __typename?: 'TagUpdatePayload';
  /** The updated tag. */
  tag: Maybe<Tag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are added via federation extend in Inventory Service.
 */
export type Variant = Node & {
  __typename?: 'Variant';
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** The external ID in the external system. */
  externalId: Maybe<Scalars['String']['output']>;
  /** The external system identifier for integration purposes. */
  externalSystem: Maybe<Scalars['String']['output']>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the variant. */
  id: Scalars['ID']['output'];
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
  /** Variant title. */
  title: Maybe<Scalars['String']['output']>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are added via federation extend in Inventory Service.
 */
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

/** Input for variant dimensions in the unified update. */
export type VariantDimensionsOpInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
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
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  /** Selected option values for the variant (required). */
  options: Array<SelectedOptionInput>;
  /** Variant title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for variant inventory in the unified update. */
export type VariantInventoryOpInput = {
  /** Currency code for unit cost. */
  costCurrency?: InputMaybe<CurrencyCode>;
  /** Quantity on hand. */
  onHand: Scalars['Int']['input'];
  /** SKU code. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Unavailable quantity (reserved, damaged, etc.). */
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  /** Unit cost in minor units (cents). */
  unitCostMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The warehouse ID. */
  warehouseId: Scalars['ID']['input'];
  /** Weight in grams. */
  weight?: InputMaybe<Scalars['Int']['input']>;
};

/** Media attached to a variant with sort order. */
export type VariantMediaItem = {
  __typename?: 'VariantMediaItem';
  /** The file from the Media service. */
  file: File;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** Input for variant media in the unified update. */
export type VariantMediaOpInput = {
  /** File IDs for variant media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** Input for linking a variant to an option value. */
export type VariantOptionLinkInput = {
  /** The option ID. */
  optionId: Scalars['ID']['input'];
  /** The option value ID. */
  optionValueId: Scalars['ID']['input'];
};

/** Input for variant options in the unified update. */
export type VariantOptionsOpInput = {
  /** Option value links to set (replaces existing). */
  set: Array<VariantOptionLinkInput>;
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

/** Statistics for variant price history over a period. */
export type VariantPriceHistoryStatistics = {
  __typename?: 'VariantPriceHistoryStatistics';
  /** Average price over the period (minor units). */
  avgPriceMinor: Scalars['BigInt']['output'];
  /** Currency code. */
  currency: CurrencyCode;
  /** Maximum price over the period (minor units). */
  maxPriceMinor: Scalars['BigInt']['output'];
  /** Minimum price over the period (minor units). */
  minPriceMinor: Scalars['BigInt']['output'];
};

/** Input for variant pricing in the unified update. */
export type VariantPricingOpInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
};

/** Input for a single variant update. */
export type VariantUpdateInput = {
  /** Variant dimensions. */
  dimensions?: InputMaybe<VariantDimensionsOpInput>;
  /** Variant inventory (stock, SKU, weight, cost). */
  inventory?: InputMaybe<VariantInventoryOpInput>;
  /** Variant media. */
  media?: InputMaybe<VariantMediaOpInput>;
  /** Variant options. */
  options?: InputMaybe<VariantOptionsOpInput>;
  /** Variant pricing. */
  pricing?: InputMaybe<VariantPricingOpInput>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Input for updating variant media (replaces all existing media). */
export type VariantUpdateMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars['ID']['input']>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant update media. */
export type VariantUpdateMediaPayload = {
  __typename?: 'VariantUpdateMediaPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for updating variant options (option value links). */
export type VariantUpdateOptionsInput = {
  /** The option value links to set (replaces existing links). */
  links: Array<VariantOptionLinkInput>;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant options update. */
export type VariantUpdateOptionsPayload = {
  __typename?: 'VariantUpdateOptionsPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for updating a price on a variant. */
export type VariantUpdatePricingInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant pricing update. */
export type VariantUpdatePricingPayload = {
  __typename?: 'VariantUpdatePricingPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}

/** Widget query namespace for dashboard widgets. */
export type WidgetQuery = {
  __typename?: 'WidgetQuery';
  /** Get pricing widget data for a variant. */
  pricing: PricingWidgetPayload;
};


/** Widget query namespace for dashboard widgets. */
export type WidgetQueryPricingArgs = {
  input: PricingWidgetInput;
};

export type _CatalogFiltersPlaceholder = {
  __typename?: '_CatalogFiltersPlaceholder';
  _empty: Maybe<Scalars['Boolean']['output']>;
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
  Node: ( Category ) | ( Product ) | ( ProductFeature ) | ( ProductFeatureValue ) | ( ProductOption ) | ( ProductOptionSwatch ) | ( ProductOptionValue ) | ( Tag ) | ( Variant ) | ( VariantCost ) | ( VariantPrice );
  UserError: ( BulkUpdateUserError ) | ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BulkUpdateCancelReason: BulkUpdateCancelReason;
  BulkUpdateItem: ResolverTypeWrapper<BulkUpdateItem>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  BulkUpdateItemConnection: ResolverTypeWrapper<BulkUpdateItemConnection>;
  BulkUpdateItemEdge: ResolverTypeWrapper<BulkUpdateItemEdge>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  BulkUpdateItemStatus: BulkUpdateItemStatus;
  BulkUpdateJobProgress: ResolverTypeWrapper<BulkUpdateJobProgress>;
  BulkUpdateJobStatus: BulkUpdateJobStatus;
  BulkUpdateOpType: BulkUpdateOpType;
  BulkUpdateUserError: ResolverTypeWrapper<BulkUpdateUserError>;
  CatalogMutation: ResolverTypeWrapper<CatalogMutation>;
  CatalogQuery: ResolverTypeWrapper<Omit<CatalogQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  Category: ResolverTypeWrapper<Category>;
  CategoryConnection: ResolverTypeWrapper<CategoryConnection>;
  CategoryCreateInput: CategoryCreateInput;
  CategoryCreatePayload: ResolverTypeWrapper<CategoryCreatePayload>;
  CategoryDeleteInput: CategoryDeleteInput;
  CategoryDeletePayload: ResolverTypeWrapper<CategoryDeletePayload>;
  CategoryEdge: ResolverTypeWrapper<CategoryEdge>;
  CategoryMediaItem: ResolverTypeWrapper<CategoryMediaItem>;
  CategoryMoveInput: CategoryMoveInput;
  CategoryMovePayload: ResolverTypeWrapper<CategoryMovePayload>;
  CategoryUpdateInput: CategoryUpdateInput;
  CategoryUpdatePayload: ResolverTypeWrapper<CategoryUpdatePayload>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  Description: ResolverTypeWrapper<Description>;
  DescriptionInput: DescriptionInput;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryItemInput: InventoryItemInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  OperationResult: ResolverTypeWrapper<OperationResult>;
  OperationType: OperationType;
  OptionDisplayType: OptionDisplayType;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PricingWidgetInput: PricingWidgetInput;
  PricingWidgetPayload: ResolverTypeWrapper<PricingWidgetPayload>;
  Product: ResolverTypeWrapper<Product>;
  ProductBulkUpdateInput: ProductBulkUpdateInput;
  ProductBulkUpdateItem: ProductBulkUpdateItem;
  ProductBulkUpdateJob: ResolverTypeWrapper<ProductBulkUpdateJob>;
  ProductBulkUpdatePayload: ResolverTypeWrapper<ProductBulkUpdatePayload>;
  ProductConnection: ResolverTypeWrapper<ProductConnection>;
  ProductContentInput: ProductContentInput;
  ProductCreateInput: ProductCreateInput;
  ProductCreateOptionInput: ProductCreateOptionInput;
  ProductCreateOptionValueInput: ProductCreateOptionValueInput;
  ProductCreatePayload: ResolverTypeWrapper<ProductCreatePayload>;
  ProductCreateVariantInput: ProductCreateVariantInput;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ResolverTypeWrapper<ProductDeletePayload>;
  ProductEdge: ResolverTypeWrapper<ProductEdge>;
  ProductFeature: ResolverTypeWrapper<ProductFeature>;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: ResolverTypeWrapper<ProductFeatureCreatePayload>;
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: ResolverTypeWrapper<ProductFeatureDeletePayload>;
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureSyncItemInput: ProductFeatureSyncItemInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: ResolverTypeWrapper<ProductFeatureUpdatePayload>;
  ProductFeatureValue: ResolverTypeWrapper<ProductFeatureValue>;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueSyncInput: ProductFeatureValueSyncInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductFeaturesSyncInput: ProductFeaturesSyncInput;
  ProductFeaturesSyncPayload: ResolverTypeWrapper<ProductFeaturesSyncPayload>;
  ProductMediaInput: ProductMediaInput;
  ProductOption: ResolverTypeWrapper<ProductOption>;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: ResolverTypeWrapper<ProductOptionCreatePayload>;
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: ResolverTypeWrapper<ProductOptionDeletePayload>;
  ProductOptionSwatch: ResolverTypeWrapper<ProductOptionSwatch>;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionSyncItemInput: ProductOptionSyncItemInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: ResolverTypeWrapper<ProductOptionUpdatePayload>;
  ProductOptionValue: ResolverTypeWrapper<ProductOptionValue>;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueSyncInput: ProductOptionValueSyncInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductOptionsSyncInput: ProductOptionsSyncInput;
  ProductOptionsSyncPayload: ResolverTypeWrapper<ProductOptionsSyncPayload>;
  ProductSeo: ResolverTypeWrapper<ProductSeo>;
  ProductSeoInput: ProductSeoInput;
  ProductStatus: ProductStatus;
  ProductStatusAction: ProductStatusAction;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: ResolverTypeWrapper<ProductUpdatePayload>;
  ProductUpdateStatusInput: ProductUpdateStatusInput;
  ProductUpdateStatusPayload: ResolverTypeWrapper<ProductUpdateStatusPayload>;
  Query: ResolverTypeWrapper<{}>;
  SelectedOption: ResolverTypeWrapper<SelectedOption>;
  SelectedOptionInput: SelectedOptionInput;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  SwatchType: SwatchType;
  Tag: ResolverTypeWrapper<Tag>;
  TagConnection: ResolverTypeWrapper<TagConnection>;
  TagCreateInput: TagCreateInput;
  TagCreatePayload: ResolverTypeWrapper<TagCreatePayload>;
  TagDeleteInput: TagDeleteInput;
  TagDeletePayload: ResolverTypeWrapper<TagDeletePayload>;
  TagEdge: ResolverTypeWrapper<TagEdge>;
  TagUpdateInput: TagUpdateInput;
  TagUpdatePayload: ResolverTypeWrapper<TagUpdatePayload>;
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
  VariantDimensionsOpInput: VariantDimensionsOpInput;
  VariantEdge: ResolverTypeWrapper<VariantEdge>;
  VariantInput: VariantInput;
  VariantInventoryOpInput: VariantInventoryOpInput;
  VariantMediaItem: ResolverTypeWrapper<VariantMediaItem>;
  VariantMediaOpInput: VariantMediaOpInput;
  VariantOptionLinkInput: VariantOptionLinkInput;
  VariantOptionsOpInput: VariantOptionsOpInput;
  VariantPrice: ResolverTypeWrapper<VariantPrice>;
  VariantPriceConnection: ResolverTypeWrapper<VariantPriceConnection>;
  VariantPriceEdge: ResolverTypeWrapper<VariantPriceEdge>;
  VariantPriceHistoryStatistics: ResolverTypeWrapper<VariantPriceHistoryStatistics>;
  VariantPricingOpInput: VariantPricingOpInput;
  VariantUpdateInput: VariantUpdateInput;
  VariantUpdateMediaInput: VariantUpdateMediaInput;
  VariantUpdateMediaPayload: ResolverTypeWrapper<VariantUpdateMediaPayload>;
  VariantUpdateOptionsInput: VariantUpdateOptionsInput;
  VariantUpdateOptionsPayload: ResolverTypeWrapper<VariantUpdateOptionsPayload>;
  VariantUpdatePricingInput: VariantUpdatePricingInput;
  VariantUpdatePricingPayload: ResolverTypeWrapper<VariantUpdatePricingPayload>;
  WeightUnit: WeightUnit;
  WidgetQuery: ResolverTypeWrapper<WidgetQuery>;
  _CatalogFiltersPlaceholder: ResolverTypeWrapper<_CatalogFiltersPlaceholder>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  BulkUpdateItem: BulkUpdateItem;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  BulkUpdateItemConnection: BulkUpdateItemConnection;
  BulkUpdateItemEdge: BulkUpdateItemEdge;
  String: Scalars['String']['output'];
  BulkUpdateJobProgress: BulkUpdateJobProgress;
  BulkUpdateUserError: BulkUpdateUserError;
  CatalogMutation: CatalogMutation;
  CatalogQuery: Omit<CatalogQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  Category: Category;
  CategoryConnection: CategoryConnection;
  CategoryCreateInput: CategoryCreateInput;
  CategoryCreatePayload: CategoryCreatePayload;
  CategoryDeleteInput: CategoryDeleteInput;
  CategoryDeletePayload: CategoryDeletePayload;
  CategoryEdge: CategoryEdge;
  CategoryMediaItem: CategoryMediaItem;
  CategoryMoveInput: CategoryMoveInput;
  CategoryMovePayload: CategoryMovePayload;
  CategoryUpdateInput: CategoryUpdateInput;
  CategoryUpdatePayload: CategoryUpdatePayload;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Description: Description;
  DescriptionInput: DescriptionInput;
  Email: Scalars['Email']['output'];
  File: File;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryItemInput: InventoryItemInput;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  OperationResult: OperationResult;
  PageInfo: PageInfo;
  PricingWidgetInput: PricingWidgetInput;
  PricingWidgetPayload: PricingWidgetPayload;
  Product: Product;
  ProductBulkUpdateInput: ProductBulkUpdateInput;
  ProductBulkUpdateItem: ProductBulkUpdateItem;
  ProductBulkUpdateJob: ProductBulkUpdateJob;
  ProductBulkUpdatePayload: ProductBulkUpdatePayload;
  ProductConnection: ProductConnection;
  ProductContentInput: ProductContentInput;
  ProductCreateInput: ProductCreateInput;
  ProductCreateOptionInput: ProductCreateOptionInput;
  ProductCreateOptionValueInput: ProductCreateOptionValueInput;
  ProductCreatePayload: ProductCreatePayload;
  ProductCreateVariantInput: ProductCreateVariantInput;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ProductDeletePayload;
  ProductEdge: ProductEdge;
  ProductFeature: ProductFeature;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: ProductFeatureCreatePayload;
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: ProductFeatureDeletePayload;
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureSyncItemInput: ProductFeatureSyncItemInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: ProductFeatureUpdatePayload;
  ProductFeatureValue: ProductFeatureValue;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueSyncInput: ProductFeatureValueSyncInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductFeaturesSyncInput: ProductFeaturesSyncInput;
  ProductFeaturesSyncPayload: ProductFeaturesSyncPayload;
  ProductMediaInput: ProductMediaInput;
  ProductOption: ProductOption;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: ProductOptionCreatePayload;
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: ProductOptionDeletePayload;
  ProductOptionSwatch: ProductOptionSwatch;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionSyncItemInput: ProductOptionSyncItemInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: ProductOptionUpdatePayload;
  ProductOptionValue: ProductOptionValue;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueSyncInput: ProductOptionValueSyncInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductOptionsSyncInput: ProductOptionsSyncInput;
  ProductOptionsSyncPayload: ProductOptionsSyncPayload;
  ProductSeo: ProductSeo;
  ProductSeoInput: ProductSeoInput;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: ProductUpdatePayload;
  ProductUpdateStatusInput: ProductUpdateStatusInput;
  ProductUpdateStatusPayload: ProductUpdateStatusPayload;
  Query: {};
  SelectedOption: SelectedOption;
  SelectedOptionInput: SelectedOptionInput;
  StringFilter: StringFilter;
  Tag: Tag;
  TagConnection: TagConnection;
  TagCreateInput: TagCreateInput;
  TagCreatePayload: TagCreatePayload;
  TagDeleteInput: TagDeleteInput;
  TagDeletePayload: TagDeletePayload;
  TagEdge: TagEdge;
  TagUpdateInput: TagUpdateInput;
  TagUpdatePayload: TagUpdatePayload;
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
  VariantDimensionsOpInput: VariantDimensionsOpInput;
  VariantEdge: VariantEdge;
  VariantInput: VariantInput;
  VariantInventoryOpInput: VariantInventoryOpInput;
  VariantMediaItem: VariantMediaItem;
  VariantMediaOpInput: VariantMediaOpInput;
  VariantOptionLinkInput: VariantOptionLinkInput;
  VariantOptionsOpInput: VariantOptionsOpInput;
  VariantPrice: VariantPrice;
  VariantPriceConnection: VariantPriceConnection;
  VariantPriceEdge: VariantPriceEdge;
  VariantPriceHistoryStatistics: VariantPriceHistoryStatistics;
  VariantPricingOpInput: VariantPricingOpInput;
  VariantUpdateInput: VariantUpdateInput;
  VariantUpdateMediaInput: VariantUpdateMediaInput;
  VariantUpdateMediaPayload: VariantUpdateMediaPayload;
  VariantUpdateOptionsInput: VariantUpdateOptionsInput;
  VariantUpdateOptionsPayload: VariantUpdateOptionsPayload;
  VariantUpdatePricingInput: VariantUpdatePricingInput;
  VariantUpdatePricingPayload: VariantUpdatePricingPayload;
  WidgetQuery: WidgetQuery;
  _CatalogFiltersPlaceholder: _CatalogFiltersPlaceholder;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type BulkUpdateItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItem'] = ResolversParentTypes['BulkUpdateItem']> = ResolversObject<{
  cancelReason?: Resolver<Maybe<ResolversTypes['BulkUpdateCancelReason']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['BulkUpdateUserError']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  opIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  opType?: Resolver<ResolversTypes['BulkUpdateOpType'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BulkUpdateItemStatus'], ParentType, ContextType>;
  supersededByJobId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateItemConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItemConnection'] = ResolversParentTypes['BulkUpdateItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['BulkUpdateItemEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateItemEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItemEdge'] = ResolversParentTypes['BulkUpdateItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['BulkUpdateItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateJobProgressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateJobProgress'] = ResolversParentTypes['BulkUpdateJobProgress']> = ResolversObject<{
  cancelled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  done?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  running?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  succeeded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  superseded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateUserError'] = ResolversParentTypes['BulkUpdateUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  operation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  productId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CatalogMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CatalogMutation'] = ResolversParentTypes['CatalogMutation']> = ResolversObject<{
  categoryCreate?: Resolver<ResolversTypes['CategoryCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryCreateArgs, 'input'>>;
  categoryDelete?: Resolver<ResolversTypes['CategoryDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryDeleteArgs, 'input'>>;
  categoryMove?: Resolver<ResolversTypes['CategoryMovePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryMoveArgs, 'input'>>;
  categoryUpdate?: Resolver<ResolversTypes['CategoryUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryUpdateArgs, 'input'>>;
  productBulkUpdate?: Resolver<ResolversTypes['ProductBulkUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductBulkUpdateArgs, 'input'>>;
  productCreate?: Resolver<ResolversTypes['ProductCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductCreateArgs, 'input'>>;
  productDelete?: Resolver<ResolversTypes['ProductDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductDeleteArgs, 'input'>>;
  productFeatureCreate?: Resolver<ResolversTypes['ProductFeatureCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureCreateArgs, 'input'>>;
  productFeatureDelete?: Resolver<ResolversTypes['ProductFeatureDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureDeleteArgs, 'input'>>;
  productFeatureUpdate?: Resolver<ResolversTypes['ProductFeatureUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureUpdateArgs, 'input'>>;
  productFeaturesSync?: Resolver<ResolversTypes['ProductFeaturesSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeaturesSyncArgs, 'input'>>;
  productOptionCreate?: Resolver<ResolversTypes['ProductOptionCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionCreateArgs, 'input'>>;
  productOptionDelete?: Resolver<ResolversTypes['ProductOptionDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionDeleteArgs, 'input'>>;
  productOptionUpdate?: Resolver<ResolversTypes['ProductOptionUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionUpdateArgs, 'input'>>;
  productOptionsSync?: Resolver<ResolversTypes['ProductOptionsSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionsSyncArgs, 'input'>>;
  productUpdate?: Resolver<ResolversTypes['ProductUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductUpdateArgs, 'productId'>>;
  productUpdateStatus?: Resolver<ResolversTypes['ProductUpdateStatusPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductUpdateStatusArgs, 'input'>>;
  tagCreate?: Resolver<ResolversTypes['TagCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagCreateArgs, 'input'>>;
  tagDelete?: Resolver<ResolversTypes['TagDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagDeleteArgs, 'input'>>;
  tagUpdate?: Resolver<ResolversTypes['TagUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagUpdateArgs, 'input'>>;
  variantCreate?: Resolver<ResolversTypes['VariantCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantCreateArgs, 'input'>>;
  variantDelete?: Resolver<ResolversTypes['VariantDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantDeleteArgs, 'input'>>;
  variantUpdateMedia?: Resolver<ResolversTypes['VariantUpdateMediaPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdateMediaArgs, 'input'>>;
  variantUpdateOptions?: Resolver<ResolversTypes['VariantUpdateOptionsPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdateOptionsArgs, 'input'>>;
  variantUpdatePricing?: Resolver<ResolversTypes['VariantUpdatePricingPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdatePricingArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CatalogQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CatalogQuery'] = ResolversParentTypes['CatalogQuery']> = ResolversObject<{
  categories?: Resolver<ResolversTypes['CategoryConnection'], ParentType, ContextType, Partial<CatalogQueryCategoriesArgs>>;
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<CatalogQueryCategoryArgs, 'id'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<CatalogQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<CatalogQueryNodesArgs, 'ids'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<CatalogQueryProductArgs, 'id'>>;
  productBulkUpdateJob?: Resolver<Maybe<ResolversTypes['ProductBulkUpdateJob']>, ParentType, ContextType, RequireFields<CatalogQueryProductBulkUpdateJobArgs, 'jobId'>>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<CatalogQueryProductsArgs>>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<CatalogQueryTagArgs, 'id'>>;
  tags?: Resolver<ResolversTypes['TagConnection'], ParentType, ContextType, Partial<CatalogQueryTagsArgs>>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType, RequireFields<CatalogQueryVariantArgs, 'id'>>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<CatalogQueryVariantsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, { __typename: 'Category' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  ancestors?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  children?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  depth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['Description']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['CategoryMediaItem']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<CategoryProductsArgs>>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryConnection'] = ResolversParentTypes['CategoryConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CategoryEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryCreatePayload'] = ResolversParentTypes['CategoryCreatePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryDeletePayload'] = ResolversParentTypes['CategoryDeletePayload']> = ResolversObject<{
  deletedCategoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryEdge'] = ResolversParentTypes['CategoryEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMediaItem'] = ResolversParentTypes['CategoryMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMovePayload'] = ResolversParentTypes['CategoryMovePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryUpdatePayload'] = ResolversParentTypes['CategoryUpdatePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

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
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  catalogMutation?: Resolver<ResolversTypes['CatalogMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Product' | 'ProductFeature' | 'ProductFeatureValue' | 'ProductOption' | 'ProductOptionSwatch' | 'ProductOptionValue' | 'Tag' | 'Variant' | 'VariantCost' | 'VariantPrice', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type OperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OperationResult'] = ResolversParentTypes['OperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['OperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PricingWidgetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PricingWidgetPayload'] = ResolversParentTypes['PricingWidgetPayload']> = ResolversObject<{
  currentCostPrice?: Resolver<Maybe<ResolversTypes['VariantCost']>, ParentType, ContextType>;
  currentPrice?: Resolver<Maybe<ResolversTypes['VariantPrice']>, ParentType, ContextType>;
  history?: Resolver<ResolversTypes['VariantPriceConnection'], ParentType, ContextType>;
  statistics?: Resolver<ResolversTypes['VariantPriceHistoryStatistics'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
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
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  seo?: Resolver<Maybe<ResolversTypes['ProductSeo']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<ProductVariantsArgs>>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdateJobResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdateJob'] = ResolversParentTypes['ProductBulkUpdateJob']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<ResolversTypes['BulkUpdateItemConnection'], ParentType, ContextType, Partial<ProductBulkUpdateJobItemsArgs>>;
  progress?: Resolver<ResolversTypes['BulkUpdateJobProgress'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BulkUpdateJobStatus'], ParentType, ContextType>;
  totalProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdatePayload'] = ResolversParentTypes['ProductBulkUpdatePayload']> = ResolversObject<{
  job?: Resolver<Maybe<ResolversTypes['ProductBulkUpdateJob']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['BulkUpdateUserError']>, ParentType, ContextType>;
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
  children?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  index?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  isGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
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
  index?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeaturesSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeaturesSyncPayload'] = ResolversParentTypes['ProductFeaturesSyncPayload']> = ResolversObject<{
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
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

export type ProductOptionsSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionsSyncPayload'] = ResolversParentTypes['ProductOptionsSyncPayload']> = ResolversObject<{
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductSeoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductSeo'] = ResolversParentTypes['ProductSeo']> = ResolversObject<{
  ogDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ogImage?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  ogTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUpdatePayload'] = ResolversParentTypes['ProductUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['OperationResult']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUpdateStatusPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUpdateStatusPayload'] = ResolversParentTypes['ProductUpdateStatusPayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  catalogQuery?: Resolver<ResolversTypes['CatalogQuery'], ParentType, ContextType>;
  widgetQuery?: Resolver<ResolversTypes['WidgetQuery'], ParentType, ContextType>;
}>;

export type SelectedOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SelectedOption'] = ResolversParentTypes['SelectedOption']> = ResolversObject<{
  optionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionValueId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Tag']>, { __typename: 'Tag' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<TagProductsArgs>>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagConnection'] = ResolversParentTypes['TagConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['TagEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagCreatePayload'] = ResolversParentTypes['TagCreatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagDeletePayload'] = ResolversParentTypes['TagDeletePayload']> = ResolversObject<{
  deletedTagId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagEdge'] = ResolversParentTypes['TagEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Tag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagUpdatePayload'] = ResolversParentTypes['TagUpdatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BulkUpdateUserError' | 'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, { __typename: 'Variant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalSystem?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['VariantMediaItem']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['VariantPrice']>, ParentType, ContextType>;
  priceHistory?: Resolver<ResolversTypes['VariantPriceConnection'], ParentType, ContextType, Partial<VariantPriceHistoryArgs>>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  selectedOptions?: Resolver<Array<ResolversTypes['SelectedOption']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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

export type VariantPriceHistoryStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceHistoryStatistics'] = ResolversParentTypes['VariantPriceHistoryStatistics']> = ResolversObject<{
  avgPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  maxPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  minPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdateMediaPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdateMediaPayload'] = ResolversParentTypes['VariantUpdateMediaPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdateOptionsPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdateOptionsPayload'] = ResolversParentTypes['VariantUpdateOptionsPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdatePricingPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdatePricingPayload'] = ResolversParentTypes['VariantUpdatePricingPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WidgetQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WidgetQuery'] = ResolversParentTypes['WidgetQuery']> = ResolversObject<{
  pricing?: Resolver<ResolversTypes['PricingWidgetPayload'], ParentType, ContextType, RequireFields<WidgetQueryPricingArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _CatalogFiltersPlaceholderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['_CatalogFiltersPlaceholder'] = ResolversParentTypes['_CatalogFiltersPlaceholder']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  BulkUpdateItem?: BulkUpdateItemResolvers<ContextType>;
  BulkUpdateItemConnection?: BulkUpdateItemConnectionResolvers<ContextType>;
  BulkUpdateItemEdge?: BulkUpdateItemEdgeResolvers<ContextType>;
  BulkUpdateJobProgress?: BulkUpdateJobProgressResolvers<ContextType>;
  BulkUpdateUserError?: BulkUpdateUserErrorResolvers<ContextType>;
  CatalogMutation?: CatalogMutationResolvers<ContextType>;
  CatalogQuery?: CatalogQueryResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryConnection?: CategoryConnectionResolvers<ContextType>;
  CategoryCreatePayload?: CategoryCreatePayloadResolvers<ContextType>;
  CategoryDeletePayload?: CategoryDeletePayloadResolvers<ContextType>;
  CategoryEdge?: CategoryEdgeResolvers<ContextType>;
  CategoryMediaItem?: CategoryMediaItemResolvers<ContextType>;
  CategoryMovePayload?: CategoryMovePayloadResolvers<ContextType>;
  CategoryUpdatePayload?: CategoryUpdatePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Description?: DescriptionResolvers<ContextType>;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  OperationResult?: OperationResultResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PricingWidgetPayload?: PricingWidgetPayloadResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductBulkUpdateJob?: ProductBulkUpdateJobResolvers<ContextType>;
  ProductBulkUpdatePayload?: ProductBulkUpdatePayloadResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductCreatePayload?: ProductCreatePayloadResolvers<ContextType>;
  ProductDeletePayload?: ProductDeletePayloadResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  ProductFeature?: ProductFeatureResolvers<ContextType>;
  ProductFeatureCreatePayload?: ProductFeatureCreatePayloadResolvers<ContextType>;
  ProductFeatureDeletePayload?: ProductFeatureDeletePayloadResolvers<ContextType>;
  ProductFeatureUpdatePayload?: ProductFeatureUpdatePayloadResolvers<ContextType>;
  ProductFeatureValue?: ProductFeatureValueResolvers<ContextType>;
  ProductFeaturesSyncPayload?: ProductFeaturesSyncPayloadResolvers<ContextType>;
  ProductOption?: ProductOptionResolvers<ContextType>;
  ProductOptionCreatePayload?: ProductOptionCreatePayloadResolvers<ContextType>;
  ProductOptionDeletePayload?: ProductOptionDeletePayloadResolvers<ContextType>;
  ProductOptionSwatch?: ProductOptionSwatchResolvers<ContextType>;
  ProductOptionUpdatePayload?: ProductOptionUpdatePayloadResolvers<ContextType>;
  ProductOptionValue?: ProductOptionValueResolvers<ContextType>;
  ProductOptionsSyncPayload?: ProductOptionsSyncPayloadResolvers<ContextType>;
  ProductSeo?: ProductSeoResolvers<ContextType>;
  ProductUpdatePayload?: ProductUpdatePayloadResolvers<ContextType>;
  ProductUpdateStatusPayload?: ProductUpdateStatusPayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SelectedOption?: SelectedOptionResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagConnection?: TagConnectionResolvers<ContextType>;
  TagCreatePayload?: TagCreatePayloadResolvers<ContextType>;
  TagDeletePayload?: TagDeletePayloadResolvers<ContextType>;
  TagEdge?: TagEdgeResolvers<ContextType>;
  TagUpdatePayload?: TagUpdatePayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
  VariantConnection?: VariantConnectionResolvers<ContextType>;
  VariantCost?: VariantCostResolvers<ContextType>;
  VariantCostConnection?: VariantCostConnectionResolvers<ContextType>;
  VariantCostEdge?: VariantCostEdgeResolvers<ContextType>;
  VariantCreatePayload?: VariantCreatePayloadResolvers<ContextType>;
  VariantDeletePayload?: VariantDeletePayloadResolvers<ContextType>;
  VariantEdge?: VariantEdgeResolvers<ContextType>;
  VariantMediaItem?: VariantMediaItemResolvers<ContextType>;
  VariantPrice?: VariantPriceResolvers<ContextType>;
  VariantPriceConnection?: VariantPriceConnectionResolvers<ContextType>;
  VariantPriceEdge?: VariantPriceEdgeResolvers<ContextType>;
  VariantPriceHistoryStatistics?: VariantPriceHistoryStatisticsResolvers<ContextType>;
  VariantUpdateMediaPayload?: VariantUpdateMediaPayloadResolvers<ContextType>;
  VariantUpdateOptionsPayload?: VariantUpdateOptionsPayloadResolvers<ContextType>;
  VariantUpdatePricingPayload?: VariantUpdatePricingPayloadResolvers<ContextType>;
  WidgetQuery?: WidgetQueryResolvers<ContextType>;
  _CatalogFiltersPlaceholder?: _CatalogFiltersPlaceholderResolvers<ContextType>;
}>;

