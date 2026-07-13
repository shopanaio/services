# План single-commit cutover списков search synonyms и product boosts на PostgreSQL VIEW + Drizzle Relay Query

## Цель

Одним commit без слоя обратной совместимости переписать Admin GraphQL списки:

- `listingQuery.search.synonymGroups`;
- `listingQuery.search.productBoosts`.

После cutover оба списка должны:

- читаться из dedicated non-materialized PostgreSQL views;
- использовать `@shopana/drizzle-query` через `createQuery` и
  `createRelayQuery`;
- иметь Relay cursor pagination `first/after/last/before`;
- принимать generated `WhereInput` и `OrderByInput`;
- считать `totalCount` по точно тому же tenant-scoped `where`, что и page;
- поддерживать server-side фильтры и сортировки, нужные будущим Admin
  таблицам;
- возвращать прежние search entities, но через `edges/pageInfo`, без legacy
  `nodes + limit/offset` list contract.

План следует текущему catalog pattern:

- physical SQL view в `migrations/domains/9000_read_models`;
- typed Drizzle view в `src/repositories/models`;
- exported relay query рядом с repository;
- generated GraphQL filters/order fields из relay query;
- repository-owned tenant scope и одинаковый `where` для page/count;
- connection resolver, который не содержит SQL и pagination logic.

## Scope

В scope входят:

- PostgreSQL read-model views и supporting indexes;
- Drizzle view models;
- relay query builders и connection repository methods;
- breaking Admin GraphQL list contract;
- generated GraphQL filter/order schema;
- list connection resolvers и mapping global IDs;
- service resolver codegen, Admin schema composition и Admin generated API
  types;
- manual API verification нового контракта.

Не входят:

- реализация самих Admin страниц, таблиц, форм и mutation hooks;
- изменение `listingMutation.search.settingsUpdate`;
- изменение search runtime, synonym expansion или boost application;
- денормализация catalog product titles в Listing;
- materialized views и refresh workflows;
- compatibility aliases, deprecated arguments или временный dual-read.

Admin pages сейчас являются пустыми shell-компонентами. Этот cutover готовит
полный backend contract для их следующей интеграции, но не добавляет UI в этот
commit.

## Текущий baseline

### GraphQL

`services/listing/src/api/graphql-admin/schema/search.graphql` сейчас объявляет:

```graphql
synonymGroups(
  locale: LocaleCode
  limit: Int = 20
  offset: Int = 0
): SearchSynonymGroupConnection!

productBoosts(
  locale: LocaleCode
  limit: Int = 20
  offset: Int = 0
): SearchProductBoostConnection!
```

Обе connection shapes содержат только:

```graphql
nodes: [...!]!
totalCount: Int!
```

Публичных `where`, `orderBy`, cursors и `pageInfo` нет.

### Repositories

`SearchSynonymRepository.listPage()` и
`SearchProductBoostRepository.listPage()`:

- вручную строят offset query;
- поддерживают только optional locale filter;
- имеют hard-coded sort `locale ASC, name ASC, id ASC`;
- отдельно считают `count(*)`;
- после page query отдельно загружают child values/phrases/products.

### Storage

Canonical write model уже нормализован:

- `search_synonym_group` + `search_synonym_value`;
- `search_product_boost` + `search_product_boost_phrase` +
  `search_product_boost_product`.

Read model для Admin table отсутствует. Прямой join всех boost children
размножил бы строки `phrases × products`, сломал cursor pagination и завысил
`totalCount`. Поэтому relay query должен работать по view с ровно одной строкой
на group/boost.

## Обязательные решения cutover

1. Старые `limit`, `offset`, top-level `locale` arguments удаляются сразу.
2. Старое поле connection `nodes` удаляется сразу.
3. Новые connections содержат только `edges`, `pageInfo`, `totalCount`.
4. Locale становится обычным generated filter field:
   `where: { locale: { _eq: ... } }`.
5. Если `where.locale` отсутствует, список показывает конфигурацию всех locales
   текущего store. Нельзя неявно ограничивать эти Admin lists текущей request
   locale.
6. Store scope всегда добавляется repository и никогда не публикуется в
   generated GraphQL filters/order fields.
7. Search by synonym terms и boost phrases выполняется по агрегированным text
   columns view.
