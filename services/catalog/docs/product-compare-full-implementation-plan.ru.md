# План полной реализации Product Compare

## Цель

Довести Product Compare до production-ready backend-функции с единой canonical
моделью в Catalog, полным management API для Admin и presentation-ready API для
Storefront.

Результат реализации:

- merchant создаёт comparison profiles, группы, поля и ENUM options;
- category получает прямой profile, а product — effective profile только через
  primary category и её ancestors;
- product-local features и variant options явно связываются с canonical fields;
- значения нормализуются при Admin-записи, а не во время Storefront-чтения;
- authenticated customer хранит упорядоченный список concrete variants в
  Customers;
- Storefront получает готовые матрицы с выровненными колонками/cells, актуальными
  price, availability и media;
- все операции store-scoped, transactional и fail closed при несовместимости.

План следует
`knowledge/vault/architecture/product-compare.ru.md`. Это clean-database cutover:
backfill, legacy tables, compatibility views, dual-read и dual-write запрещены.

## Scope

В scope входят:

- Catalog physical model и integrity rules;
- Catalog repositories, loaders, application read model и scripts;
- Catalog Admin GraphQL API;
- Catalog Storefront GraphQL API: `Product.comparison` и
  `Customer.productComparisons`;
- Customers Storefront mutations add/remove/clear и revision semantics;
- Customers Admin read-only view сохранённого selection;
- broker contracts между Catalog и Customers;
- Global IDs, codegen, federation composition, logging и cache invalidation;
- automated test coverage, которую нужно добавить в кодовую базу.

Не входят:

- Admin frontend screens и Storefront frontend components;
- сохранение guest selection на backend — guest хранит selection на клиенте;
- автоматическое сопоставление features/options по slug или translated name;
- cross-profile `COMMON_ONLY` до появления отдельной semantic policy/read model;
- snapshot цены, availability или media в comparison tables;
- произвольный Storefront query с переданным клиентом списком product/variant IDs.

## Текущее состояние

### Уже реализовано

- Canonical SQL baseline находится в
  `services/catalog/migrations/domains/0450_comparison/`.
- Drizzle tables и types находятся в
  `services/catalog/src/repositories/models/comparison.ts`.
- Integrity triggers уже покрывают leaf feature, `SINGLE`, immutable populated
  unit и mutual exclusion feature/option/`NOT_APPLICABLE`.
- Customers хранит один flat ordered selection в `customer_comparison` и
  `customer_comparison_item` с optimistic `revision`.
- Customers имеет transactional add/remove/clear scripts и Storefront mutations.
- Broker actions ограничивают вызовы по trusted caller:
  Customers selection читает только Catalog, Catalog variants валидирует только
  для Customers.
- Storefront SDL уже описывает `Customer.productComparisons`, comparison column
  connection, groups, rows и cells.
- Customers Admin API уже показывает read-only selection и федеративные ссылки
  на Product/Variant.

### Незавершённые части

- В Catalog нет `ComparisonRepository`, comparison loaders и management scripts.
- В Catalog Admin schema нет profiles, groups, fields, options, category
  assignment и product mapping API.
- Comparison entity types отсутствуют в `GlobalIdEntity` и Admin `node/nodes`.
- `ProductResolver` не реализует поле `comparison`.
- `ProductComparisonColumnConnectionResolver.groups()` всегда возвращает `[]`.
- Customer matrices группируют selection по category, но не проверяют effective
  profile compatibility и не строят canonical rows/cells.
- Product page comparison candidate selection, ordering и limit отсутствуют.
- Existing `getPublishedComparisonVariants()` проверяет базовую публикацию, но
  comparison read path ещё не переиспользует полный storefront visibility
  predicate.
- Product/category lifecycle scripts не валидируют compatibility существующих
  bindings при publish, primary-category move и profile assignment.
- Static configuration cache и comparison-specific observability отсутствуют.

## Обязательные архитектурные решения

### Владение данными

- Catalog владеет profiles, mappings, normalized values и matrix builder.
- Customers владеет только persisted selection:
  `(customer_id, revision, ordered product_id + variant_id)`.
- Pricing/inventory/media остаются у owning domains и читаются в текущем
  Storefront context.
- Customers никогда не читает Catalog DB, Catalog никогда не читает Customers DB.

### Tenant boundary

- `store_id` всегда берётся из trusted `ServiceContext`; GraphQL input не содержит
  `storeId`.
