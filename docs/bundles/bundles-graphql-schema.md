# GraphQL схема бандлов

Документ описывает целевую GraphQL-схему для бандлов. Источник модели данных:
`docs/bundles/bundles-database-schema.md`.

Ключевой принцип: bundle в Admin GraphQL API является отдельным catalog type для
продаваемой сущности, но его публичный identity остается identity продукта. На
уровне хранения он создается как `catalog.product` с `kind = BUNDLE` плюс 1:1
служебная запись в `catalog.bundle`, но `catalog.bundle` не является отдельной
GraphQL-сущностью и не получает публичный ID. `Bundle.id` всегда кодирует
`catalog.product.id` с `GlobalIdEntity.Product`. Клиент не создает bundle через
существующий `productId`: `bundleCreate` создает новый bundle sellable product и
внутренний bundle root в одной операции.
Структура бандла редактируется через scoped configuration mutations:
UI сохраняет отдельные sections/modals (groups/items, pricing templates,
dependency rules, settings), а не отправляет весь configuration tree одним
большим input.

## Принципы схемы

- `Bundle` - отдельный GraphQL type для продукта с `kind = BUNDLE`; он публикует
  product-like поля напрямую и добавляет bundle-specific поля.
- `Bundle.id` - это `Product` global ID от `catalog.product.id`; в API нет
  отдельной сущности для строки `catalog.bundle`.
- `catalog.product` / `catalog.variant` остаются общими DB-таблицами для BASE и
  BUNDLE, но API не моделирует Bundle как `Product.bundle`.
- `BundleConfiguration` - владелец структуры бандла.
- Variant не хранит структуру напрямую, а получает ее через
  `BundleConfigurationVariant`.
- Translation-таблицы не обязаны публиковаться отдельными GraphQL типами: публичное поле
  `title` резолвится из текущей locale.
- Mutation naming follows existing Catalog Admin API patterns:
  `*Create` / `*Update` / `*Delete` for ordinary entity lifecycle operations,
  and `*Sync` for complete replace operations over one bounded UI scope, matching
  the existing product options/features pattern.
- Payload мутаций возвращает измененную сущность (`bundle`, `configuration`,
  `bundleGroup`, `bundleItem`, `bundlePricingTemplate`, `dependencyRule`, scoped
  synced collections) и
  `userErrors: [GenericUserError!]!`.
- Bundle pricing API следует normalized DB-модели:
  `bundle_price_rule` хранит только `priceType`, значения лежат в
  `bundle_price_rule_amount` и `bundle_price_rule_percent`.
- Catalog Admin API должен оставаться namespace-based: bundle queries добавляются в
  `CatalogQuery`, bundle mutations - в `CatalogMutation`. Не добавлять root-level
  `Query.bundle` / `Mutation.bundleCreate`.
- Catalog service владеет `Product`, `Variant` и `Bundle`; bundle-specific поля
  публикуются на `Bundle`, а не как `Product.bundle`.
- Все bundle queries/mutations должны scope-иться по текущему project/store через
  request context. `projectId` из DB не публикуется в GraphQL.
- Для плоских catalog/listing списков, где рядом отображаются обычные продукты и
  бандлы, использовать общий GraphQL interface (`CatalogSellable`), а не union.
  `Product` и `Bundle` реализуют этот interface, поэтому UI может читать общие
  поля без дублирования inline fragments и добирать subtype-specific поля через
  `... on Product` / `... on Bundle`.
- Поля category/listing/search, которые возвращают смешанный список BASE/BUNDLE
  продаваемых сущностей, не должны называться `products`, если они могут вернуть
  `Bundle`. Использовать нейтральные имена вроде `items`, `sellables` или
  `catalogItems`.

## Product, Bundle и Variant owned field additions

Catalog service already owns `Product`, `Bundle`, and `Variant`. `Product` keeps
the discriminator so generic catalog internals can distinguish BASE/BUNDLE rows,
but `Product` does not expose a `bundle` field. Bundle-specific reads go through
the `Bundle` type and `CatalogQuery.bundle` / `CatalogQuery.bundles`. `Bundle`
uses the same public ID namespace as `Product`: a bundle ID is a `Product` global
ID whose decoded product row has `kind = BUNDLE`.

```graphql
enum ProductKind {
  BASE
  BUNDLE
}

interface CatalogSellable implements Node {
  """The Product global ID of the sellable catalog item."""
  id: ID!

  """Product discriminator."""
  kind: ProductKind!

  """The URL-friendly handle."""
  handle: String

  """Localized title."""
  title: String!

  """Media registered on this sellable item."""
  media: [ProductMediaItem!]!

  """The primary category assigned to this sellable item."""
  primaryCategory: Category

  """The tags associated with this sellable item."""
  tags: [Tag!]!

  """The total number of variants."""
  variantsCount: Int!
}

type Product implements Node & CatalogSellable @key(fields: "id") {
  # Existing catalog-owned fields stay unchanged.
  """The Product global ID."""
  id: ID!

  """Product discriminator."""
  kind: ProductKind!

  """The URL-friendly handle."""
  handle: String

  """Localized product title."""
  title: String!

  """Media registered on this product."""
  media: [ProductMediaItem!]!

  """The primary category assigned to this product."""
  primaryCategory: Category

  """The tags associated with this product."""
  tags: [Tag!]!

  """The total number of variants."""
  variantsCount: Int!
}

type Variant implements Node @key(fields: "id") {
  # Existing catalog-owned fields stay unchanged.
  """Variant discriminator. Must match parent product kind."""
  kind: ProductKind!

  """Bundle configuration assigned to this variant. Null for BASE variants."""
  bundleConfiguration: BundleConfiguration
}

```