8. Product filter выполняется точно по Product global IDs через explicit
   `meta.productIds`, а не через substring search по сериализованному массиву.
9. Listing не копирует product title из Catalog. Admin product picker ищет по
   title через Catalog API, после чего передаёт выбранные Product global IDs в
   Listing.
10. Mutation contract и domain write repositories остаются без изменений.

## Target files

Новые source files:

```text
services/listing/migrations/domains/9000_read_models/9000_read_models__search_configuration.sql
services/listing/src/repositories/models/searchConfigurationListViews.ts
services/listing/scripts/generate-filters.ts
services/listing/src/resolvers/admin/SearchSynonymGroupConnectionResolver.ts
services/listing/src/resolvers/admin/SearchProductBoostConnectionResolver.ts
services/listing/src/api/graphql-admin/schema/__generated__/base-filters.graphql
services/listing/src/api/graphql-admin/schema/__generated__/filters.graphql
```

Изменяемые source files:

```text
services/listing/src/repositories/models/index.ts
services/listing/src/repositories/search/SearchSynonymRepository.ts
services/listing/src/repositories/search/SearchProductBoostRepository.ts
services/listing/src/api/graphql-admin/schema/search.graphql
services/listing/src/api/graphql-admin/schema/filters.graphql
services/listing/src/api/graphql-admin/server.ts
services/listing/src/resolvers/admin/SearchResolvers.ts
services/listing/src/resolvers/admin/ResolverRegistry.ts
services/listing/src/resolvers/admin/index.ts
services/listing/codegen.ts
```

Generated artifacts:

```text
services/listing/src/resolvers/admin/generated/types.ts
services/listing/src/resolvers/admin/generated/schemas.ts
infra/federation/schema/listing-admin.graphql
infra/federation/supergraph-admin.graphql
admin/src/graphql/types.ts
```

Точные federation output names нужно брать из текущего shopana schema flow; не
создавать новые параллельные schema artifacts, если CLI обновляет существующие.

## 1. PostgreSQL read-model views

Добавить handwritten `node-pg-migrate` SQL под
`migrations/domains/9000_read_models`. Listing, как и Catalog, использует
handwritten canonical SQL migrations; Drizzle model описывает runtime query
shape, но не заменяет migration source.

### `listing.search_synonym_group_list_view`

View должна возвращать ровно одну строку на `search_synonym_group`:

| Column | Type | Назначение |
| --- | --- | --- |
| `store_id` | `uuid` | internal tenant scope |
| `id` | `uuid` | `group_id`, relay tie-breaker |
| `locale` | `listing.locale_code` | filter/order/table column |
| `name` | `varchar(128)` | name filter/order |
| `enabled` | `boolean` | status filter/order |
| `version` | `int` | diagnostics/filter/order |
| `terms` | `text` | filter-only aggregated search text |
| `values_count` | `int` | table field/filter/order |
| `value_items` | `jsonb` | ordered list output hydration |
| `created_at` | `timestamptz` | filter/order |
| `updated_at` | `timestamptz` | default order/filter |

`terms` строится как ordered `string_agg` из `display_value` и
`normalized_value`. Эти варианты нужны для case-insensitive Admin search по
тому, что видит пользователь, и по canonical normalized form.

`value_items` строится как ordered `jsonb_agg` объектов:

```json
{ "value": "...", "position": 1 }
```

`COALESCE(..., '[]'::jsonb)` и `COALESCE(..., '')` сохраняют non-null Drizzle
shape даже при временно неконсистентной dev database. Canonical writes всё равно
требуют от двух до двадцати synonym values.

### `listing.search_product_boost_list_view`

View должна возвращать ровно одну строку на `search_product_boost`:

| Column | Type | Назначение |
| --- | --- | --- |
| `store_id` | `uuid` | internal tenant scope |
| `id` | `uuid` | `boost_id`, relay tie-breaker |
| `locale` | `listing.locale_code` | filter/order/table column |
| `name` | `varchar(128)` | name filter/order |
| `enabled` | `boolean` | status filter/order |
| `version` | `int` | diagnostics/filter/order |
| `phrases` | `text` | filter-only aggregated search text |
| `phrases_count` | `int` | table field/filter/order |
| `phrase_items` | `jsonb` | ordered phrase output hydration |
| `product_ids` | `uuid[]` | ordered output hydration only |
| `products_count` | `int` | table field/filter/order |
| `created_at` | `timestamptz` | filter/order |
| `updated_at` | `timestamptz` | default order/filter |

