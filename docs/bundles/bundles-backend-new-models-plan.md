# План перевода backend бандлов на новые модели

## Цель

Перевести весь backend-код бандлов на модель базы данных, описанную в
`docs/bundles/bundles-database-schema.md`.

Целевая модель завязана на конфигурации:

- `product.kind = 'BUNDLE'` определяет root-продукты бандлов.
- `variant.kind` зеркалит `product.kind`.
- `bundle` — 1:1 root-запись бандла для bundle product.
- `bundle_configuration` владеет структурой бандла.
- `bundle_configuration_variant` назначает ровно одну конфигурацию продаваемому bundle variant.
- `bundle_group`, `bundle_item`, `bundle_pricing_template`, `bundle_price_rule` и `dependency_rule` scoped через `configuration_id`, а не через `product_id`.
- Переводимые названия живут в `bundle_group_translation` и `bundle_item_translation`.
- Значения цены живут в `bundle_price_rule`, `bundle_price_rule_amount` и `bundle_price_rule_percent`; legacy inline-поля `priceType` и `priceValue` должны быть удалены из API, scripts и repositories.

## Текущая legacy-поверхность

В backend уже есть legacy API для бандлов в catalog admin schema.
Его нужно рассматривать как compatibility surface, который надо заменить новым API.

Текущие legacy GraphQL queries:

- `bundleGroup(id: ID!): BundleGroup`
- `bundleGroups(productId: ID!): [BundleGroup!]!`
- `bundleItem(id: ID!): BundleItem`
- `bundlePricingTemplate(id: ID!): BundlePricingTemplate`
- `bundlePricingTemplates(productId: ID!): [BundlePricingTemplate!]!`
- `dependencyRule(id: ID!): DependencyRule`
- `dependencyRules(productId: ID!): [DependencyRule!]!`

Текущие legacy GraphQL mutations:

- `bundleGroupCreate`, `bundleGroupUpdate`, `bundleGroupDelete`
- `bundleItemCreate`, `bundleItemUpdate`, `bundleItemDelete`
- `bundlePricingTemplateCreate`, `bundlePricingTemplateUpdate`, `bundlePricingTemplateDelete`
- `dependencyRuleCreate`, `dependencyRuleUpdate`, `dependencyRuleDelete`
- `conditionGroupCreate`, `conditionGroupUpdate`, `conditionGroupDelete`
- `conditionCreate`, `conditionUpdate`, `conditionDelete`
- `dependencyActionCreate`, `dependencyActionUpdate`, `dependencyActionDelete`

Legacy-проблемы, которые нужно убрать:

- `BundleGroupCreateInput.productId`
- `BundlePricingTemplateCreateInput.productId`
- `DependencyRuleCreateInput.productId`
- `BundleGroup.title`
- `BundleItem.title`
- `BundleItem.featuredImageId` как override item эпохи `title`, без translation-aware item data
- `BundleItem.excludedVariantIds`
- `BundleItem.priceType`
- `BundleItem.priceValue`
- `BundlePricingTemplate.priceType`
- `BundlePricingTemplate.priceValue`
- `DependencyAction.priceType`
- `DependencyAction.priceValue`
- методы repositories с именами `findByProductId`, `findByProductIds`, `getMaxSortIndex(productId)`
- script DTO, которые принимают product-scoped структуру бандлов

## Не входит в план

- Не обновлять admin frontend в рамках этого backend-плана.
- Не менять структуру хранения бандлов.
- Не редактировать generated files вручную.
- Не редактировать changeset files вручную.
- Не сохранять legacy product-scoped writes после появления нового configuration API.
- Не добавлять `variant_id` в `bundle_group`, `bundle_item`, `bundle_pricing_template` или `dependency_rule`.

## Фаза 1: Аудит и выравнивание моделей

Файлы:

- `services/catalog/src/repositories/models/products.ts`
- `services/catalog/src/repositories/models/bundle.ts`
- `services/catalog/src/repositories/models/index.ts`

Задачи:

1. Проверить, что `productKindEnum` содержит `BASE` и `BUNDLE`.
2. Проверить, что `product.kind` по умолчанию равен `BASE`.
3. Проверить, что `variant.kind` по умолчанию равен `BASE`.
4. Проверить, что composite FK проверяет `variant.product_id + variant.kind` относительно `product.id + product.kind`.
5. Проверить, что у `bundle` есть `productId`, `type`, `displayStyle` и unique index на `productId`.
6. Проверить, что `bundle_configuration` существует и индексирован по `bundleId`.
7. Проверить, что `bundle_configuration_variant` имеет:
   - primary key по `configurationId + variantId`;
   - unique index по `variantId`;
   - index по `projectId`.
