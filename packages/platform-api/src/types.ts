export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Any: { input: unknown; output: unknown; }
  FilterV2: { input: any; output: any; }
  Timestamp: { input: string; output: string; }
  Uint: { input: number; output: number; }
  Upload: { input: File; output: File; }
  Uuid: { input: string; output: string; }
};

export type CoreContext = {
  __typename?: 'Context';
  customer?: Maybe<CoreCustomer>;
  project?: Maybe<CoreProject>;
  tenant?: Maybe<CoreUser>;
};

export type CoreCurrency = {
  __typename?: 'Currency';
  code: Scalars['String']['output'];
  exchangeRate: Scalars['Float']['output'];
  isActive: Scalars['Boolean']['output'];
};

export type CoreCustomer = {
  __typename?: 'Customer';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isBlocked: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  language?: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Timestamp']['output'];
};

export enum CoreDimensionUnit {
  Cm = 'CM',
  In = 'IN',
  M = 'M',
  Mm = 'MM'
}

export enum CoreEntityStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export enum CoreFeatureStyleType {
  ApparelSize = 'APPAREL_SIZE',
  Dropdown = 'DROPDOWN',
  Radio = 'RADIO',
  Swatch = 'SWATCH',
  VariantCover = 'VARIANT_COVER'
}

export type CoreFeatureSwatch = {
  __typename?: 'FeatureSwatch';
  color1?: Maybe<Scalars['String']['output']>;
  color2?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<CoreFile>;
  type: CoreFeatureSwatchType;
};

export enum CoreFeatureSwatchType {
  Color = 'COLOR',
  ColorDuo = 'COLOR_DUO',
  Image = 'IMAGE'
}

export type CoreFile = {
  __typename?: 'File';
  createdAt: Scalars['Timestamp']['output'];
  driver: CoreFileDriver;
  ext: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  url: Scalars['String']['output'];
};

export enum CoreFileDriver {
  Local = 'LOCAL',
  S3 = 'S3',
  Url = 'URL',
  Ytb = 'YTB'
}

export type CoreLocale = {
  __typename?: 'Locale';
  code: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
};

export type CoreLocalizedString = {
  __typename?: 'LocalizedString';
  locale: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type CoreProduct = {
  __typename?: 'Product';
  createdAt: Scalars['Timestamp']['output'];
  groups: Array<CoreProductGroup>;
  id: Scalars['ID']['output'];
  primaryCategory?: Maybe<Scalars['ID']['output']>;
  requiresShipping?: Maybe<Scalars['Boolean']['output']>;
  slug: Scalars['String']['output'];
  status: CoreEntityStatus;
  title: Scalars['String']['output'];
  titleI18n: Array<CoreLocalizedString>;
  updatedAt: Scalars['Timestamp']['output'];
  variants: Array<CoreVariant>;
};

export type CoreProductGroup = {
  __typename?: 'ProductGroup';
  id: Scalars['ID']['output'];
  isMultiple: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  items: Array<CoreProductGroupItem>;
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type CoreProductGroupItem = {
  __typename?: 'ProductGroupItem';
  id: Scalars['ID']['output'];
  maxQuantity?: Maybe<Scalars['Int']['output']>;
  priceAmountValue?: Maybe<Scalars['Int']['output']>;
  pricePercentageValue?: Maybe<Scalars['Float']['output']>;
  priceType: CoreProductGroupPriceType;
  sortIndex: Scalars['Int']['output'];
  variant: CoreVariant;
};

export enum CoreProductGroupPriceType {
  Base = 'BASE',
  BaseAdjustAmount = 'BASE_ADJUST_AMOUNT',
  BaseAdjustPercent = 'BASE_ADJUST_PERCENT',
  BaseOverride = 'BASE_OVERRIDE',
  Free = 'FREE'
}

export type CoreProductOption = {
  __typename?: 'ProductOption';
  featureId: Scalars['ID']['output'];
  group: CoreProductOptionGroup;
  slug: Scalars['String']['output'];
  sortIndex?: Maybe<Scalars['Int']['output']>;
  swatch?: Maybe<CoreFeatureSwatch>;
  title: Scalars['String']['output'];
};

export type CoreProductOptionGroup = {
  __typename?: 'ProductOptionGroup';
  featureStyleType: CoreFeatureStyleType;
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type CoreProject = {
  __typename?: 'Project';
  country: Scalars['String']['output'];
  currencies: Array<CoreCurrency>;
  currency: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  locales: Array<CoreLocale>;
  name: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  stockStatuses: Array<CoreStockStatus>;
  timezone: Scalars['String']['output'];
};

export enum CoreProjectStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type CoreQuery = {
  __typename?: 'Query';
  context: CoreContext;
  product?: Maybe<CoreProduct>;
  products: Array<CoreProduct>;
  variant?: Maybe<CoreVariant>;
  variants: Array<CoreVariant>;
};


export type CoreQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type CoreQueryProductsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type CoreQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type CoreQueryVariantsArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type CoreStockStatus = {
  __typename?: 'StockStatus';
  code: Scalars['String']['output'];
};

export type CoreTag = {
  __typename?: 'Tag';
  color?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export enum CoreTranslationField {
  DescriptionHtml = 'DESCRIPTION_HTML',
  DescriptionJson = 'DESCRIPTION_JSON',
  DescriptionText = 'DESCRIPTION_TEXT',
  ExcerptText = 'EXCERPT_TEXT',
  SeoDescription = 'SEO_DESCRIPTION',
  SeoTitle = 'SEO_TITLE',
  Title = 'TITLE'
}

export enum CoreUnitSystem {
  Imperial = 'IMPERIAL',
  Metric = 'METRIC'
}

export type CoreUser = {
  __typename?: 'User';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isReady: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  language: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type CoreVariant = {
  __typename?: 'Variant';
  barcode?: Maybe<Scalars['String']['output']>;
  costPrice?: Maybe<Scalars['Int']['output']>;
  cover?: Maybe<CoreFile>;
  createdAt: Scalars['Timestamp']['output'];
  dimensionUnit?: Maybe<CoreDimensionUnit>;
  gallery: Array<CoreFile>;
  height?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  length?: Maybe<Scalars['Float']['output']>;
  oldPrice?: Maybe<Scalars['Int']['output']>;
  options: Array<CoreProductOption>;
  price: Scalars['Int']['output'];
  product: CoreProduct;
  sku?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  stockStatus: Scalars['String']['output'];
  title: Scalars['String']['output'];
  titleI18n: Array<CoreLocalizedString>;
  updatedAt: Scalars['Timestamp']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
  weightUnit?: Maybe<CoreWeightUnit>;
  width?: Maybe<Scalars['Float']['output']>;
};


export type CoreVariantGalleryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export enum CoreWeightUnit {
  Gr = 'GR',
  Kg = 'KG',
  Lb = 'LB',
  Oz = 'OZ'
}
