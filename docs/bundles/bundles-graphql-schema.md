# GraphQL схема бандлов

Документ описывает целевую GraphQL-схему для бандлов. Источник модели данных:
`docs/bundles/bundles-database-schema.md`.

Ключевой принцип: bundle не становится отдельным каталогом сущностей в API. Бандл остается
`Product` с `kind = BUNDLE`, а bundle-структура доступна через поля продукта и варианта.
Структура бандла редактируется через configuration-scoped snapshot input: одна
конфигурация содержит groups/items/pricing templates/dependency rules.

## Принципы схемы

- `Bundle` - это root-запись 1:1 к `Product`.
- `BundleConfiguration` - владелец структуры бандла.
- Variant не хранит структуру напрямую, а получает ее через
  `BundleConfigurationVariant`.
- Translation-таблицы не обязаны публиковаться отдельными GraphQL типами: публичное поле
  `title` резолвится из текущей locale.
- Mutation naming follows existing Catalog Admin API patterns:
  `*Create` / `*Update` / `*Delete` for ordinary entity lifecycle operations,
  and `*Sync` for complete replace operations over ordered child collections.
- Payload мутаций возвращает измененный `bundle`/`configuration` и
  `userErrors: [GenericUserError!]!`.
- Bundle pricing API следует normalized DB-модели:
  `bundle_price_rule` хранит только `priceType`, значения лежат в
  `bundle_price_rule_amount` и `bundle_price_rule_percent`.
- Catalog Admin API должен оставаться namespace-based: bundle queries добавляются в
  `CatalogQuery`, bundle mutations - в `CatalogMutation`. Не добавлять root-level
  `Query.bundle` / `Mutation.bundleCreate` / `Mutation.bundleConfigurationSync`.
- Catalog service владеет `Product` и `Variant`, поэтому bundle-поля добавляются в
  существующие owned type definitions, а не через `extend type Product` /
  `extend type Variant` в отдельном subgraph.
- Все bundle queries/mutations должны scope-иться по текущему project/store через
  request context. `projectId` из DB не публикуется в GraphQL.

## Product и Variant owned field additions

Catalog service already owns `Product` and `Variant`. Add these fields to the
existing type definitions in `product.graphql` and `variant.graphql`; do not create
separate `extend type Product` / `extend type Variant` declarations for this
service.

```graphql
enum ProductKind {
  BASE
  BUNDLE
}

type Product implements Node @key(fields: "id") {
  # Existing catalog-owned fields stay unchanged.
  """Product discriminator."""
  kind: ProductKind!

  """Bundle settings and configurations. Null for BASE products."""
  bundle: Bundle
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

type Bundle implements Node @key(fields: "id") {
  """The globally unique ID of the bundle root."""
  id: ID!

  """The product this bundle belongs to."""
  product: Product!

  """The product ID this bundle belongs to."""
  productId: ID!

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle!

  """All bundle configurations for this product."""
  configurations: [BundleConfiguration!]!

  """The date and time when the bundle root was created."""
  createdAt: DateTime!

  """The date and time when the bundle root was last updated."""
  updatedAt: DateTime!
}

type BundleConfiguration implements Node @key(fields: "id") {
  """The globally unique ID of the configuration."""
  id: ID!

  """The bundle root this configuration belongs to."""
  bundle: Bundle!

  """The bundle root ID."""
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

type BundlePriceRule implements Node @key(fields: "id") {
  """The globally unique ID of the price rule."""
  id: ID!

  """Pricing strategy."""
  priceType: BundlePriceType!

  """Money values for FIXED and DISCOUNT_FIXED rules."""
  amounts: [BundlePriceRuleAmount!]!

  """Percent row for DISCOUNT_PERCENT rules."""
  percent: BundlePriceRulePercent
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

There is no separate `CatalogQuery.bundles` list query. A bundle is listed as a
`Product` with `kind = BUNDLE`, using the existing product listing/Relay connection
surface:

```graphql
catalogQuery {
  products(where: { kind: { _eq: BUNDLE } }) {
    edges {
      node {
        id
        kind
        title
        bundle {
          id
          type
          displayStyle
        }
      }
    }
  }
}
```

Nested bundle structure fields (`configurations`, `groups`, `items`,
`pricingTemplates`, `dependencyRules`, `conditionGroups`, `conditions`, `actions`)
remain ordered snapshot arrays, not Relay connections. They are edited as one
configuration-scoped snapshot and are expected to be loaded as a bounded bundle
configuration tree. List-level Relay pagination stays on existing product listing
surfaces.

## Mutation API

```graphql
type CatalogMutation {
  # ... existing catalog mutations

  """Create bundle root for a product with kind = BUNDLE."""
  bundleCreate(input: BundleCreateInput!): BundleCreatePayload!

  """Update bundle root settings."""
  bundleUpdate(input: BundleUpdateInput!): BundleUpdatePayload!

  """Sync one bundle configuration as a complete snapshot."""
  bundleConfigurationSync(input: BundleConfigurationSyncInput!): BundleConfigurationSyncPayload!

  """Delete one bundle configuration."""
  bundleConfigurationDelete(input: BundleConfigurationDeleteInput!): BundleConfigurationDeletePayload!
}