- Каждый repository query включает `store_id`.
- Каждый script отдельно проверяет, что все owner entities принадлежат текущему
  store, даже если это дополнительно защищено FK/trigger.
- Static cache key начинается с `store:${storeId}` и включает locale и profile
  revision. Contextual values не попадают в static cache.

### Effective profile

Для product profile разрешается так:

1. direct assignment primary category;
2. ближайший assignment среди ancestors;
3. `null`, если assignment отсутствует или resolved profile disabled.

Secondary categories не участвуют. Для batch resolution использовать один
store-scoped recursive CTE по `category.parent_id` или эквивалентный batch query;
не выполнять обход hierarchy по одному product в resolver.

### Совместимость

- В первой полной версии поддерживается только `FULL`: все columns одной matrix
  должны иметь один enabled effective `profile_id`.
- Incompatible persisted items не смешиваются и не сравниваются по `handle`.
- Если сохранённый item больше не published/visible, он не попадает в presentation
  model, но физически не удаляется read-запросом.
- Если category/profile configuration стала несовместимой, matrix не должна
  показывать частично неверные rows: группа пропускается с structured log, а
  management mutation, создающая несовместимость, должна быть отклонена заранее.

### Source identity

- Feature, option и localized value names не являются semantic identity.
- Один `(product_id, comparison_field_id)` имеет только один source kind:
  `FEATURE`, `OPTION` или `NOT_APPLICABLE`.
- Option можно привязать только к `SINGLE` field.
- Group feature (`is_group = true`) не может быть source.

### Значения и статусы

- `BOOLEAN`, `DECIMAL`, `ENUM`, `INTEGER`, `TEXT` хранятся в уже существующем
  typed payload.
- `DECIMAL`/`INTEGER` сохраняются в canonical unit; parsing и conversion
  выполняются в Admin script.
- `VALUE`: найден хотя бы один normalized source value.
- `MISSING`: field применим, но source или normalized mapping отсутствует.
- `NOT_APPLICABLE`: существует явная product/field запись.
- `UNAVAILABLE`: только временный runtime failure contextual source; он не
  записывается в configuration tables.
- `hasDifferences` сравнивает canonical typed values и status, а не
  `displayValue`.

### Ordering и limits

- Groups: `sort_index`, затем `id`.
- Fields: `sort_index`, затем `id` внутри group.
- ENUM options: `sort_index`, затем `id`.
- Persisted customer columns сохраняют `customer_comparison_item.position`.
- Product-page columns: variants текущего product первыми, затем category
  `lexo_rank`, product ID, default variant first, variant creation time и ID.
- Вынести limits в один Catalog policy module. Начальные значения:
  `20` columns для безаргументного `Product.comparison`, `100` как hard maximum
  одной Relay page. Не размазывать magic numbers по resolvers.

## Целевой Admin API

### Query contract

Добавить в `CatalogQuery`:

```graphql
comparisonProfile(id: ID!): ComparisonProfile
comparisonProfiles(
  first: Int
  after: String
  last: Int
  before: String
  where: ComparisonProfileWhereInput
  orderBy: [ComparisonProfileOrderByInput!]
): ComparisonProfileConnection!

productComparisonConfiguration(productId: ID!): ProductComparisonConfiguration!
```

Расширить owned types:

```graphql
type Category {
  directComparisonProfile: ComparisonProfile
  effectiveComparisonProfile: ComparisonProfile
}

type Product {
  effectiveComparisonProfile: ComparisonProfile
  comparisonConfiguration: ProductComparisonConfiguration!
}
```

`ComparisonProfile` является aggregate root и `Node`:

```graphql
type ComparisonProfile implements Node @key(fields: "id") {
  id: ID!
  handle: String!
  enabled: Boolean!
  revision: Int!
  name: String!
  missingLabel: String!
  notApplicableLabel: String!
  unavailableLabel: String!
  groups: [ComparisonGroup!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

`ComparisonGroup`, `ComparisonField` и `ComparisonFieldOption` также получают
global IDs и доступны через `node/nodes`. Binding rows отдельными Node не делать:
они представлены внутри `ProductComparisonConfiguration`.

`ProductComparisonConfiguration` возвращает:

- product;
- effective profile;
- profile compatibility status;
- ordered entries по всем fields effective profile;
- для каждого entry — source kind, bound feature/option, normalized local values
  либо explicit `NOT_APPLICABLE` reason;
- unmapped local leaf features/options отдельными candidate lists для Admin UI.

### Mutation contract

Добавить в `CatalogMutation`:

```graphql
comparisonProfileCreate(input: ComparisonProfileCreateInput!): ComparisonProfilePayload!
comparisonProfileUpdate(input: ComparisonProfileUpdateInput!): ComparisonProfilePayload!
comparisonProfileDelete(input: ComparisonProfileDeleteInput!): ComparisonProfileDeletePayload!
categoryComparisonProfileSet(input: CategoryComparisonProfileSetInput!): CategoryComparisonProfilePayload!
productComparisonConfigurationSync(
  input: ProductComparisonConfigurationSyncInput!
): ProductComparisonConfigurationPayload!
```

Profile create/update принимает весь nested aggregate: translations текущего
context locale, groups, fields и ENUM options. Nested items имеют optional `id`:
существующий ID обновляется, отсутствие ID создаёт UUIDv7, отсутствующий в полном
update списке item удаляется.

`comparisonProfileUpdate` принимает `expectedRevision`; `comparison_profile`
получает `revision integer not null default 0`. Вложенные изменения выполняются
одной compare-and-swap transaction и увеличивают aggregate revision один раз.

`categoryComparisonProfileSet` принимает `profileId: ID`; `null` удаляет direct
assignment и возвращает новый effective profile.

`productComparisonConfigurationSync` принимает:

- `productId` и `expectedProductRevision`;
- `profileId`, равный текущему effective profile;
- полный список field mappings;
- для каждого field ровно один из `feature`, `option`, `notApplicable`;
- feature/option local value IDs и typed normalized payloads.

GraphQL input для normalized value содержит nullable typed fields
`booleanValue`, `decimalValue`, `integerValue`, `textValue`, `fieldOptionId`.
Script, ориентируясь на target field, требует ровно один корректный payload.
GraphQL input union не имитировать неявно без semantic validation.

Все payloads возвращают entity/configuration и
`userErrors: [GenericUserError!]!`. Field paths должны указывать точное nested
место, например `groups.1.fields.2.canonicalUnit` или
`mappings.4.feature.values.0.value`.

### Admin error codes

Минимальный стабильный набор:

- `COMPARISON_PROFILE_NOT_FOUND`
- `COMPARISON_PROFILE_HANDLE_TAKEN`
- `COMPARISON_PROFILE_REVISION_CONFLICT`
- `COMPARISON_GROUP_NOT_OWNED`
- `COMPARISON_FIELD_NOT_OWNED`
- `COMPARISON_FIELD_IN_USE`
- `COMPARISON_FIELD_TYPE_INVALID`
- `COMPARISON_UNIT_INVALID`
- `COMPARISON_UNIT_POPULATED`
- `COMPARISON_ENUM_OPTION_INVALID`
- `COMPARISON_CATEGORY_PROFILE_CONFLICT`
- `COMPARISON_EFFECTIVE_PROFILE_MISMATCH`
- `COMPARISON_FEATURE_NOT_LEAF`
- `COMPARISON_SOURCE_CONFLICT`
- `COMPARISON_OPTION_REQUIRES_SINGLE`
- `COMPARISON_LOCAL_VALUE_NOT_OWNED`
- `COMPARISON_NORMALIZED_VALUE_INVALID`
- `PRODUCT_REVISION_CONFLICT`
- `INVALID_ID`

DB constraint errors переводить в эти user errors; raw PostgreSQL messages не
возвращать клиенту.

## Целевой Storefront API

### Сохранить существующую форму schema

Существующие contracts являются целевыми:

- `Product.comparison: ProductComparison`
- `Customer.productComparisons: CustomerProductComparisons!`
- `ProductComparison.columns(...)`
- `ProductComparisonColumnConnection.groups`
- `customerComparisonVariantAdd`
- `customerComparisonVariantRemove`
- `customerComparisonCategoryClear`

Не добавлять аргументы к `Product.comparison` и не добавлять root compare query с
arbitrary IDs.

### Product page flow

`Product.comparison` выполняет:

1. Проверяет storefront visibility текущего product.
2. Находит primary category и enabled effective profile.
3. Если profile отсутствует, возвращает `null`.
4. Выбирает все storefront-visible products этой primary category с тем же
   effective profile.
5. Выбирает concrete visible variants; не подставляет «первый available» вместо
   variant silently.
6. Применяет deterministic ordering и product-page limit.
7. Если customer authenticated, одним broker read получает saved variant IDs.
8. Передаёт columns в общий matrix builder.
9. Возвращает category, localized profile name как title, headers и готовые rows.

### Authenticated customer flow

`Customer.productComparisons` выполняет:

1. Проверяет, что federation reference совпадает с `ctx.customer.id`.
2. Читает Customers selection через broker один раз.
3. Batch-валидирует variant/product ownership и storefront visibility.
4. Сохраняет persisted order после удаления невидимых presentation items.
5. Группирует по текущей primary category.
6. Batch-resolves enabled effective profiles.
7. Оставляет только `FULL` compatible category groups.
8. Для каждой группы создаёт `ProductComparison`.
9. Relay pagination режет columns до matrix build.
10. `groups/rows/cells` строятся строго для текущей page: число cells каждой row
    равно числу `connection.nodes`, порядок совпадает.

### Общий matrix builder

Создать application service без зависимости от GraphQL classes, например:

```text
services/catalog/src/application/comparison/
  ProductComparisonService.ts
  ProductComparisonMatrixBuilder.ts
  ComparisonValueFormatter.ts
  comparison-policy.ts
  types.ts