`phrases` агрегирует `display_phrase` и `normalized_phrase`.

`phrase_items` содержит ordered objects:

```json
{ "phrase": "...", "position": 1 }
```

`product_ids` строится через `array_agg(product_id ORDER BY position)`.

Phrase и product aggregates должны вычисляться раздельными aggregate CTE или
`LEFT JOIN LATERAL`. Нельзя join-ить обе child tables в один aggregate set,
иначе появится cross product и неверные counts/JSON arrays.

### View invariants

- Один parent row равен одной view row.
- Все joins включают `store_id` и parent ID.
- Child output сохраняет `position` order.
- Views не материализованы: изменения mutation workflow видны следующему read
  без refresh.
- View не содержит catalog tables и product title.
- Search text columns являются read-model implementation detail и не
  возвращаются как entity output fields.

### Supporting indexes

Добавить только индексы на base tables:

```sql
CREATE INDEX ... ON listing.search_synonym_group
  (store_id, updated_at DESC, group_id DESC);

CREATE INDEX ... ON listing.search_product_boost
  (store_id, updated_at DESC, boost_id DESC);

CREATE INDEX ... ON listing.search_product_boost_product
  (store_id, product_id, boost_id);
```

Последний индекс обязателен для exact product scope: текущий primary key
`(store_id, boost_id, product_id)` не оптимален для lookup от product к boosts.

Существующие unique indexes child tables уже покрывают parent aggregation по
`(store_id, parent_id, position)`.

Обычный PostgreSQL view индексировать нельзя. `ILIKE '%term%'` по aggregated
text ожидаемо сканирует store-scoped search configuration. Для bounded Admin
configuration это принимается в первом cutover. Не вводить materialized view,
refresh workflow или `pg_trgm` без измеренной необходимости.

## 2. Typed Drizzle view models

Создать
`services/listing/src/repositories/models/searchConfigurationListViews.ts` по
catalog pattern с explicit columns и `.as(sql\`...\`)`.

Нужны exports:

```ts
export const searchSynonymGroupListView = ...;
export const searchProductBoostListView = ...;

export type SearchSynonymGroupListView =
  typeof searchSynonymGroupListView.$inferSelect;
export type SearchProductBoostListView =
  typeof searchProductBoostListView.$inferSelect;
```

Typing requirements:

- `valueItems` — typed `jsonb` array `{ value: string; position: number }[]`;
- `phraseItems` — typed `jsonb` array `{ phrase: string; position: number }[]`;
- `productIds` — typed UUID array;
- count columns — `integer().notNull()`;
- IDs and timestamps повторяют canonical table types.

Экспортировать views из `repositories/models/index.ts`, чтобы они вошли в
Drizzle database schema.

SQL в Drizzle model и migration должен совпадать по именам, nullability,
casts, ordering и aggregate semantics. Не оставлять две разные логические
версии view.

## 3. Relay query builders

В соответствующих repositories экспортировать query builders.

Целевая форма synonym query:

```ts
export const searchSynonymGroupRelayQuery = createRelayQuery(
  createQuery(searchSynonymGroupListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeSearchSynonymGroupGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "searchSynonymGroup", tieBreaker: "id" },
);
```

Целевая форма boost query:

```ts
export const searchProductBoostRelayQuery = createRelayQuery(
  createQuery(searchProductBoostListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeSearchProductBoostGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "searchProductBoost", tieBreaker: "id" },
);
```

Global ID mappers должны использовать:

- `GlobalIdEntity.SearchSynonymGroup`;
- `GlobalIdEntity.SearchProductBoost`.

Mapper должен работать для shorthand, `_eq`, `_neq`, `_in`, `_notIn` и
logical nesting через стандартный `mapWhereFields` transformation.

Экспортировать:

```ts
export type SearchSynonymGroupRelayInput =
  InferRelayInput<typeof searchSynonymGroupRelayQuery>;

export type SearchProductBoostRelayInput =
  InferRelayInput<typeof searchProductBoostRelayQuery>;
```