8. Проверить, что `bundle_group` использует `configurationId`, а не `productId`.
9. Проверить, что `bundle_group_translation` хранит локализованные названия групп.
10. Проверить, что в `bundle_item` нет legacy-колонок `title`, `excludedVariantIds`, `priceType` или `priceValue`.
11. Проверить, что `bundle_item_translation` хранит локализованные названия item.
12. Проверить, что pricing использует `bundle_price_rule`, `bundle_price_rule_amount` и `bundle_price_rule_percent`.
13. Проверить, что `bundle_pricing_template` хранит `priceRuleId`.
14. Проверить, что `dependency_action` хранит `priceRuleId` для `ADJUST_PRICE`, а не inline price fields.

Ожидаемый результат:

- Backend model files уже соответствуют целевой configuration-scoped модели.
- Backend-код использует существующую структуру хранения без изменений.

## Фаза 2: Repository layer

Файлы:

- `services/catalog/src/repositories/bundle/`
- `services/catalog/src/repositories/Repository.ts`

Новые repositories, которые нужно добавить или expose:

- `BundleRepository`
- `BundleConfigurationRepository`
- `BundleConfigurationVariantRepository`
- `BundlePriceRuleRepository`
- `BundlePriceRuleAmountRepository`
- `BundlePriceRulePercentRepository`

Существующие repositories, которые нужно обновить:

- `BundleGroupRepository`
- `BundleItemRepository`
- `BundlePricingTemplateRepository`
- `DependencyRuleRepository`
- `ConditionGroupRepository`
- `ConditionRepository`
- `DependencyActionRepository`

Целевой repository API:

- Bundle root:
  - `findById(id)`
  - `findByProductId(productId)`
  - `create({ productId, type, displayStyle })`
  - `update(id, data)`
  - `delete(id)`
  - `getByIds(ids)`
- Bundle configuration:
  - `findById(id)`
  - `findByBundleId(bundleId)`
  - `findByBundleIds(bundleIds)`
  - `create({ bundleId, name })`
  - `update(id, data)`
  - `delete(id)`
  - `getByIds(ids)`
- Configuration variant assignment:
  - `findByVariantId(variantId)`
  - `findByConfigurationId(configurationId)`
  - `assign({ configurationId, variantId })`
  - `replaceForVariant({ variantId, configurationId })`
  - `delete(configurationId, variantId)`
- Groups:
  - заменить `findByProductId` на `findByConfigurationId`;
  - заменить `findByProductIds` на `findByConfigurationIds`;
  - заменить `getMaxSortIndex(productId)` на `getMaxSortIndex(configurationId)`;
  - создавать/обновлять group translation rows через repository methods.
- Items:
  - оставить parent scope через `groupId`;
  - удалить legacy title/excluded variant fields;
  - поддержать `priceRuleId` и `pricingTemplateId`;
  - добавить option selection repositories для `bundle_item_option_selection` и `bundle_item_option_value_selection`.
- Pricing templates:
  - заменить product scope на `configurationId`;
  - заменить inline price fields на `priceRuleId`.
- Price rules:
  - создавать/обновлять/удалять base rule;
  - атомарно заменять amount rows для fixed amount rule types;
  - атомарно заменять percent row для percent rules;
  - валидировать, что у `BASE` и `FREE` нет value rows.
- Dependency rules:
  - заменить product scope на `configurationId`;
  - оставить `conditionGroup`, `condition` и `dependencyAction` scoped через rule hierarchy.
- Dependency actions:
  - заменить inline price fields на `priceRuleId`.

Правила repositories:

- Каждый query должен фильтроваться по `projectId` через `this.storeId`.
- Каждая write-операция должна использовать `this.connection` для transaction awareness.
- Batch lookup methods должны принимать readonly ids и возвращать empty arrays для empty input.
- Не кодировать GraphQL global IDs в repositories.

## Фаза 3: Script layer

Файлы:

- `services/catalog/src/scripts/bundle/`

Создать scripts:

- `BundleCreateScript`
- `BundleUpdateScript`
- `BundleDeleteScript`
- `BundleConfigurationCreateScript`
- `BundleConfigurationUpdateScript`
- `BundleConfigurationDeleteScript`
- `BundleConfigurationAssignVariantScript`
- `BundleConfigurationUnassignVariantScript`
- `BundlePriceRuleCreateScript`
- `BundlePriceRuleUpdateScript`
- `BundlePriceRuleDeleteScript`
- option selection scripts для bundle item option/value selections