## Bundle types

```graphql
enum BundleType {
  FIXED
  MULTIPACK
  MIX_AND_MATCH
  CUSTOM
}

enum BundleDisplayStyle {
  ACCORDION
  TABS
  FLAT
  WIZARD
}

enum BundleItemType {
  PRODUCT
  VARIANT
}

enum BundleItemOptionValueSelectionStatus {
  SELECTED
  DESELECTED
  NEW
  UNAVAILABLE
}

enum BundlePriceType {
  BASE
  FIXED
  DISCOUNT_PERCENT
  DISCOUNT_FIXED
  FREE
}

enum BundleLogicOperator {
  AND
  OR
}

enum BundleConditionCategory {
  STATE_CHECK
  NUMERIC
}

enum BundleConditionSubject {
  ITEM_SELECTED
  ITEM_QTY
  GROUP_TOTAL_QTY
}

enum BundleConditionOperator {
  IS_SELECTED
  IS_NOT_SELECTED
  GTE
  EQ
  LTE
}

enum BundleDependencyTargetType {
  ITEM
  GROUP
  BUNDLE
}

enum BundleDependencyActionType {
  SHOW
  HIDE
  SET_REQUIRED
  ADJUST_PRICE
}

type Bundle implements Node & CatalogSellable @key(fields: "id") {
  """The Product global ID of the bundle sellable item."""
  id: ID!

  """Product discriminator. Always BUNDLE for this type."""
  kind: ProductKind!

  """The URL-friendly handle for the bundle."""
  handle: String

  """The date and time when the bundle was published, or null if unpublished."""
  publishedAt: DateTime

  """Whether the bundle is currently published."""
  isPublished: Boolean!

  """The date and time when the bundle was created."""
  createdAt: DateTime!

  """The date and time when the bundle was last updated."""
  updatedAt: DateTime!

  """The date and time when the bundle was deleted (soft delete)."""
  deletedAt: DateTime

  """Optimistic locking revision number. Incremented on each update."""
  revision: Int!

  """The vendor associated with this bundle."""
  vendor: Vendor

  """The variants of this bundle."""
  variants(
    first: Int
    after: String
    last: Int
    before: String
  ): VariantConnection!

  """Media registered on this bundle."""
  media: [ProductMediaItem!]!

  """The options available for this bundle."""
  options: [ProductOption!]!

  """The features of this bundle."""
  features: [ProductFeature!]!

  """The total number of variants for this bundle."""
  variantsCount: Int!

  """The primary category assigned to this bundle."""
  primaryCategory: Category

  """Category assignments with relationship metadata."""
  categoryAssignments: [ProductCategoryAssignment!]!

  """The tags associated with this bundle."""
  tags: [Tag!]!

  """Bundle title."""
  title: String!

  """Bundle description."""
  description: RichText

  """Short excerpt."""
  excerpt: RichText

  """SEO and Open Graph metadata."""
  seo: ProductSeo

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle!

  """All bundle configurations for this bundle."""
  configurations: [BundleConfiguration!]!
}

"""
A connection to a list of Bundle items.
"""
type BundleConnection {
  """A list of edges."""
  edges: [BundleEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The total number of bundles."""
  totalCount: Int!
}

"""
An edge in a Bundle connection.
"""
type BundleEdge {
  """The item at the end of the edge."""
  node: Bundle!

  """A cursor for use in pagination."""
  cursor: String!
}

"""
A connection to a mixed list of sellable catalog items.
"""
type CatalogSellableConnection {
  """A list of edges."""
  edges: [CatalogSellableEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The total number of sellable catalog items."""
  totalCount: Int!
}

"""
An edge in a CatalogSellable connection.
"""
type CatalogSellableEdge {
  """The item at the end of the edge."""
  node: CatalogSellable!

  """A cursor for use in pagination."""
  cursor: String!
}

type BundleConfiguration implements Node @key(fields: "id") {
  """The globally unique ID of the configuration."""
  id: ID!

  """The bundle root this configuration belongs to."""
  bundle: Bundle!

  """The Product global ID of the bundle this configuration belongs to."""
  bundleId: ID!

  """Configuration name."""
  name: String!

  """Variants that use this configuration."""
  variants: [Variant!]!

  """Groups in configurator order."""
  groups: [BundleGroup!]!

  """Reusable pricing templates."""
  pricingTemplates: [BundlePricingTemplate!]!

  """Dependency rules in priority order."""
  dependencyRules: [BundleDependencyRule!]!

  """The date and time when the configuration was created."""
  createdAt: DateTime!

  """The date and time when the configuration was last updated."""
  updatedAt: DateTime!
}

type BundleGroup implements Node @key(fields: "id") {
  """The globally unique ID of the group."""
  id: ID!

  """Sort order within the configuration."""
  sortIndex: Int!

  """Display title from current locale."""
  title: String!

  """Minimum selected items in this group. Null means no minimum."""
  minSelection: Int

  """Maximum selected items in this group. Null means no maximum."""
  maxSelection: Int

  """Items in group order."""
  items: [BundleItem!]!

  """The date and time when the group was created."""
  createdAt: DateTime!

  """The date and time when the group was last updated."""
  updatedAt: DateTime!
}

type BundleItem implements Node @key(fields: "id") {
  """The globally unique ID of the item."""
  id: ID!

  """The group this item belongs to."""
  group: BundleGroup!

  """The group ID."""
  groupId: ID!

  """Whether the item references a product or a concrete variant."""
  itemType: BundleItemType!

  """Sort order within the group."""
  sortIndex: Int!

  """Referenced product for PRODUCT items."""
  refProduct: Product

  """Referenced product ID for PRODUCT items."""
  refProductId: ID

  """Referenced variant for VARIANT items."""
  refVariant: Variant

  """Referenced variant ID for VARIANT items."""
  refVariantId: ID

  """Featured image override."""
  featuredImage: File

  """Minimum selectable quantity."""
  minQty: Int

  """Maximum selectable quantity. Null means unlimited."""
  maxQty: Int

  """Default quantity."""
  defaultQty: Int

  """Inline price rule. Null when pricingTemplate is used."""
  priceRule: BundlePriceRule

  """Reusable pricing template. Null when inline priceRule is used."""
  pricingTemplate: BundlePricingTemplate

  """Allowed option/value selections for PRODUCT items."""
  optionSelections: [BundleItemOptionSelection!]!

  """Optional display title override from current locale."""
  title: String

  """Whether item is visible in the configurator."""
  visible: Boolean!

  """Whether item is selected by default."""
  selected: Boolean!

  """The date and time when the item was created."""
  createdAt: DateTime!

  """The date and time when the item was last updated."""
  updatedAt: DateTime!
}

type BundleItemOptionSelection implements Node @key(fields: "id") {
  """The globally unique ID of the option selection."""
  id: ID!

  """Referenced product option."""
  option: ProductOption!

  """Referenced product option ID."""
  optionId: ID!

  """Parent option for dependent option trees."""
  parentOption: ProductOption

  """Parent option ID."""
  parentOptionId: ID

  """Allowed values for this option."""
  values: [BundleItemOptionValueSelection!]!

  """Sort order within item option selections."""
  sortIndex: Int!
}

type BundleItemOptionValueSelection implements Node @key(fields: "id") {
  """The globally unique ID of the option value selection."""
  id: ID!

  """Referenced product option value. Null when the value is unavailable."""
  optionValue: ProductOptionValue

  """Referenced product option value ID."""
  optionValueId: ID

  """Stable value copy for displaying stale/unavailable values."""
  value: String!

  """Selection status."""
  status: BundleItemOptionValueSelectionStatus!

  """Sort order within option values."""
  sortIndex: Int!
}

interface BundlePriceRule implements Node {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!
}

type BundleBasePriceRule implements Node & BundlePriceRule @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!
}

type BundleFixedPriceRule implements Node & BundlePriceRule @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!

  """Money values for FIXED rules."""
  amounts: [BundlePriceRuleAmount!]!
}

type BundleDiscountPercentPriceRule implements Node & BundlePriceRule @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!

  """Percent row for DISCOUNT_PERCENT rules."""
  percent: BundlePriceRulePercent!
}

type BundleDiscountFixedPriceRule implements Node & BundlePriceRule @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!

  """Money values for DISCOUNT_FIXED rules."""
  amounts: [BundlePriceRuleAmount!]!
}

type BundleFreePriceRule implements Node & BundlePriceRule @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!
}

type BundlePriceRuleAmount {
  """The currency code."""
  currency: CurrencyCode!

  """Amount in minor units."""
  amountMinor: BigInt!
}

type BundlePriceRulePercent {
  """Percent value, 0..100."""
  value: Int!
}

type BundlePricingTemplate implements Node @key(fields: "id") {
  """The globally unique ID of the pricing template."""
  id: ID!

  """Template name."""
  name: String!

  """Reusable price rule."""
  priceRule: BundlePriceRule!

  """Sort order within configuration."""
  sortIndex: Int!
}

type BundleDependencyRule implements Node @key(fields: "id") {
  """The globally unique ID of the dependency rule."""
  id: ID!

  """Rule name."""
  name: String!

  """Whether the rule is enabled."""
  enabled: Boolean!

  """Rule priority. Lower values are evaluated first."""
  priority: Int!

  """How condition groups are combined."""
  logicOperator: BundleLogicOperator!

  """Condition groups."""
  conditionGroups: [BundleConditionGroup!]!

  """Actions applied when conditions match."""
  actions: [BundleDependencyAction!]!

  """The date and time when the rule was created."""
  createdAt: DateTime!

  """The date and time when the rule was last updated."""
  updatedAt: DateTime!
}

type BundleConditionGroup implements Node @key(fields: "id") {
  """The globally unique ID of the condition group."""
  id: ID!

  """How conditions are combined."""
  logicOperator: BundleLogicOperator!

  """Conditions in this group."""
  conditions: [BundleCondition!]!

  """Sort order within the rule."""
  sortIndex: Int!
}

type BundleCondition implements Node @key(fields: "id") {
  """The globally unique ID of the condition."""
  id: ID!

  """Condition category."""
  category: BundleConditionCategory!

  """Condition subject."""
  subject: BundleConditionSubject!

  """Condition operator."""
  operator: BundleConditionOperator!

  """Target type."""
  targetType: BundleDependencyTargetType!

  """Target ID. Points to a group or item inside the same configuration."""
  targetId: ID!

  """Numeric value for numeric conditions."""
  value: Int

  """Sort order within the condition group."""
  sortIndex: Int!
}

type BundleDependencyAction implements Node @key(fields: "id") {
  """The globally unique ID of the action."""
  id: ID!

  """Action type."""
  actionType: BundleDependencyActionType!

  """Target type."""
  targetType: BundleDependencyTargetType!

  """Target ID. Null is allowed when targetType is BUNDLE."""
  targetId: ID

  """Required value for SET_REQUIRED."""
  requiredValue: Boolean

  """Price rule for ADJUST_PRICE."""
  priceRule: BundlePriceRule

  """Whether this action can stack with other matching actions."""
  stackable: Boolean!

  """Sort order within the rule."""
  sortIndex: Int!
}
```