Для repository-level product scope добавить отдельный input, не смешивая
GraphQL `meta` с generated relay type:

```ts
export type SearchProductBoostConnectionInput =
  SearchProductBoostRelayInput & {
    productIds?: readonly string[];
  };
```

Здесь `productIds` уже являются decoded internal UUID после resolver boundary.

Не использовать list views для create/update/delete, locks, runtime synonym
loading или runtime boost matching. Они являются только Admin list read model.

## 4. Repository connection methods

Удалить:

- `SearchSynonymGroupPage`;
- `SearchProductBoostPage`;
- оба `listPage()`;
- offset pagination validation, если после удаления она больше нигде не
  используется.

Добавить:

```ts
getConnection(args: SearchSynonymGroupRelayInput)
getConnection(args: SearchProductBoostConnectionInput)
```

### Synonym connection

Repository merge:

```ts
const mergedWhere: SearchSynonymGroupRelayInput["where"] = {
  _and: [
    { storeId: { _eq: this.storeId } },
    ...(where ? [where] : []),
  ],
};
```

Default order:

```ts
[
  { field: "updatedAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

Pagination normalization до вызова relay builder:

- если не переданы ни `first`, ни `last`, использовать `first: 20`;
- отклонять одновременные `first` и `last`;
- отклонять одновременные `after` и `before`;
- `after` допустим только для forward pagination;
- `before` допустим только для backward pagination;
- page size ограничивается relay query `maxLimit(100)`.

`.defaultLimit(20)` оставить как query metadata, но не полагаться на него вместо
нормализации: текущий relay builder требует выбрать forward или backward
direction через `first/last`.

Page и count запускаются параллельно:

```ts
const [result, totalCount] = await Promise.all([
  searchSynonymGroupRelayQuery.execute(this.connection, executeInput),
  searchSynonymGroupRelayQuery.count(this.connection, {
    where: mergedWhere,
  }),
]);
```

В `executeInput.filters` передавать стабильный request fingerprint без
pagination:

```ts
filters: {
  storeId: this.storeId,
  where: where ?? null,
  orderBy: effectiveOrderBy,
}
```

Это включает filter/order semantics в cursor hash. При смене table filters или
sort `drizzle-query` должен проигнорировать старый seek cursor и начать страницу
для нового request (`filtersChanged = true`), а не применять seek values от
другого набора.

### Product boost connection и product scope

GraphQL `meta.productIds` не является generated view filter. Resolver
декодирует Product global IDs, repository строит tenant-scoped set boost IDs:

```sql
SELECT DISTINCT boost_id
FROM listing.search_product_boost_product
WHERE store_id = $storeId
  AND product_id = ANY($productIds)