Обновить существующие scripts:

- `BundleGroupCreateScript`
- `BundleGroupUpdateScript`
- `BundleItemCreateScript`
- `BundleItemUpdateScript`
- `BundlePricingTemplateCreateScript`
- `BundlePricingTemplateUpdateScript`
- `DependencyRuleCreateScript`
- `DependencyActionCreateScript`
- все связанные delete scripts

Изменения script DTO:

- `BundleGroupCreateParams.productId` становится `configurationId`.
- `BundleGroupCreateParams.title` становится translation input, например `name` плюс locale, или `translations`.
- `BundlePricingTemplateCreateParams.productId` становится `configurationId`.
- `BundlePricingTemplateCreateParams.priceType/priceValue` становится `priceRule`.
- `DependencyRuleCreateParams.productId` становится `configurationId`.
- `BundleItemCreateParams.title` становится translation input.
- `BundleItemCreateParams.priceType/priceValue` становится `priceRuleId` или nested `priceRule`.
- `DependencyActionCreateParams.priceType/priceValue` становится `priceRuleId` или nested `priceRule`.

Правила валидации:

- Bundle root product должен существовать и иметь `kind = 'BUNDLE'`.
- Bundle configuration должна принадлежать текущему project.
- Assigned variants должны существовать, принадлежать bundle product и иметь `kind = 'BUNDLE'`.
- У variant может быть только одно configuration assignment.
- Bundle groups/items/templates/rules могут ссылаться только на rows внутри той же configuration.
- Product item references должны указывать на валидные products.
- Variant item references должны указывать на валидные variants.
- Price rules должны соответствовать своей value table:
  - `FIXED` и `DISCOUNT_FIXED` требуют amount rows;
  - `DISCOUNT_PERCENT` требует одну percent row;
  - `BASE` и `FREE` не требуют value row.
- `ADJUST_PRICE` actions требуют `priceRuleId`; другие action types не должны его иметь.

Правила транзакций:

- Compound writes должны выполняться в transaction:
  - create/update price rule с amount/percent rows;
  - create bundle с default configuration;
  - assign configuration to variant;
  - delete configuration с dependent structure.

## Фаза 4: GraphQL Admin Schema

Файлы:

- `services/catalog/src/api/graphql-admin/schema/bundle.graphql`
- `services/catalog/src/api/graphql-admin/schema/base.graphql`

Добавить или заменить types:

- `Bundle`
- `BundleConfiguration`
- `BundleConfigurationVariant`
- `BundlePriceRule`
- `BundlePriceRuleAmount`
- `BundlePriceRulePercent`
- `BundleItemOptionSelection`
- `BundleItemOptionValueSelection`

Обновить существующие types:

- `BundleGroup.productId` становится `configurationId`.
- `BundleGroup.title` становится `name` или `translations`.
- `BundleItem.title` становится `name` или `translations`.
- `BundleItem.priceType/priceValue` удаляются.
- `BundleItem.priceRule` и `BundleItem.priceRuleId` добавляются.
- `BundlePricingTemplate.productId` становится `configurationId`.
- `BundlePricingTemplate.priceType/priceValue` удаляются.
- `BundlePricingTemplate.priceRule` и `priceRuleId` добавляются.
- `DependencyRule.productId` становится `configurationId`.
- `DependencyAction.priceType/priceValue` удаляются.
- `DependencyAction.priceRule` и `priceRuleId` добавляются.

Изменения queries:

- Добавить:
  - `bundle(id: ID!): Bundle`
  - `bundleByProduct(productId: ID!): Bundle`
  - `bundleConfiguration(id: ID!): BundleConfiguration`
  - `bundleConfigurations(bundleId: ID!): [BundleConfiguration!]!`
  - `bundleConfigurationByVariant(variantId: ID!): BundleConfiguration`
  - `bundleGroups(configurationId: ID!): [BundleGroup!]!`
  - `bundlePricingTemplates(configurationId: ID!): [BundlePricingTemplate!]!`
  - `dependencyRules(configurationId: ID!): [DependencyRule!]!`
- Оставить ID lookups там, где они полезны:
  - `bundleGroup(id: ID!)`
  - `bundleItem(id: ID!)`
  - `bundlePricingTemplate(id: ID!)`
  - `dependencyRule(id: ID!)`
- Удалить или deprecate product-scoped list queries:
  - `bundleGroups(productId: ID!)`
  - `bundlePricingTemplates(productId: ID!)`
  - `dependencyRules(productId: ID!)`