type BundleCreatePayload {
  bundle: Bundle
  userErrors: [GenericUserError!]!
}

type BundleUpdatePayload {
  bundle: Bundle
  userErrors: [GenericUserError!]!
}

type BundleConfigurationSyncPayload {
  configuration: BundleConfiguration
  userErrors: [GenericUserError!]!
}

type BundleConfigurationDeletePayload {
  deletedBundleConfigurationId: ID
  userErrors: [GenericUserError!]!
}
```

## Mutation Inputs

```graphql
input BundleCreateInput {
  """Product ID for the product with kind = BUNDLE."""
  productId: ID!

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle
}

input BundleUpdateInput {
  """The bundle root to update."""
  id: ID!

  """High-level bundle type."""
  type: BundleType

  """Configurator display style."""
  displayStyle: BundleDisplayStyle
}

input BundleConfigurationSyncInput {
  """Existing configuration ID. Null creates a new configuration snapshot."""
  id: ID

  """Bundle root ID. Required when id is null."""
  bundleId: ID

  """Configuration name."""
  name: String!

  """Complete list of variants assigned to this configuration. Replaces existing assignments."""
  variantIds: [ID!]!

  """Complete list of pricing templates. Replaces existing templates."""
  pricingTemplates: [BundlePricingTemplateInput!]!

  """Complete list of groups. Replaces existing groups/items/option selections."""
  groups: [BundleGroupInput!]!

  """Complete list of dependency rules. Replaces existing rules/conditions/actions."""
  dependencyRules: [BundleDependencyRuleInput!]!
}

input BundleConfigurationDeleteInput {
  id: ID!
}

input BundleGroupInput {
  """Existing group ID. Null creates a new group."""
  id: ID

  """Sort order within the configuration."""
  sortIndex: Int!

  """Localized title for current locale."""
  title: String!

  """Minimum selected items in this group."""
  minSelection: Int

  """Maximum selected items in this group."""
  maxSelection: Int

  """Complete list of items."""
  items: [BundleItemInput!]!
}

input BundleItemInput {
  """Existing item ID. Null creates a new item."""
  id: ID

  """Whether the item references a product or a concrete variant."""
  itemType: BundleItemType!

  """Sort order within the group."""
  sortIndex: Int!

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
  optionSelections: [BundleItemOptionSelectionInput!]!

  """Optional localized title override for current locale."""
  title: String

  """Whether item is visible in the configurator."""
  visible: Boolean!

  """Whether item is selected by default."""
  selected: Boolean!
}

input BundleItemOptionSelectionInput {
  """Existing option selection ID. Null creates a new option selection."""
  id: ID

  """Referenced product option ID."""
  optionId: ID!

  """Parent option ID for dependent option trees."""
  parentOptionId: ID

  """Sort order within option selections."""
  sortIndex: Int!

  """Complete list of option value selections."""
  values: [BundleItemOptionValueSelectionInput!]!
}