## Query API

Because `Bundle` is a separate Admin GraphQL type, bundle reads use the catalog
query namespace directly:

```graphql
type CatalogQuery {
  # ... existing catalog queries

  """Get a bundle by Product global ID. The product must have kind = BUNDLE."""
  bundle(id: ID!): Bundle

  """Get bundles with Relay-style pagination."""
  bundles(
    first: Int
    after: String
    last: Int
    before: String
    where: BundleWhereInput
    orderBy: [BundleOrderByInput!]
    meta: BundleBundlesMetaInput
  ): BundleConnection!
}
```

Nested bundle structure fields (`configurations`, `groups`, `items`,
`pricingTemplates`, `dependencyRules`, `conditionGroups`, `conditions`, `actions`)
remain ordered arrays, not Relay connections. They are loaded as a bounded bundle
configuration tree, but edited through scoped sync mutations that match the UI
modals (`bundleGroupsSync`, `bundlePricingTemplatesSync`,
`bundleDependencyRulesSync`). List-level Relay pagination is on `CatalogQuery.bundles`.

Flat merchandising/listing surfaces that can contain both BASE products and
BUNDLE products should return `CatalogSellableConnection`, not `BundleConnection`
or a GraphQL union. This keeps the UI list contract stable for shared card/list
fields while still allowing subtype-specific fragments.