Изменения mutations:

- Добавить bundle root и configuration mutations.
- Обновить существующие create inputs, чтобы они использовали `configurationId`.
- Заменить inline price inputs на reusable `BundlePriceRuleInput`.
- Добавить assignment mutations для variants.
- Удалить legacy product-scoped create inputs.

Изменения enums:

- Выровнять GraphQL enum values с backend model:
  - `BASE`
  - `FIXED`
  - `DISCOUNT_PERCENT`
  - `DISCOUNT_FIXED`
  - `FREE`
- Удалить или замапить legacy `PERCENT_OFF` и `AMOUNT_OFF`.

Правила payload:

- Каждая mutation возвращает `userErrors`.
- Delete payloads возвращают original global ID при успешном delete.

## Фаза 5: GraphQL Resolvers

Файлы:

- `services/catalog/src/resolvers/admin/QueryResolver.ts`
- `services/catalog/src/resolvers/admin/MutationResolver.ts`
- `services/catalog/src/resolvers/admin/*Bundle*Resolver.ts`
- `services/catalog/src/resolvers/admin/*Dependency*Resolver.ts`
- `services/catalog/src/resolvers/admin/Condition*Resolver.ts`
- `services/catalog/src/resolvers/admin/generated/`

Задачи:

1. Добавить resolvers для `Bundle`, `BundleConfiguration` и price rule types.
2. Обновить существующие bundle resolvers, чтобы они грузили новые fields из repositories.
3. Decode global IDs только на границе GraphQL resolvers и scripts.
4. Возвращать encoded global IDs из entity resolvers.
5. Заменить product-scoped вызовы query resolver на configuration-scoped.
6. Обновить mutation resolver inputs, чтобы они вызывали новые scripts.
7. Удалить прямые ссылки на legacy DTO fields.
8. Перегенерировать GraphQL TypeScript types и Zod schemas через project codegen.

Правила resolver preload:

- Использовать loaders для entity-by-id reads там, где такой pattern уже есть.
- Использовать repository methods для nested collections.
- Избегать повторных repository reads для `BundleConfiguration.groups`, `pricingTemplates` и `dependencyRules`.

## Фаза 6: DataLoaders

Файлы:

- `services/catalog/src/loaders/`

Задачи:

1. Добавить loaders для:
   - bundle by id;
   - bundle by product id;
   - configuration by id;
   - configuration by variant id;
   - price rule by id;
   - pricing template by id;
   - bundle group by id;
   - bundle item by id;
   - dependency rule by id.
2. Обновить resolver constructors, чтобы они использовали loaders для single entity preloads.
3. Оставить collection fields repository-backed, если batch loader явно не нужен.

## Фаза 7: Product and Variant integration

Файлы:

- `services/catalog/src/repositories/product/ProductRepository.ts`
- `services/catalog/src/repositories/variant/VariantRepository.ts`
- product and variant scripts/workflows
- product and variant GraphQL schema/resolvers

Задачи:

1. Добавить поддержку product create/update для `kind = BUNDLE`, если она еще не exposed.
2. Гарантировать, что variant create/update всегда сохраняет `variant.kind = product.kind`.
3. Запретить изменение product с `BUNDLE` на `BASE`, пока существует строка `bundle`, если только dedicated conversion script не выполняет cleanup.
4. Expose bundle fields на `Product`, если admin нужен product-centric navigation:
   - `bundle: Bundle`
   - `bundleConfigurations: [BundleConfiguration!]!`
5. Expose assigned bundle configuration на `Variant`:
   - `bundleConfiguration: BundleConfiguration`
6. Обновить product deletion flow, чтобы он полагался на cascade или явно удалял bundle rows.

## Фаза 8: Catalog Storefront API

Файлы:

- `services/catalog/src/api/graphql-storefront/`
- storefront product/variant resolvers

Задачи:

1. Определить storefront contract для bundle configuration:
   - resolve by bundle variant id;
   - возвращать groups/items/options/pricing/dependency rules, необходимые checkout UI.
2. Добавить storefront-safe types, которые не expose admin-only metadata.
3. Отфильтровывать draft или unassigned bundle variants.
4. Resolve option/value selections для product bundle items.
5. Expose dependency rules в форме, которую storefront может детерминированно вычислить.
6. Expose price rules с currency-aware values, используя request currency.

## Фаза 9: Checkout integration

Файлы:

- `services/checkout/src/interfaces/gql-storefront-api/`
- checkout line and purchasable logic