```

Семантика — `ANY`: boost попадает в результат, если содержит хотя бы один из
выбранных products.

Rules:

- `meta` отсутствует — product scope не добавляется;
- `meta.productIds` непустой — добавить `{ id: { _in: matchingBoostIds } }`;
- пустой `meta.productIds` — deterministic empty connection, а не отсутствие
  фильтра;
- если matching IDs нет — использовать impossible UUID condition и не
  выполнять unscoped list;
- lookup всегда содержит `store_id = this.storeId`.

Затем product scope объединяется с public `where` и internal store filter
через `_and`. `execute()` и `count()` получают один и тот же финальный
`mergedWhere`.

Boost cursor fingerprint дополнительно включает normalized `productIds`:

```ts
filters: {
  storeId: this.storeId,
  where: where ?? null,
  orderBy: effectiveOrderBy,
  productIds: [...productIds].sort(),
}
```

До fingerprint и scope lookup IDs нужно deduplicate и сортировать. Порядок IDs
в `meta` не должен менять fingerprint одной и той же product scope.

Default order идентичен synonym connection:

```ts
[
  { field: "updatedAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

### Connection result

View row уже содержит ordered child output в `valueItems`, `phraseItems` и
`productIds`, поэтому connection не должен делать N+1 или второй batch hydrate.

Repository result:

```ts
{
  edges: result.edges.map(({ cursor, node }) => ({ cursor, node })),
  pageInfo: result.pageInfo,
  totalCount,
}
```

Это даёт одну snapshot-consistent SQL page query и устраняет race между page
ID selection и отдельной child hydration.

`filtersChanged` остаётся internal relay diagnostic, а не новым GraphQL field.
Если builder проигнорировал stale cursor из-за нового fingerprint, repository
нормализует `pageInfo` как страницу без continuation cursor:

- forward request: `hasPreviousPage = false`;
- backward request: `hasNextPage = false`.

Так GraphQL connection не сообщает наличие предыдущей/следующей страницы только
из-за переданного, но фактически проигнорированного cursor.

## 5. Generated filter и order contract

Добавить `services/listing/scripts/generate-filters.ts`.

Script генерирует:

```text
src/api/graphql-admin/schema/__generated__/base-filters.graphql
src/api/graphql-admin/schema/__generated__/filters.graphql
```

Использовать:

- `generateBaseFilterTypes()`;
- `generateWhereInputType()`;
- `generateOrderByInputType()`.

Как и в Catalog, задать explicit `GraphQLFieldType` maps, чтобы generator не
угадывал public scalar contract для UUID, enum и timestamp columns. Минимально:

- `id` → `ID`;
- `locale`, `name`, `terms`, `phrases` → `String`;
- `enabled` → `Boolean`;
- versions/counts → `Int`;
- `createdAt`, `updatedAt` → `DateTime`.

Не редактировать generated GraphQL files вручную.

Generated headers должны быть deterministic и не содержать timestamp, чтобы
повторный запуск на неизменном query builder не создавал diff.

### Base filters cutover

Текущий `schema/filters.graphql` вручную содержит base filter types и facet
candidate inputs. После cutover:

- `StringFilter`, `IDFilter`, `IntFilter`, `FloatFilter`, `BooleanFilter`,
  `DateTimeFilter`, `SortDirection` приходят только из generated
  `__generated__/base-filters.graphql`;
- manual `filters.graphql` сохраняет только listing-owned/manual facet
  candidate inputs;
- duplicate base type declarations отсутствуют.

Generator запускается с `includeDateTimeScalar: false` equivalent, потому что
`DateTime` уже объявлен service scalar schema.

### Synonym generated fields

`SearchSynonymGroupWhereInput` должен публиковать:

- `id: IDFilter`;
- `locale: StringFilter`;
- `name: StringFilter`;
- `enabled: BooleanFilter`;
- `version: IntFilter`;
- `terms: StringFilter`;
- `valuesCount: IntFilter`;
- `createdAt: DateTimeFilter`;
- `updatedAt: DateTimeFilter`;
- `_and`, `_or`, `_not`.

`SearchSynonymGroupOrderField` должен публиковать:

- `id`;
- `locale`;
- `name`;
- `enabled`;
- `version`;
- `valuesCount`;
- `createdAt`;
- `updatedAt`.

Не публиковать в where/order:

- `storeId`;
- `valueItems`.

Не публиковать `terms` в order fields: aggregated search text нужен для
filtering, но не имеет полезной table sort semantics.

### Product boost generated fields

`SearchProductBoostWhereInput` должен публиковать:

- `id: IDFilter`;
- `locale: StringFilter`;
- `name: StringFilter`;
- `enabled: BooleanFilter`;
- `version: IntFilter`;
- `phrases: StringFilter`;
- `phrasesCount: IntFilter`;
- `productsCount: IntFilter`;
- `createdAt: DateTimeFilter`;
- `updatedAt: DateTimeFilter`;
- `_and`, `_or`, `_not`.

`SearchProductBoostOrderField` должен публиковать:

- `id`;
- `locale`;
- `name`;
- `enabled`;
- `version`;
- `phrasesCount`;
- `productsCount`;
- `createdAt`;
- `updatedAt`.

Не публиковать в where/order:

- `storeId`;
- `phraseItems`;
- `productIds`.

Не публиковать `phrases` в order fields.

Причина отдельного `meta.productIds`: `@shopana/drizzle-query` сейчас не имеет
typed PostgreSQL array-containment GraphQL operator. Нельзя притворяться, что
`uuid[]` — это `StringFilter`, или фильтровать UUID substring search.

## 6. Breaking GraphQL SDL

Целевой list contract в `search.graphql`:

```graphql
type ListingSearchQuery {
  settings: SearchSettings

  synonymGroup(id: ID!): SearchSynonymGroup
  synonymGroups(
    first: Int
    after: String
    last: Int
    before: String
    where: SearchSynonymGroupWhereInput
    orderBy: [SearchSynonymGroupOrderByInput!]
  ): SearchSynonymGroupConnection!

  productBoost(id: ID!): SearchProductBoost
  productBoosts(
    first: Int
    after: String
    last: Int
    before: String
    where: SearchProductBoostWhereInput
    orderBy: [SearchProductBoostOrderByInput!]
    meta: SearchProductBoostsMetaInput
  ): SearchProductBoostConnection!

  explain(query: String!, locale: LocaleCode!): SearchExplain!
}

input SearchProductBoostsMetaInput {
  """Match boosts containing any selected Product global ID."""
  productIds: [ID!]!
}
```

Entity output получает count fields, нужные table cells и server sorting:

```graphql
type SearchSynonymGroup {
  id: ID!
  locale: LocaleCode!
  name: String!
  enabled: Boolean!
  version: Int!
  values: [SearchSynonymValue!]!
  valuesCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type SearchProductBoost {
  id: ID!
  locale: LocaleCode!
  name: String!
  enabled: Boolean!
  version: Int!
  phrases: [SearchProductBoostPhrase!]!
  phrasesCount: Int!
  productIds: [ID!]!
  productsCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

Новые Relay connection shapes:

```graphql
type SearchSynonymGroupConnection {
  edges: [SearchSynonymGroupEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SearchSynonymGroupEdge {
  node: SearchSynonymGroup!
  cursor: String!
}

type SearchProductBoostConnection {
  edges: [SearchProductBoostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SearchProductBoostEdge {
  node: SearchProductBoost!
  cursor: String!
}
```

Удалить без `@deprecated` и aliases:

- `locale`, `limit`, `offset` list arguments;
- `SearchSynonymGroupConnection.nodes`;
- `SearchProductBoostConnection.nodes`.

Singular `synonymGroup(id)` и `productBoost(id)` остаются с прежней семантикой.
Mutation schema остаётся неизменной.

## 7. Resolver layer

### Query namespace resolver

`ListingSearchQueryResolver` больше не вызывает `listPage()` и не маппит
`nodes` inline.

Он должен:

- передавать synonym args в
  `ResolverRegistry.searchSynonymGroupConnection()`;
- декодировать `meta.productIds` как `GlobalIdEntity.Product`;
- возвращать `BAD_USER_INPUT` для invalid Product global ID с точным field
  path;
- передавать normalized boost args в
  `ResolverRegistry.searchProductBoostConnection()`.

Public generated `where.id` не нужно вручную обходить в resolver: его
рекурсивно обрабатывает `relayQuery.mapWhereFields()`.

### Connection resolvers

Добавить два focused resolver classes по существующему listing facet connection
pattern:

- `$preload()` вызывает только repository `getConnection()`;
- `edges()` сохраняет repository cursor order;
- view node маппится в существующий GraphQL entity shape;
- `pageInfo()` возвращает drizzle relay `PageInfo`;
- `totalCount()` возвращает filtered count.

Mapping rules:

- view `id` кодируется как `SearchSynonymGroup` или `SearchProductBoost` global
  ID;
- boost `productIds` кодируются как `GlobalIdEntity.Product`;
- `valueItems` становятся `values`;
- `phraseItems` становятся `phrases`;
- count fields берутся из view, а не вычисляются повторно в resolver.

Existing singular aggregate mappers тоже должны заполнить новые non-null count
fields:

- `valuesCount = aggregate.values.length`;
- `phrasesCount = aggregate.phrases.length`;
- `productsCount = aggregate.products.length`.

Общие map helpers из `SearchResolvers.ts` можно вынести в focused module, если
иначе connection resolvers начнут импортировать private functions. Не
дублировать global ID mapping в трёх местах.

### Resolver registry

Добавить lazy factory methods для обеих connections. Не создавать repositories
или SQL builders внутри registry.

## 8. Admin UI consumption contract

Хотя UI implementation не входит в commit, backend acceptance должен покрыть
следующие реальные table operations.

### Synonyms table

Поддерживаемые table columns:

- name;
- locale;
- enabled;
- values count;
- created at;
- updated at.

Text search по name или terms строится клиентом через generated logical input:

```graphql
where: {
  _or: [
    { name: { _containsi: $query } }
    { terms: { _containsi: $query } }
  ]
}
```

### Product boosts table

Поддерживаемые table columns:

- name;
- locale;
- enabled;
- phrases count;
- products count;
- created at;
- updated at.

Text search по name или phrase:

```graphql
where: {
  _or: [
    { name: { _containsi: $query } }
    { phrases: { _containsi: $query } }
  ]
}
```

Exact product filter:

```graphql
meta: {
  productIds: [$selectedProductGlobalId]
}
```

Поиск picker options по product title остаётся запросом в Catalog. Listing
получает только выбранные IDs. Это сохраняет service ownership и не делает
Admin filter зависимым от stale copied product names.

### Sort mapping

Admin table передаёт generated field names напрямую:

```graphql
orderBy: [
  { field: name, direction: asc }
]
```

или:

```graphql
orderBy: [
  { field: updatedAt, direction: desc }
]
```

Никакого UI `sortBy` enum mapper в resolver не должно быть. Tie-breaker `id`
добавляет relay query.

## 9. Schema loading и codegen

### Listing service

Обновить `services/listing/codegen.ts` schema glob, чтобы он включал
`schema/__generated__/*.graphql` по catalog pattern.

Обновить `api/graphql-admin/server.ts`, добавив:

```text
__generated__/base-filters.graphql
__generated__/filters.graphql
```

`build.config.json` уже копирует `schema/**/*.graphql`; менять его нужно только
если фактический build докажет, что nested generated files не попадают в
`dist/schema`.

Generation order обязателен:

1. Сгенерировать listing filter SDL из relay queries.
2. Запустить listing service GraphQL codegen через shopana-cli.
3. Export/compose Admin schema через shopana-cli.
4. Запустить Admin GraphQL codegen approved project flow.

Не редактировать вручную:

- generated GraphQL filters;
- service generated resolver types/schemas;
- composed federation schema;
- `admin/src/graphql/types.ts`.

## 10. Single-commit cutover sequence

Все пункты ниже должны попасть в один commit. Между фазами нельзя публиковать
ветку/версию, в которой schema уже новая, а repository/resolver ещё legacy, или
наоборот.

1. Добавить SQL views и supporting indexes.
2. Добавить Drizzle view models и exports.
3. Добавить relay query builders и connection result types.
4. Реализовать repository `getConnection()` и exact product scope.
5. Добавить filter generator и generated SDL.
6. Переключить GraphQL SDL с offset/nodes на Relay edges/pageInfo.
7. Добавить connection resolvers и registry factories.
8. Переключить `ListingSearchQueryResolver` на connections.
9. Удалить legacy `listPage`, page interfaces и offset validation.
10. Запустить service codegen, schema export/composition и Admin codegen.
11. Применить migration к disposable dev database через shopana-cli и выполнить
    manual GraphQL verification.
12. Выполнить build через shopana-cli, поскольку cutover создаёт новую версию
    backend/schema code.
13. Проверить diff и создать один commit, содержащий весь cutover.

Запрещено добавлять:

- feature flag старого list path;
- `nodes` alias поверх edges;
- hidden conversion offset → cursor;
- старые `limit/offset/locale` args как deprecated;
- параллельные `synonymGroupsV2`/`productBoostsV2`;
- resolver fallback на base tables при отсутствии view.

Rollback для dev-only проекта — revert целого commit и пересоздание/миграция
disposable database. Dual schema не поддерживается.

## 11. Verification

### Static drift checks

Проверить через `rg`:

- старые `listPage` и page interfaces отсутствуют;
- list SDL больше не содержит `limit`, `offset`, top-level `locale`;
- обе connections не содержат `nodes`;
- generated types существуют ровно в generated files;
- base filter types не объявлены дважды;
- `storeId`, JSON aggregates и UUID array не попали в public generated inputs;
- repositories используют `this.connection`;
- `execute` и `count` получают один `mergedWhere`;
- product scope содержит `storeId`.

### Migration/view checks

Через shopana-cli migration flow на clean/disposable database проверить:

- обе views создаются после canonical search tables;
- каждая parent entity даёт ровно одну view row;
- `value_items`, `phrase_items`, `product_ids` сохраняют position order;
- counts совпадают с child rows;
- phrase и product aggregation не перемножают строки;
- reverse product index существует.

### Manual GraphQL checks

1. Default first page обеих connections.
2. Forward pagination `first/after` без повторов и пропусков.
3. Backward pagination `last/before`.
4. Sort по `name ASC` и `updatedAt DESC`.
5. Synonym filter по `name`.
6. Synonym filter по `terms`.
7. Boost filter по `name`.
8. Boost filter по `phrases`.
9. Boost filter по одному и нескольким Product global IDs.
10. Invalid Product global ID возвращает `BAD_USER_INPUT`.
11. `where.locale` и `where.enabled` комбинируются через `_and`.
12. Text search строится через `_or` name/terms или name/phrases.
13. `totalCount` совпадает с полным filtered set, а не с размером page или всеми
    store rows.
14. Cursor от другого sort/filter/product scope игнорируется как seek cursor;
    query возвращает страницу нового request и repository result фиксирует
    `filtersChanged = true` согласно drizzle relay contract.
15. Другой store не видит rows, counts или product membership текущего store.
16. Singular queries и `settingsUpdate` mutation продолжают работать.

### Запрещённые проверки

Не запускать `test` и `tsc` по инструкции проекта.

Build запускать через shopana-cli, когда нужна новая compiled version; для этого
breaking cutover build обязателен в финальной проверке.

## 12. Acceptance criteria

### Database/read model

- Существуют `listing.search_synonym_group_list_view` и
  `listing.search_product_boost_list_view`.
- Каждая view содержит одну строку на parent entity.
- Child arrays/JSON и counts детерминированно упорядочены по `position`.
- Product boost view не имеет phrase × product cross multiplication.
- Product reverse lookup покрыт индексом `(store_id, product_id, boost_id)`.

### Repository

- Оба Admin lists выполняются через `createRelayQuery` поверх Drizzle view.
- Internal `storeId` filter добавляется всегда.
- Public `where` не может переопределить tenant scope.
- `execute()` и `count()` используют один merged filter.
- Default order стабилен через `updatedAt DESC, id DESC`.
- Public custom order остаётся cursor-stable через `id` tie-breaker.
- Exact product scope принимает Product global IDs и работает по association
  table, не по serialized text.

### GraphQL

- Старые offset arguments и `nodes` удалены.
- Оба списка имеют Relay `edges/pageInfo/totalCount`.
- `where/orderBy` types сгенерированы из соответствующих relay queries.
- Synonyms фильтруются по name, terms, locale, enabled, dates и counts.
- Boosts фильтруются по name, phrases, locale, enabled, dates, counts и selected
  product IDs.
- Table sorting доступен по name, locale, enabled, counts, version и dates.
- IDs в output остаются global IDs правильного entity type.
- Singular read и unified settings mutation не изменены.

### Generation/operations

- Generated SDL/TS/Admin types получены генераторами, не ручными edits.
- Admin supergraph composition проходит с новым breaking contract.
- Listing build проходит через shopana-cli.
- `test` и `tsc` не запускались.
- Changeset file вручную не редактировался. Если release process потребует
  changeset, он создаётся только разрешённой npm generation command и входит в
  тот же commit; иначе changeset не добавляется.
- Весь cutover находится в одном commit без compatibility code.

## Риски и принятые решения

### Product title search принадлежит Catalog

Listing не имеет canonical product title и не должен делать cross-service SQL
join. Admin ищет product по названию в Catalog picker, затем фильтрует boosts по
global IDs. Это является целевым, а не временным ограничением.

### Aggregated text filter делает store-scoped scan

Synonym/boost configuration bounded и значительно меньше product index.
Non-materialized view и `ILIKE` достаточно для первого Admin cutover. При
доказанной проблеме отдельный follow-up может добавить dedicated search column,
materialized projection или trigram strategy.

### JSON read-model columns дублируют child representation

Это не второй source of truth: view вычисляет JSON на чтении из canonical child
tables. Плюс — list page не делает N+1 и возвращает entity output из одного SQL
snapshot.

### Breaking client contract

Legacy client сейчас отсутствует, а Admin pages ещё не интегрированы. Поэтому
compatibility layer только увеличит сложность. Service schema, composed schema и
Admin generated types обновляются атомарно в одном commit.