Example category/listing shape:

```graphql
type Category implements Node @key(fields: "id") {
  # ... existing category fields

  """Sellable catalog items assigned to this category, including products and bundles."""
  items(
    first: Int
    after: String
    last: Int
    before: String
    where: CatalogSellableWhereInput
    orderBy: [CatalogSellableOrderByInput!]
  ): CatalogSellableConnection!
}
```

Recommended UI query pattern:

```graphql
query CategoryItems($categoryId: ID!, $first: Int, $after: String) {
  catalogQuery {
    category(id: $categoryId) {
      items(first: $first, after: $after) {
        edges {
          node {
            id
            kind
            title
            handle
            media {
              # ProductMediaItem fields
            }
            variantsCount
            ... on Bundle {
              type
              displayStyle
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
}
```

## Mutation API

```graphql
type CatalogMutation {
  # ... existing catalog mutations

  """Create a new bundle sellable item."""
  bundleCreate(input: BundleCreateInput!): BundleCreatePayload!

  """Unified bundle update with optimistic locking."""
  bundleUpdate(
    """The bundle ID to update."""
    bundleId: ID!
    """Expected revision for optimistic locking."""
    expectedRevision: Int!
    """Bundle-level operations."""
    operations: BundleUpdateInput
  ): BundleUpdatePayload!

  """Create one bundle configuration."""
  bundleConfigurationCreate(input: BundleConfigurationCreateInput!): BundleConfigurationPayload!

  """Update configuration metadata/settings."""
  bundleConfigurationUpdate(input: BundleConfigurationUpdateInput!): BundleConfigurationPayload!

  """Delete one bundle configuration with optimistic locking."""
  bundleConfigurationDelete(input: BundleConfigurationDeleteInput!): DeletePayload!

  """Sync all groups/items for one bundle configuration."""
  bundleGroupsSync(input: BundleGroupsSyncInput!): BundleGroupsSyncPayload!

  """Sync all reusable pricing templates for one bundle configuration."""
  bundlePricingTemplatesSync(input: BundlePricingTemplatesSyncInput!): BundlePricingTemplatesSyncPayload!

  """Sync all dependency rules for one bundle configuration."""
  bundleDependencyRulesSync(input: BundleDependencyRulesSyncInput!): BundleDependencyRulesSyncPayload!
}

type BundleCreatePayload {
  bundle: Bundle
  userErrors: [GenericUserError!]!
}

type BundleUpdatePayload {
  bundle: Bundle
  userErrors: [GenericUserError!]!
}

type BundleConfigurationPayload {
  configuration: BundleConfiguration
  userErrors: [GenericUserError!]!
}

type BundleGroupsSyncPayload {
  configuration: BundleConfiguration
  groups: [BundleGroup!]!
  userErrors: [GenericUserError!]!
}

type BundlePricingTemplatesSyncPayload {
  configuration: BundleConfiguration
  pricingTemplates: [BundlePricingTemplate!]!
  userErrors: [GenericUserError!]!
}

type BundleDependencyRulesSyncPayload {
  configuration: BundleConfiguration
  dependencyRules: [BundleDependencyRule!]!
  userErrors: [GenericUserError!]!
}
```