```

Builder получает `storeId` из context, `profileId`, locale и ordered columns.
Алгоритм:

1. Batch-load profile translation, ordered groups, fields и field options.
2. Batch-load feature binding + normalized values для всех unique product IDs.
3. Batch-load option binding + normalized values.
4. Batch-load selected option links только для requested variant IDs.
5. Batch-load explicit N/A rows.
6. Для каждого `(field, column)` выбрать ровно один source path.
7. Для `MULTIPLE` сортировать values по local source order, затем canonical
   option order/typed value как tie-breaker.
8. Сформировать canonical comparison key, status и `displayValue`.
9. Вычислить `hasDifferences` по canonical keys/status.
10. Удалять полностью пустые groups нельзя: profile layout остаётся merchant-defined;
    row с `MISSING` cells также возвращается.

Formatter:

- `BOOLEAN` — locale-aware configured labels;
- `DECIMAL`/`INTEGER` — `Intl.NumberFormat` + canonical unit registry;
- `ENUM` — localized `comparison_field_option_translation.name`;
- `TEXT` — trimmed normalized value;
- `MULTIPLE` — детерминированное locale-aware joining;
- missing/N/A/unavailable — labels из profile translation.

Если перевод текущего locale отсутствует, fallback order:
`ctx.locale -> store.defaultLocale -> handle`. Fallback должен быть batch-based и
одинаковым для Admin/Storefront.

### Contextual headers

Column headers собираются через существующие Storefront resolvers/loaders:

- product title;
- exact variant;
- variant media с fallback на product media;
- current currency price/compare-at price;
- current inventory availability;
- `savedForComparison` по exact `variant_id`.

Static profile/mapping data разрешено cache-ировать. Price, stock, media fallback
и customer saved state не cache-ировать как часть static matrix.

## Persistence adjustments

Текущую clean-DB baseline не заменять новыми compatibility migrations. До
реализации API провести audit SQL и Drizzle parity и дополнить существующие
`0450_comparison` migrations:

1. `comparison_profile.revision integer not null default 0` и index `(id, revision)`.
2. В `comparison_profile_translation` добавить non-empty labels:
   `missing_label`, `not_applicable_label`, `unavailable_label` с нейтральными
   defaults для baseline.
3. Проверить store-scoped indexes всех hot read paths:
   `(store_id, profile_id)`, `(store_id, product_id, field_id)`,
   `(store_id, field_id)` и category profile lookup.
4. Сохранить UUIDv7 generation только в application scripts.
5. Не добавлять `store_id` в PK/FK в обход зафиксированной canonical architecture;
   owner/store consistency валидируется scripts/repositories.
6. Не редактировать `dist/migrations` вручную — он создаётся build pipeline.

Удаление canonical field/profile остаётся `RESTRICT`, если есть category
assignments, bindings или N/A. Aggregate update должен сначала объяснить
dependency через user error, а не полагаться на generic FK failure.

## Repository и Loader слой

### Catalog repositories

Добавить:

```text
services/catalog/src/repositories/comparison/
  ComparisonRepository.ts
  ComparisonReadRepository.ts
  comparison-types.ts
