export const coreSchema = `
"""
Directs the executor to defer this fragment when the ` + "`if`" + ` argument is true or undefined.
"""
directive @defer(
  """Deferred when true or undefined."""
  if: Boolean = true

  """Unique name"""
  label: String
) on FRAGMENT_SPREAD | INLINE_FRAGMENT

directive @goExtraField(name: String, type: String!, overrideTags: String, description: String) on OBJECT | INPUT_OBJECT

directive @goField(forceResolver: Boolean, name: String, omittable: Boolean) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION

directive @goModel(model: String, models: [String!], forceGenerate: Boolean) on OBJECT | INPUT_OBJECT | SCALAR | ENUM | INTERFACE | UNION

directive @goTag(key: String!, value: String) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION

scalar Any

type Context {
  project: Project
  tenant: User
  customer: Customer
}

type Currency {
  code: String!
  isActive: Boolean!
  exchangeRate: Float!
}

type Customer {
  createdAt: Timestamp!
  email: String!
  firstName: String!
  id: ID!
  isBlocked: Boolean!
  isVerified: Boolean!
  language: String
  lastName: String!
  phone: String
  updatedAt: Timestamp!
}

enum DimensionUnit {
  MM
  CM
  M
  IN
}

enum EntityStatus {
  PUBLISHED
  DRAFT
  ARCHIVED
}

enum FeatureStyleType {
  RADIO
  DROPDOWN
  VARIANT_COVER
  SWATCH
  APPAREL_SIZE
}

type FeatureSwatch {
  id: ID!
  color1: String
  color2: String
  image: File
  type: FeatureSwatchType!
}

enum FeatureSwatchType {
  COLOR
  COLOR_DUO
  IMAGE
}

type File {
  id: ID!
  driver: FileDriver!
  name: String!
  url: String!
  size: Int!
  ext: String!
  key: String!
  createdAt: Timestamp!
  updatedAt: Timestamp!
}

enum FileDriver {
  LOCAL
  S3
  YTB
  URL
}

scalar FilterV2

type Locale {
  code: String!
  isActive: Boolean!
}

type LocalizedString {
  locale: String!
  value: String!
}

type Product {
  createdAt: Timestamp!
  groups: [ProductGroup!]!
  id: ID!
  primaryCategory: ID
  requiresShipping: Boolean
  slug: String!
  status: EntityStatus!
  title: String!
  titleI18n: [LocalizedString!]!
  updatedAt: Timestamp!
  variants: [Variant!]!
}

type ProductGroup {
  id: ID!
  title: String!
  items: [ProductGroupItem!]!
  isRequired: Boolean!
  isMultiple: Boolean!
  sortIndex: Int!
}

type ProductGroupItem {
  id: ID!
  variant: Variant!
  sortIndex: Int!
  priceType: ProductGroupPriceType!
  priceAmountValue: Int
  pricePercentageValue: Float
  maxQuantity: Int
}

enum ProductGroupPriceType {
  FREE
  BASE
  BASE_ADJUST_AMOUNT
  BASE_ADJUST_PERCENT
  BASE_OVERRIDE
}

type ProductOption {
  title: String!
  slug: String!
  swatch: FeatureSwatch
  group: ProductOptionGroup!
  sortIndex: Int
  featureId: ID!
}

type ProductOptionGroup {
  id: ID!
  slug: String!
  title: String!
  featureStyleType: FeatureStyleType!
}

type Project {
  country: String!
  currency: String!
  email: String!
  id: ID!
  locale: String!
  name: String!
  phoneNumber: String!
  timezone: String!
  locales: [Locale!]!
  currencies: [Currency!]!
  stockStatuses: [StockStatus!]!
}

enum ProjectStatus {
  ACTIVE
  INACTIVE
}

type Query {
  context: Context!
  product(id: ID!): Product
  products(ids: [ID!]!): [Product!]!
  variant(id: ID!): Variant
  variants(ids: [ID!]!): [Variant!]!
}

type StockStatus {
  code: String!
}

type Tag {
  id: ID!
  slug: String!
  title: String!
  color: String
}

scalar Timestamp

enum TranslationField {
  TITLE
  DESCRIPTION_TEXT
  DESCRIPTION_HTML
  DESCRIPTION_JSON
  EXCERPT_TEXT
  SEO_TITLE
  SEO_DESCRIPTION
}

scalar Uint

enum UnitSystem {
  IMPERIAL
  METRIC
}

scalar Upload

type User {
  createdAt: Timestamp!
  tenantId: ID!
  email: String!
  firstName: String!
  id: String!
  isReady: Boolean!
  isVerified: Boolean!
  language: String!
  lastName: String!
  phoneNumber: String
  timezone: String!
  updatedAt: Timestamp!
}

scalar Uuid

type Variant {
  barcode: String
  costPrice: Int
  cover: File
  createdAt: Timestamp!
  dimensionUnit: DimensionUnit
  gallery(limit: Int = 5): [File!]!
  height: Float
  id: ID!
  length: Float
  oldPrice: Int
  options: [ProductOption!]!
  price: Int!
  product: Product!
  sku: String
  slug: String!
  sortIndex: Int!
  stockStatus: String!
  title: String!
  titleI18n: [LocalizedString!]!
  updatedAt: Timestamp!
  weight: Float
  weightUnit: WeightUnit
  width: Float
}

enum WeightUnit {
  GR
  KG
  LB
  OZ
}
`;