## Mutation Inputs

```graphql
input BundleCreateInput {
  """Bundle title."""
  title: String!

  """URL-friendly handle for the bundle."""
  handle: String!

  """Vendor ID to associate with the bundle."""
  vendorId: ID

  """Bundle description."""
  description: RichTextInput

  """Short excerpt in multiple formats."""
  excerpt: RichTextInput

  """File IDs for bundle media (already uploaded via mediaMutation.fileUpload)."""
  mediaFileIds: [ID!]

  """Bundle options."""
  options: [ProductCreateOptionInput!]

  """Bundle variants to create."""
  variants: [ProductCreateVariantInput!]

  """Inventory tracking settings for the bundle."""
  inventoryItem: InventoryItemInput

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle
}

input BundleUpdateInput {
  """The URL-friendly handle for the bundle."""
  handle: String

  """Bundle title."""
  title: String

  """Vendor ID to associate with the bundle. Pass null to clear."""
  vendorId: ID

  """Bundle content (description, excerpt)."""
  content: ProductContentInput

  """SEO and Open Graph metadata."""
  seo: ProductSeoInput

  """Bundle status: DRAFT or PUBLISHED."""
  status: ProductStatus

  """Bundle media."""
  media: ProductMediaInput

  """Bundle category assignment operations."""
  categories: [ProductCategoryOperationInput!]

  """Bundle tag assignment operations."""
  tags: [ProductTagOperationInput!]

  """Variant create, update, and delete operations."""
  variants: [VariantOperationInput!]

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle
}

input BundleConfigurationCreateInput {
  """Product global ID of the bundle."""
  bundleId: ID!

  """Expected parent bundle product revision. Required for optimistic locking."""
  expectedRevision: Int!

  """Configuration name."""
  name: String!
}

input BundleConfigurationUpdateInput {
  id: ID!
  expectedRevision: Int!
  name: String
}

input BundleConfigurationDeleteInput {
  id: ID!
  expectedRevision: Int!
}

input BundleGroupsSyncInput {
  configurationId: ID!
  expectedRevision: Int!

  """
  Complete list of groups for this configuration.
  Groups not present in this list are deleted.
  """
  groups: [BundleGroupSyncItemInput!]!
}

input BundleGroupSyncItemInput {
  """
  Existing group ID. Null creates a new group.
  Existing groups in this configuration but missing from BundleGroupsSyncInput.groups are deleted.
  """
  id: ID

  """Localized title for current locale."""
  title: String!

  minSelection: Int
  maxSelection: Int

  """Sort order within the configuration."""
  sortIndex: Int!

  """Complete list of items inside this group."""
  items: [BundleItemSyncInput!]!
}

input BundleItemSyncInput {
  """
  Existing item ID. Null creates a new item.
  Existing items in this group but missing from BundleGroupSyncItemInput.items are deleted.
  """
  id: ID

  """Whether the item references a product or a concrete variant."""
  itemType: BundleItemType!

  """Referenced product ID for PRODUCT items."""
  refProductId: ID

  """Referenced variant ID for VARIANT items."""
  refVariantId: ID

  """Featured image override."""
  featuredImageId: ID

  """Minimum selectable quantity."""
  minQty: Int

  """Maximum selectable quantity."""
  maxQty: Int

  """Default quantity."""
  defaultQty: Int

  """Inline price rule. Cannot be used together with pricingTemplateId."""
  priceRule: BundlePriceRuleInput

  """Reusable pricing template ID. Cannot be used together with priceRule."""
  pricingTemplateId: ID

  """Allowed option/value selections for PRODUCT items."""
  optionSelections: [BundleItemOptionSelectionSyncInput!]

  """Optional localized title override for current locale."""
  title: String

  """Whether item is visible in the configurator."""
  visible: Boolean!

  """Whether item is selected by default."""
  selected: Boolean!

  """Sort order within the group."""
  sortIndex: Int!
}

input BundleItemOptionSelectionSyncInput {
  """Existing option selection ID. Null creates a new option selection."""
  id: ID

  """Referenced product option ID."""
  optionId: ID!

  """Parent option ID for dependent option trees."""
  parentOptionId: ID

  """Sort order within option selections."""
  sortIndex: Int!

  """Complete list of option value selections."""
  values: [BundleItemOptionValueSelectionSyncInput!]!
}

input BundleItemOptionValueSelectionSyncInput {
  """Existing value selection ID. Null creates a new value selection."""
  id: ID

  """Referenced product option value ID."""
  optionValueId: ID

  """Stable value copy for displaying stale/unavailable values."""
  value: String!

  """Selection status."""
  status: BundleItemOptionValueSelectionStatus!

  """Sort order within option values."""
  sortIndex: Int!
}

input BundlePriceRuleInput {
  """Existing price rule ID. Null creates a new price rule."""
  id: ID

  """Pricing strategy."""
  priceType: BundlePriceType!

  """Money values for FIXED and DISCOUNT_FIXED rules."""
  amounts: [BundlePriceRuleAmountInput!]

  """Percent value for DISCOUNT_PERCENT rules."""
  percent: BundlePriceRulePercentInput
}

input BundlePriceRuleAmountInput {
  """The currency code."""
  currency: CurrencyCode!

  """Amount in minor units."""
  amountMinor: BigInt!
}

input BundlePriceRulePercentInput {
  """Percent value, 0..100."""
  value: Int!
}

input BundlePricingTemplatesSyncInput {
  configurationId: ID!
  expectedRevision: Int!

  """
  Complete list of pricing templates for this configuration.
  Templates not present in this list are deleted.
  """
  pricingTemplates: [BundlePricingTemplateSyncItemInput!]!
}

input BundlePricingTemplateSyncItemInput {
  """
  Existing pricing template ID. Null creates a new template.
  Existing templates in this configuration but missing from
  BundlePricingTemplatesSyncInput.pricingTemplates are deleted.
  """
  id: ID

  """Template name."""
  name: String!

  """Reusable price rule."""
  priceRule: BundlePriceRuleInput!

  """Sort order within configuration."""
  sortIndex: Int!
}

input BundleDependencyRulesSyncInput {
  configurationId: ID!
  expectedRevision: Int!

  """
  Complete list of dependency rules for this configuration.
  Rules not present in this list are deleted.
  """
  dependencyRules: [BundleDependencyRuleSyncItemInput!]!
}

input BundleDependencyRuleSyncItemInput {
  """
  Existing dependency rule ID. Null creates a new rule.
  Existing rules in this configuration but missing from
  BundleDependencyRulesSyncInput.dependencyRules are deleted.
  """
  id: ID

  """Rule name."""
  name: String!

  """Whether the rule is enabled."""
  enabled: Boolean!

  """Rule priority."""
  priority: Int!

  """How condition groups are combined."""
  logicOperator: BundleLogicOperator!

  """Complete list of condition groups."""
  conditionGroups: [BundleConditionGroupSyncInput!]!

  """Complete list of actions."""
  actions: [BundleDependencyActionSyncInput!]!
}

input BundleConditionGroupSyncInput {
  """Existing condition group ID. Null creates a new group."""
  id: ID

  """How conditions are combined."""
  logicOperator: BundleLogicOperator!

  """Sort order within the rule."""
  sortIndex: Int!

  """Complete list of conditions."""
  conditions: [BundleConditionSyncInput!]!
}

input BundleConditionSyncInput {
  """Existing condition ID. Null creates a new condition."""
  id: ID

  """Condition category."""
  category: BundleConditionCategory!

  """Condition subject."""
  subject: BundleConditionSubject!

  """Condition operator."""
  operator: BundleConditionOperator!

  """Target type."""
  targetType: BundleDependencyTargetType!

  """Target ID."""
  targetId: ID!

  """Numeric value for numeric conditions."""
  value: Int

  """Sort order within the condition group."""
  sortIndex: Int!
}

input BundleDependencyActionSyncInput {
  """Existing action ID. Null creates a new action."""
  id: ID

  """Action type."""
  actionType: BundleDependencyActionType!

  """Target type."""
  targetType: BundleDependencyTargetType!

  """Target ID."""
  targetId: ID

  """Required value for SET_REQUIRED."""
  requiredValue: Boolean

  """Price rule for ADJUST_PRICE."""
  priceRule: BundlePriceRuleInput

  """Whether this action can stack with other matching actions."""
  stackable: Boolean!

  """Sort order within the rule."""
  sortIndex: Int!
}
```