```

`ComparisonRepository` отвечает за transactional management:

- profile aggregate create/update/delete;
- group/field/option diff-sync с временным безопасным reorder;
- translation upsert текущего locale;
- category direct assignment set/clear;
- product source/value mapping full sync;
- dependency checks и profile/product revision CAS;
- explicit lock helpers для field и `(product, field)`.

`ComparisonReadRepository` отвечает за batch/read model:

- profiles connection и `getByIds`;
- translations для locale + default locale;
- groups/fields/options by profile IDs;
- direct/effective profiles by category/product IDs;
- comparison configuration by product IDs;
- bindings/normalized values/N/A by product IDs;
- selected option values by variant IDs;
- visible candidates для product-page comparison.

Оба repository используют только `this.connection` и всегда фильтруют
`this.storeId`. Подключить их в `Repository.ts`.

### Loaders

Добавить `ComparisonLoader.ts` и зарегистрировать в `Loader.ts`:

- profile by ID;
- profiles/groups/fields/options batch relations;
- localized translations;
- direct/effective profiles;
- product comparison configuration;
- product bindings и N/A;
- field option translation.

Matrix builder может вызывать batch repository methods напрямую как один
application read, но GraphQL entity resolvers должны использовать loaders.

## Business scripts

Добавить в `services/catalog/src/scripts/comparison/`:

- `ComparisonProfileCreateScript`
- `ComparisonProfileUpdateScript`
- `ComparisonProfileDeleteScript`
- `CategoryComparisonProfileSetScript`
- `ProductComparisonConfigurationSyncScript`
- shared DTO, validation, error mapping и index barrel.

Все пять scripts transactional. Profile update и product configuration sync
являются aggregate replacement operations: partial DB state после user error
запрещён.

### Lifecycle guards

Встроить comparison validation в существующие flows:

- product publish/status update: все active mappings/N/A должны соответствовать
  effective profile;
- `CategorySetProductPrimaryScript` и любой другой primary-category write path:
  вычислить будущий effective profile до изменения и отклонить несовместимый
  move;
- category profile set/clear: проверить products самой category и affected
  descendants, для которых изменится nearest inherited assignment;
- category hierarchy move: проверить изменение inherited effective profile для
  affected subtree;
- feature sync/update: нельзя превратить bound leaf в group; удаление source
  оставляет field `MISSING` через cascade, но result/log должен это отражать;
- option sync/update: удалённые values каскадно удаляют normalization; field
  становится `MISSING` для соответствующих variants;
- field semantic update: type/cardinality/unit нельзя менять, пока существуют
  normalized bindings; безопасный rename/reorder разрешён;
- profile disable разрешён без удаления configuration, но сразу исключает
  profile из Storefront read model.

Для потенциально больших affected category subtrees выполнять bounded set-based
validation query. Не загружать каждый product отдельным script/resolver loop.

## Admin resolver слой

Добавить:

```text
services/catalog/src/api/graphql-admin/schema/comparison.graphql
services/catalog/src/resolvers/admin/ComparisonProfileResolver.ts
services/catalog/src/resolvers/admin/ComparisonGroupResolver.ts
services/catalog/src/resolvers/admin/ComparisonFieldResolver.ts
services/catalog/src/resolvers/admin/ComparisonProfileConnectionResolver.ts
services/catalog/src/resolvers/admin/ProductComparisonConfigurationResolver.ts
```

Изменить:

- Admin `QueryResolver` и `MutationResolver`;
- Admin `ResolverRegistry` и resolver type registry;
- `ProductResolver` и `CategoryResolver`;
- Admin server schema list, если schema discovery не glob-based;
- generated Admin types/schemas только через codegen.

На GraphQL boundary:

- decode profile/group/field/field-option/product/category/feature/option/value
  global IDs;
- repositories/scripts получают только raw UUID;
- deleted entity IDs в payload снова encode;
- `node/nodes` распознаёт все четыре comparison Node types;
- mutation methods используют generated Zod schemas и `kernel.runScript()`.

Добавить в `packages/shared-graphql-guid/src/core.ts`:

- `ComparisonProfile`
- `ComparisonGroup`
- `ComparisonField`
- `ComparisonFieldOption`

Binding IDs не нужны: binding addressing выполняется owner/source IDs.

## Storefront resolver слой

Изменить:

- `services/catalog/src/resolvers/storefront/ProductResolver.ts` — реализовать
  `comparison()`;
- `ProductComparisonResolvers.ts` — заменить placeholder groups на общий matrix
  builder и убрать ручной N+1 header resolution;
- Storefront `ResolverRegistry` — зарегистрировать comparison constructors;
- `VariantRepository.getPublishedComparisonVariants()` — заменить/расширить
  единым storefront visibility batch method;
- Catalog broker action `resolveCustomerComparisonVariants` — использовать тот
  же visibility predicate, что и GraphQL read path.

Cursor должен кодировать как минимум version, category ID и stable item key, а
не только array index. Decode проверяет version/category и возвращает
`BAD_USER_INPUT` для чужого/устаревшего cursor. Pagination выполняется до matrix
build.

Matrix key и row/group keys строятся из stable UUID identities, а не handles:

- matrix: profile + category;
- column: variant ID;
- group: comparison group ID;
- row: comparison field ID.

## Customers hardening

Существующий Customers implementation сохранить, но завершить следующие
правила:

- add валидирует exact visible variant через Catalog до DB write;
- duplicate add остаётся idempotent и не увеличивает revision;
- remove принимает exact variant; отсутствующий variant возвращает business
  error и не меняет revision;
- clear category получает список текущих matching variants из Catalog, затем
  удаляет их одной transaction и compact positions;
- revision conflict всегда возвращает actual revision в стабильном error
  extension/details contract;
- все writes блокируют active customer и comparison aggregate;
- физическая uniqueness остаётся по variant, не product — несколько variants
  одного product разрешены;
- Customers Admin comparison остаётся read-only;
- Catalog read никогда не очищает stale selection скрытым side effect.

Если вводится per-category saved limit, его проверка должна быть atomic: Catalog
возвращает category/effective profile metadata, Customers проверяет limit под
aggregate lock до append. До отдельного product decision не добавлять скрытый
лимит, отличный от GraphQL page hard cap.

## Cache, invalidation и consistency

Cacheable:

- profile/group/field/option definitions;
- translations;
- category effective profile;
- product bindings и normalized values.

Не cacheable как static comparison data:

- price;
- availability/inventory;
- selected customer state;
- current publication/visibility без полного context key;
- media, если media policy/context может менять result.

Cache key включает `storeId`, locale, entity ID и profile/product revision.
После management mutation либо revision меняет key, либо выполняется explicit
eviction. Category assignment/hierarchy move инвалидирует effective-profile
entries affected subtree.

## Observability

Structured logs без normalized customer values:

- `comparison.profile.created|updated|deleted`;
- `comparison.category_profile.set|cleared`;
- `comparison.product_configuration.synced`;
- `comparison.matrix.built` с profile/category, column/row counts и duration;
- `comparison.matrix.item_skipped` с reason code;
- broker failures и incompatible persisted groups.

Metrics:

- matrix build duration;
- columns/rows/cells per matrix;
- cache hit/miss;
- skipped stale selections;
- revision conflicts;
- Admin validation failures by code.

Не логировать customer PII и свободный `TEXT` normalized payload.

## Test coverage, которую нужно добавить

Тестовые файлы добавляются как часть реализации, но запускать `test`, `tsc`, dev
server или browser нельзя по правилам проекта.

### Database/repository

- store isolation для каждого read/write method;
- effective profile: direct, nearest ancestor, none, disabled;
- profile aggregate revision conflict;
- handle/sort uniqueness и safe reorder;
- typed payload CHECK cases;
- ENUM ownership;
- `SINGLE` cardinality;
- feature/option/N/A mutual exclusion, включая concurrent attempts;
- populated unit/type change rejection;
- category subtree compatibility validation;
- batch reads сохраняют input ordering contract.

### Scripts

- happy path и каждый stable user error;
- transaction rollback при nested validation failure;
- mapping full sync create/update/delete;
- primary category/profile/hierarchy lifecycle guards;
- profile disable/enable behavior;
- exact revision increments/no-op semantics.

### Storefront

- `Product.comparison = null` без effective profile;
- candidate visibility, deterministic order и limit;
- multiple variants одного product;
- feature and option rows в одной matrix;
- all five value types и `MULTIPLE`;
- `VALUE/MISSING/NOT_APPLICABLE/UNAVAILABLE`;
- semantic `hasDifferences` независимо от display formatting;
- forward/backward Relay pagination и invalid cursor;
- cells count/order совпадает с nodes page;
- locale/default-locale/handle fallback;
- authenticated/guest `savedForComparison`;
- customer stale/incompatible items fail closed.

### Customers/federation

- add/remove/clear optimistic concurrency;
- duplicate add idempotency;
- exact caller restrictions на broker actions;
- cross-store and cross-customer access denial;
- Admin federation Product/Variant references;
- composed schema содержит одно ownership definition для каждого field.

## Порядок реализации

### Этап 1. Зафиксировать contracts и baseline

1. Сверить SQL migrations и Drizzle model 1:1.
2. Добавить profile revision и fallback labels в clean baseline.
3. Добавить comparison Global ID entities.
4. Добавить Admin SDL и уточнить Storefront descriptions/cursor contract.
5. Выполнить Catalog/Customers codegen через `shopana-cli`.

Gate: schema генерируется, federation ownership не конфликтует, generated files
не редактируются вручную.

### Этап 2. Реализовать data access

1. Добавить management/read repositories.
2. Зарегистрировать их в Repository aggregate.
3. Добавить comparison loaders.
4. Реализовать batch effective-profile и storefront candidate queries.
5. Добавить repository/integrity test cases.

Gate: нет direct DB access из resolvers/scripts, все queries store-scoped и
transaction-aware.

### Этап 3. Реализовать Admin business logic

1. Profile create/update/delete scripts.
2. Category assignment script.
3. Product configuration full-sync script.
4. Lifecycle compatibility guards.
5. Stable database-error mapping.

Gate: каждый management use case atomic, conflict/ownership/type ошибки
возвращаются как `userErrors`.

### Этап 4. Подключить Admin GraphQL API

1. Query/connection/entity/configuration resolvers.
2. Mutation resolvers с generated Zod validation.
3. `node/nodes`, registry и Global ID wiring.
4. Product/Category comparison fields.
5. Повторный Admin codegen.

Gate: полный merchant configuration flow возможен только через public Admin API,
без raw DB операций.

### Этап 5. Реализовать общий matrix builder

1. Canonical cell resolver.
2. Locale/unit formatter.
3. Semantic difference calculator.
4. Static cache boundary.
5. Batch performance/ordering tests.

Gate: builder не импортирует GraphQL resolver classes и не выполняет N+1.

### Этап 6. Завершить Storefront API

1. `Product.comparison` candidate flow.
2. Customer selection grouping/compatibility flow.
3. Relay pagination before matrix build.
4. Header composition и saved state.
5. Удалить placeholder `groups() { return []; }`.
6. Повторный Storefront codegen и federation schema build.

Gate: Storefront только рендерит готовую matrix и нигде не сопоставляет local
feature slugs.

### Этап 7. Harden Customers integration

1. Перепроверить revision/idempotency semantics.
2. Унифицировать Catalog visibility validation.
3. Добавить broker/federation/error-path coverage.
4. Убедиться, что read path не мутирует stale selection.

Gate: add/remove/clear безопасны при retry и concurrent tabs.

### Этап 8. Генерация и проверка

Использовать `shopana-cli` для:

1. Catalog и Customers GraphQL codegen.
2. Federation/schema composition check.
3. Catalog, Customers, shared GraphQL GUID package и bootstrap build.

По правилам проекта не запускать `test`, `tsc`, dev/start server или browser.
Generated `dist` и resolver types обновлять только соответствующими командами,
не вручную. Changeset-файл вручную не редактировать.

## Definition of Done

- Admin может создать, локализовать, перестроить, включить/выключить и удалить
  свободный от dependencies profile.
- Admin может назначить profile category и увидеть direct/effective result.
- Admin может атомарно настроить feature, option и N/A mappings продукта.
- Несовместимые publish/primary-category/profile/hierarchy changes отклоняются.
- Storefront `Product.comparison` возвращает deterministic bounded matrix.
- Storefront `Customer.productComparisons` сохраняет persisted order и возвращает
  Relay-paged aligned cells.
- Все statuses и value types форматируются server-side.
- Price, availability, media и saved state относятся к exact variant.
- Нет N+1 по profiles, fields, mappings, selected options или translations.
- Нет cross-store reads/writes и raw UUID leakage на GraphQL boundary.
- Customer mutations корректны при retries и revision conflicts.
- Admin/Storefront generated contracts и federation schema согласованы.
- Relevant packages успешно проходят build через `shopana-cli`.
- В коде нет compatibility/backfill paths и не остаётся placeholder empty matrix.