input BundleItemOptionValueSelectionInput {
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

input BundlePricingTemplateInput {
  """Existing pricing template ID. Null creates a new template."""
  id: ID

  """Template name."""
  name: String!

  """Reusable price rule."""
  priceRule: BundlePriceRuleInput!

  """Sort order within configuration."""
  sortIndex: Int!
}

input BundleDependencyRuleInput {
  """Existing rule ID. Null creates a new rule."""
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
  conditionGroups: [BundleConditionGroupInput!]!

  """Complete list of actions."""
  actions: [BundleDependencyActionInput!]!
}

input BundleConditionGroupInput {
  """Existing condition group ID. Null creates a new group."""
  id: ID

  """How conditions are combined."""
  logicOperator: BundleLogicOperator!

  """Sort order within the rule."""
  sortIndex: Int!

  """Complete list of conditions."""
  conditions: [BundleConditionInput!]!
}

input BundleConditionInput {
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

input BundleDependencyActionInput {
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

- `BundleCreateInput.productId` должен ссылаться на `Product.kind = BUNDLE`.
- Для одного product разрешен только один `Bundle`.
- Все `variantIds` в configuration assignment должны принадлежать bundle product.
- Каждый variant может быть назначен только одной configuration.
- Все IDs в input принимаются как GraphQL global IDs и декодируются к ожидаемым
  `GlobalIdEntity`; invalid type должен возвращать `GenericUserError`.
- Все операции фильтруются по текущему `projectId` из context. Запрещено читать или
  менять bundle-структуру другого project/store даже при валидном UUID.
- `BundleGroupInput.title` обязателен и пишется в `bundle_group_translation` текущей locale.
- `BundleItemInput.title`, если передан, пишется в `bundle_item_translation` текущей locale.
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
- `BASE` и `FREE` не принимают `amounts` и `percent`.
- `FIXED` и `DISCOUNT_FIXED` требуют `amounts`.
- `DISCOUNT_PERCENT` требует `percent.value` в диапазоне `0..100`.
- Для `STATE_CHECK` допустимы только `IS_SELECTED`, `IS_NOT_SELECTED`; `value` должен быть null.
- Для `NUMERIC` допустимы только `GTE`, `EQ`, `LTE`; `value` обязателен.
- `ADJUST_PRICE` требует `priceRule`.
- Для действий `SHOW`, `HIDE`, `SET_REQUIRED` поле `priceRule` должно быть null.

## Маппинг к DB

| GraphQL поле/тип | DB таблица |
| --- | --- |
| `Product.kind` | `catalog.product.kind` |
| `Variant.kind` | `catalog.variant.kind` |
| `Product.bundle`, `Bundle` | `catalog.bundle` |
| `Bundle.configurations`, `BundleConfiguration` | `catalog.bundle_configuration` |
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
| `BundlePriceRule` | `catalog.bundle_price_rule`, `catalog.bundle_price_rule_amount`, `catalog.bundle_price_rule_percent` |
| `BundlePriceRule.amounts` | `catalog.bundle_price_rule_amount` |
| `BundlePriceRule.percent.value` | `catalog.bundle_price_rule_percent.percent_value` |
| `BundlePricingTemplate` | `catalog.bundle_pricing_template` |
| `BundleDependencyRule` | `catalog.dependency_rule` |
| `BundleConditionGroup` | `catalog.condition_group` |
| `BundleCondition` | `catalog.condition` |
| `BundleDependencyAction` | `catalog.dependency_action` |

`catalog.*.project_id` columns are implementation scoping fields and are not exposed
in GraphQL. Repositories/resolvers must include the current project/store scope in
all reads and writes.

## Relay и Node

Bundle entities that implement `Node` must be resolvable through the existing
`CatalogQuery.node(id:)` / `CatalogQuery.nodes(ids:)` entry points. Adding
`implements Node` is not sufficient by itself.

Implementation requirements:

- Add all bundle node entities to `GlobalIdEntity`.
- Encode every `id` field with the matching `GlobalIdEntity`.
- Decode query and mutation input IDs by expected entity type.
- Extend `CatalogQuery.node(id:)` dispatch to handle bundle node IDs.
- Do not expose `bundle_configuration_variant` as `Node`: it is an assignment table
  with composite key `configuration_id + variant_id`.
- Use existing product `Connection`/`Edge`/`PageInfo` surfaces to list bundle
  products via `Product.kind = BUNDLE`.
- Keep configuration internals as ordered snapshot arrays unless a real UI/API need
  appears for independently paginating groups/items/rules.

## Global ID entities

Нужно добавить только сущности, которые реально реализуют `Node`:

```typescript
Bundle = "Bundle"
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

`bundle_configuration_variant` не получает отдельный GraphQL `Node`, потому что в DB это
assignment с составным ключом `configuration_id + variant_id`.