## Валидация

- `BundleCreateInput` создает новую запись `catalog.product(kind = BUNDLE)`,
  связанную запись `catalog.bundle`, переводы, media/options/variants и inventory
  по тем же правилам, что `ProductCreateInput`.
- Клиент не передает существующий `productId` в `bundleCreate`.
- `bundleCreate` возвращает `Bundle.id`, закодированный как `GlobalIdEntity.Product`
  от созданного `catalog.product.id`.
- `CatalogQuery.bundle(id:)`, `bundleUpdate(bundleId:)` и
  `BundleConfigurationCreateInput.bundleId` принимают только `Product` global ID,
  который указывает на `catalog.product.kind = BUNDLE`.
- Все mutations, меняющие bundle product или его configuration tree, выполняются с
  optimistic locking: `expectedRevision` обязателен и сравнивается с текущим
  `catalog.product.revision` parent bundle product.
- Каждая scoped sync mutation должна выполняться в одной DB transaction: lock parent
  `catalog.product` row, проверить `expectedRevision`, проверить project/store
  scope, заменить только заявленный UI scope, затем
  увеличить `catalog.product.revision` и `catalog.product.updated_at`.
- `bundleGroupsSync` заменяет только groups/items/option selections указанной
  configuration. Pricing templates и dependency rules этой configuration не
  меняются.
- `bundlePricingTemplatesSync` заменяет только reusable pricing templates
  указанной configuration. Groups/items и dependency rules не меняются.