Задачи:

1. Определить форму bundle checkout input:
   - bundle variant id;
   - selected item ids;
   - selected variant ids;
   - quantities;
   - selected option/value pairs для product-type items.
2. Resolve `bundle_configuration_variant` из selected bundle variant.
3. Валидировать selected items относительно configuration groups и item constraints.
4. Валидировать min/max group selections.
5. Валидировать min/max/default item quantities.
6. Вычислять dependency rules server-side.
7. Применять bundle price rules и item price rules.
8. Сохранять на checkout lines достаточно bundle composition data для order creation.
9. Гарантировать, что checkout line updates повторно валидируются относительно текущей configuration revision или snapshot.

Открытое design decision:

- Выбрать, хранит ли checkout configuration snapshot или только references на live catalog rows.
- Предпочтительно snapshotting selected bundle structure на checkout/order lines, если admin edits не должны менять существующие carts/orders.

## Фаза 10: Orders integration

Файлы:

- `services/orders/src/interfaces/gql-admin-api/`
- `services/orders/src/interfaces/gql-storefront-api/`
- order creation pipeline

Задачи:

1. Persist bundle parent line и component lines или structured bundle payload.
2. Сохранять selected configuration id и selected item ids.
3. Сохранять price calculation details, использованные на момент checkout.
4. Render bundle composition в admin order GraphQL.
5. Render bundle composition в storefront order GraphQL.

## Фаза 11: Pricing and Currency rules

Файлы:

- `services/catalog/src/repositories/pricing/`
- `services/catalog/src/resolvers/admin/PricingWidgetResolver.ts`
- checkout pricing logic

Задачи:

1. Нормализовать bundle price types между GraphQL, scripts и backend storage model.
2. Мапить amount rules по currency.
3. Использовать request currency или store default currency при resolving rule amount.
4. Заваливать validation, если отсутствует required currency amount.
5. Решить, может ли `DISCOUNT_FIXED` fallback на default currency conversion или должен быть exact-currency only.

## Фаза 12: Events and Search Index

Файлы:

- catalog events/handlers
- product search index repositories
- variant search index repositories

Задачи:

1. Emit product changed events, когда bundle root, configuration assignment, group/item/template/rule changes влияют на sellable data.
2. Reindex product и variants после bundle configuration changes.
3. Добавить bundle-specific search fields только если они нужны admin listings.
4. Оставить event subjects product-centric там, где существующие downstream consumers ожидают product ids.

## Фаза 13: Codegen, Build and Verification

Разрешенная проверка согласно project instructions:

- Запускать codegen/schema generation через `shopana-cli`, когда меняется GraphQL schema.
- Запускать build, когда нужно проверить новую версию кода.
- Не запускать tests.
- Не запускать `tsc` напрямую.

Рекомендуемая последовательность команд после реализации:

1. `yarn shopana codegen`
2. `yarn shopana build`

## Фаза 14: Rollout strategy

Рекомендуемый rollout:

1. Добавить новые repositories и scripts за новыми GraphQL operations.
2. Временно оставить старые GraphQL operations только если admin/frontend все еще от них зависит.
3. Пометить старые operations deprecated в schema comments.
4. Обновить admin frontend отдельным планом.
5. Удалить legacy operations после перехода consumers на configuration-scoped API.

Compatibility mapping, если старые operations нужно временно сохранить:

- `bundleGroups(productId)` resolves:
  - product -> bundle -> default or first configuration -> groups.
- `bundlePricingTemplates(productId)` resolves через ту же configuration.
- `dependencyRules(productId)` resolves через ту же configuration.
- legacy create mutations должны либо:
  - reject с понятной deprecation error;
  - либо resolve/create default configuration и писать через новые models.

Предпочтительно reject для legacy writes, чтобы избежать неоднозначного variant assignment.

## Backend completion checklist

- Backend bundle model files соответствуют целевой configuration-scoped модели.
- Catalog repository layer не содержит product-scoped bundle structure methods.
- Bundle script DTO используют `configurationId`, `priceRuleId` и translation inputs.
- Admin GraphQL schema exposes bundle root/configuration/assignment/price rule types.
- Admin GraphQL schema больше не exposes inline bundle `priceType/priceValue`.
- Generated GraphQL types обновлены через codegen.
- Catalog resolvers compile against generated types.
- Product and variant APIs consistently expose `kind`.
- Storefront catalog может resolve sellable bundle configuration by variant.
- Checkout validates bundle selections against configuration-scoped data.
- Orders persist bundle composition safely.
- Build passes.