- `bundleDependencyRulesSync` заменяет только dependency rules/condition
  groups/conditions/actions указанной configuration. Groups/items/templates не
  меняются.
- Scoped sync semantics совпадают с product options/features: item с `id`
  обновляется и сохраняет server ID, item без `id` создается, существующий item в
  этом scope, отсутствующий во входном списке, удаляется.
- Порядок groups/items/templates/condition groups/conditions/actions задается
  через `sortIndex`; порядок rules задается через `priority`.
- Variant assignments configuration меняются через
  `BundleConfigurationUpdateInput.variantIds`, без отдельной mutation.
- Локальные UI IDs (`grp-*`, `item-*`, `tpl-*`, `rule-*` и `crypto.randomUUID()`
  draft IDs) не являются GraphQL IDs и не отправляются как `id`. Новые rows
  отправляются без `id`; backend возвращает final server IDs в payload, после
  чего UI заменяет локальные draft IDs.
- Cross-scope references require existing server IDs. Например,
  `pricingTemplateId` в `bundleGroupsSync` должен ссылаться на template, уже
  сохраненный через `bundlePricingTemplatesSync`, а dependency rule `targetId`
  должен ссылаться на group/item, уже сохраненный через `bundleGroupsSync`.
- Любое успешное изменение структуры бандла через scoped sync mutations должно
  bump-ить `catalog.product.revision`, чтобы `bundleUpdate` и bundle structure
  mutations видели общий concurrency token.
- Для одного internal product row разрешен только один `Bundle`.
- Все `variantIds` в configuration assignment должны принадлежать этому bundle.
- Каждый variant может быть назначен только одной configuration.
- Все IDs в input принимаются как GraphQL global IDs и декодируются к ожидаемым
  `GlobalIdEntity`; invalid type должен возвращать `GenericUserError`.
- Все операции фильтруются по текущему `projectId` из context. Запрещено читать или
  менять bundle-структуру другого project/store даже при валидном UUID.
- `BundleGroupSyncItemInput.title` обязателен и пишется в
  `bundle_group_translation` текущей locale.
- `BundleItemSyncInput.title`, если передан, пишется в
  `bundle_item_translation` текущей locale.
- `BundleGroup.title: String!` должен иметь fallback для чтения: текущая locale,
  затем default/project locale, затем пустая строка или user-visible validation error
  при сохранении. Нельзя возвращать null из non-null GraphQL поля.
- Для `itemType = PRODUCT` требуется `refProductId`, а `refVariantId` должен быть null.
- Для `itemType = VARIANT` требуется `refVariantId`, а `refProductId` должен быть null.
- `refProductId`, `refVariantId`, `optionId`, `optionValueId`, `featuredImageId`,
  `pricingTemplateId` должны ссылаться на сущности текущего project/store.
- `featuredImageId` не защищен DB FK в bundle-модели, поэтому существование `File`
  валидируется на service layer.
- `optionSelections` разрешены только для `itemType = PRODUCT`.
- У item может быть либо inline `priceRule`, либо `pricingTemplateId`, но не оба
  источника одновременно.
- `BundlePriceRule` в output резолвится в concrete type по `priceType`:
  `BASE` -> `BundleBasePriceRule`, `FIXED` -> `BundleFixedPriceRule`,
  `DISCOUNT_PERCENT` -> `BundleDiscountPercentPriceRule`,
  `DISCOUNT_FIXED` -> `BundleDiscountFixedPriceRule`, `FREE` -> `BundleFreePriceRule`.
- `BundlePriceRuleInput` остается discriminator-based, потому что GraphQL не
  поддерживает input unions.
- Для `BundlePriceRuleInput.priceType = BASE` и `FREE` поля `amounts` и `percent`
  должны быть null.
- Для `BundlePriceRuleInput.priceType = FIXED` и `DISCOUNT_FIXED` требуется
  непустой `amounts`; currencies внутри одного rule уникальны.
- Для `BundlePriceRuleInput.priceType = DISCOUNT_PERCENT` требуется `percent.value`
  в диапазоне `0..100`.
- Для `STATE_CHECK` допустимы только `IS_SELECTED`, `IS_NOT_SELECTED`; `value` должен быть null.
- Для `NUMERIC` допустимы только `GTE`, `EQ`, `LTE`; `value` обязателен.
- `ADJUST_PRICE` требует `priceRule`.
- Для действий `SHOW`, `HIDE`, `SET_REQUIRED` поле `priceRule` должно быть null.

## Маппинг к DB

| GraphQL поле/тип | DB таблица |
| --- | --- |
| `Product.kind` | `catalog.product.kind` |
| `Variant.kind` | `catalog.variant.kind` |
| `CatalogSellable` | GraphQL interface over sellable `catalog.product` rows; concrete resolver returns `Product` for `kind = BASE` and `Bundle` for `kind = BUNDLE` |
| `Bundle.id` | `catalog.product.id` encoded as `GlobalIdEntity.Product`; no public ID for `catalog.bundle.id` |
| `Bundle` | `catalog.product(kind = BUNDLE)` + internal `catalog.bundle` row for bundle-specific fields |
| `Bundle.type`, `Bundle.displayStyle` | `catalog.bundle.type`, `catalog.bundle.display_style` |
| `Bundle.configurations`, `BundleConfiguration` | `catalog.bundle_configuration` |
| `BundleConfiguration.bundleId` | parent `catalog.product.id` encoded as `GlobalIdEntity.Product`; service maps it to internal `catalog.bundle.id` for DB writes |
| `BundleConfiguration.variants` | `catalog.bundle_configuration_variant` + `catalog.variant` |
| `BundleGroup` | `catalog.bundle_group` |
| `BundleGroup.title` | `catalog.bundle_group_translation.name` for current locale |
| `BundleItem` | `catalog.bundle_item` |
| `BundleItem.title` | `catalog.bundle_item_translation.name` for current locale |
| `BundleItem.featuredImage` | `catalog.bundle_item.featured_image_id` -> federated `File` |
| `BundleItemOptionSelection` | `catalog.bundle_item_option_selection` |
| `BundleItemOptionSelection.optionId` | `catalog.bundle_item_option_selection.ref_option_id` |
| `BundleItemOptionSelection.parentOptionId` | `catalog.bundle_item_option_selection.parent_option_id` |
| `BundleItemOptionValueSelection` | `catalog.bundle_item_option_value_selection` |
| `BundleItemOptionValueSelection.optionValueId` | `catalog.bundle_item_option_value_selection.ref_option_value_id` |
| `BundlePriceRule` interface | `catalog.bundle_price_rule.price_type` discriminator |
| `BundleFixedPriceRule.amounts`, `BundleDiscountFixedPriceRule.amounts` | `catalog.bundle_price_rule_amount` |
| `BundleDiscountPercentPriceRule.percent.value` | `catalog.bundle_price_rule_percent.percent_value` |
| `BundlePricingTemplate` | `catalog.bundle_pricing_template` |
| `BundleDependencyRule` | `catalog.dependency_rule` |
| `BundleConditionGroup` | `catalog.condition_group` |
| `BundleCondition` | `catalog.condition` |
| `BundleDependencyAction` | `catalog.dependency_action` |

`catalog.*.project_id` columns are implementation scoping fields and are not exposed
in GraphQL. Repositories/resolvers must include the current project/store scope in
all reads and writes.

## Relay и Node

Bundle API objects that implement `Node` must be resolvable through the existing
`CatalogQuery.node(id:)` / `CatalogQuery.nodes(ids:)` entry points. Adding
`implements Node` is not sufficient by itself.

Implementation requirements:

- Do not add a separate `GlobalIdEntity.Bundle`: `Bundle.id` uses
  `GlobalIdEntity.Product` and validates `product.kind = BUNDLE`.
- Add all bundle structure node entities to `GlobalIdEntity`.
- Encode every `id` field with the matching `GlobalIdEntity`.
- Decode query and mutation input IDs by expected entity type.
- Extend `CatalogQuery.node(id:)` dispatch so a `Product` ID whose row has
  `kind = BUNDLE` resolves as `Bundle`, while `kind = BASE` resolves as `Product`.
- Implement `CatalogSellable` as a GraphQL interface, not a union, for flat
  category/listing/search connections that can contain both BASE products and
  BUNDLE products.
- `CatalogSellableConnection.node` resolves concrete type from
  `catalog.product.kind`: `BASE` -> `Product`, `BUNDLE` -> `Bundle`.
- Do not add a separate `GlobalIdEntity.CatalogSellable`: the concrete object ID
  remains the `Product` global ID.
- Do not expose `bundle_configuration_variant` as `Node`: it is an assignment table
  with composite key `configuration_id + variant_id`.
- Use `BundleConnection` / `BundleEdge` / `PageInfo` to list bundles through
  `CatalogQuery.bundles`.
- Use `CatalogSellableConnection` / `CatalogSellableEdge` / `PageInfo` for mixed
  category/listing/search result sets.
- Keep configuration internals as ordered arrays for reads unless a real UI/API
  need appears for independently paginating groups/items/rules. Writes stay
  scoped to the edited UI modal: groups/items, pricing templates, or dependency
  rules.

## Global ID entities

Нужно добавить только сущности, которые реально реализуют `Node`:

```typescript
BundleConfiguration = "BundleConfiguration"
BundleGroup = "BundleGroup"
BundleItem = "BundleItem"
BundleItemOptionSelection = "BundleItemOptionSelection"
BundleItemOptionValueSelection = "BundleItemOptionValueSelection"
BundlePriceRule = "BundlePriceRule"
BundlePricingTemplate = "BundlePricingTemplate"
BundleDependencyRule = "BundleDependencyRule"
BundleConditionGroup = "BundleConditionGroup"
BundleCondition = "BundleCondition"
BundleDependencyAction = "BundleDependencyAction"
```

`Bundle` не получает отдельный `GlobalIdEntity`, потому что в API это продукт с
`kind = BUNDLE`, а не публичная проекция строки `catalog.bundle`.
`bundle_configuration_variant` не получает отдельный GraphQL `Node`, потому что в DB это
assignment с составным ключом `configuration_id + variant_id`.
Concrete price rule GraphQL types (`BundleFixedPriceRule`,
`BundleDiscountPercentPriceRule`, etc.) use the same `BundlePriceRule` global ID
entity because they are projections of one `bundle_price_rule` row.
