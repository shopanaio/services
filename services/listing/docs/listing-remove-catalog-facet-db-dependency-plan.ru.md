# План удаления DB-зависимости listing от `catalog.facet*`

## Контекст

Сейчас `listing` читает catalog facet tables напрямую, хотя ownership для
facets находится в `catalog`. Это нарушает service boundary: storefront listing
read path зависит от physical schema `catalog.facet`, `catalog.facet_value`,
`catalog.facet_translation` и `catalog.facet_value_translation`.

Цель этого плана:

- убрать из `listing` любые SQL/Drizzle обращения к `catalog.facet*`;
- убрать runtime-шаг `facet handle -> facet_id/facet_value_id`;
- перевести listing facet index на handle-based ключи;
- возвращать catalog facet данные через supergraph entity references, а не через
  прямой join к catalog DB.

Важное проектное ограничение: stage/prod данных и пользователей нет. Поэтому
эта работа выполняется как breaking refactor, без compatibility layer,
dual-write, dual-read и SQL backfill для сохранения старого listing index.
После изменения схемы listing index пересобирается/засеивается заново уже в
новом формате.

Терминология:

- `facetHandle` в этом документе означает публичный handle facet. В текущем
  catalog коде это поле называется `Facet.slug`.
- `facetValueHandle` означает root/group `FacetValue.handle`, который
  уникален внутри `(store_id, facet_id)`.
- Для текущего формата handle `:` безопасен как delimiter для group values:
  `Facet.slug` и group `FacetValue.handle` валидируются slug regex без `:`.
  Source handles для `OPTION`/`FEATURE` могут содержать `:`, но storefront
  listing должен работать с group/root handles.

## Найденные зависимости

### Drizzle runtime model в listing

`services/listing/src/repositories/models/catalogFacetRuntime.ts`

- объявляет `catalogSchema.table("facet")`;
- объявляет `catalogSchema.table("facet_value")`;
- экспортируется из `services/listing/src/repositories/models/index.ts`.

Эти модели должны быть удалены в рамках этой же работы, а не оставлены как
fallback.

### Storefront facet resolution repository

`services/listing/src/repositories/storefront/StorefrontFacetResolutionRepository.ts`

- импортирует `catalogFacetRuntime` и `catalogFacetValueRuntime`;
- `resolveFacetFilters()` делает join:
  - `catalog.facet` по `f.slug = requested.facet_slug`;
  - `catalog.facet_value` по `fv.facet_id = f.id` и `fv.handle = requested.value_handle`;
  - parent group value через self-join `catalog.facet_value`;
- `getFacetValues()` берет candidate `value_key` из listing index, затем снова
  join-ит `catalog.facet`/`catalog.facet_value`, чтобы вернуть slug/type/handle.

Это основной `handle -> id` слой, который должен исчезнуть.

### Inline SQL facet resolution

`services/listing/src/repositories/storefront/sql/compileFacetResolutionSql.ts`

- CTE `resolved_facets` join-ит `catalog.facet` и `catalog.facet_value`;
- CTE дополнительно обрабатывает `PRICE` и `IN_STOCK` как catalog facets.

Этот SQL подключается через `compileCoreListingSql()` и используется page,
total, virtual facets и counts queries.

### Facet metadata query

`services/listing/src/repositories/storefront/sql/compileFacetsQuerySql.ts`

- строит `facet_values` через:
  - `catalog.facet`;
  - `catalog.facet_translation`;
  - `catalog.facet_value`;
  - `catalog.facet_value_translation`;
- возвращает labels, ui type, swatch id и order из catalog DB.

Целевое состояние: listing не возвращает эти catalog-owned поля локально.
Listing возвращает только references, а labels/ui/swatch/id приходят из catalog
через supergraph.

### Facet counts query

`services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`

- `compileFacetCountsCtesSql()` всегда включает `compileFacetResolutionSql()`;
- `compileDiscoveredFacetValueCtesSql()` строит `visible_facet_values` через
  `catalog.facet` и `catalog.facet_value`;
- option facet count isolation использует `facet_id`.

Целевое состояние: counts работают на `facetHandle`/`valueKey`, без catalog join.

### GraphQL mapping

`services/listing/src/resolvers/admin/listingFacetMapper.ts`

- мапит catalog metadata в local `ListingFacet`:
  - `id = facet.facetSlug`;
  - `label = facet.facetLabel`;
  - `uiType = facet.uiType`;
  - values `id/label/swatch` из facet value rows.

Целевое состояние: mapper должен возвращать entity references:

- `Facet` reference по handle;
- `FacetValue` reference по `(facetHandle, facetValueHandle)`.

### Storefront repository types/input

`services/listing/src/repositories/storefront/types.ts`

- `StorefrontListingFilterInput.kind = "facet"` сейчас хранит
  `facetSlug + valueHandles`;
- `ResolvedFacetFilterGroup` хранит `facetId + facetType + valueKeys`;
- `StorefrontListingFacetResult` хранит `facetId/facetSlug/facetLabel/facetType/uiType`;
- `StorefrontListingFacetValueResult` хранит `facetValueId/valueHandle/valueLabel/swatchId`.

`services/listing/src/resolvers/admin/listingInput.ts`

- нормализует `tag`, `variantOption`, `productFacet`, `variantFacet` в общий
  `kind: "facet"` без явного product/variant facet scope;
- последующая product/option маршрутизация зависит от catalog `facet_type`.

Целевое состояние: product/variant scope должен быть известен из input, без
catalog lookup.

### Listing DB schema

`services/listing/migrations/domains/0100_listing_index/0100_listing_index__tables.sql`

- `listing.listing_posting_bitmap.value_key` generic и уже может хранить
  handle-based value key;
- `listing.listing_option_signature_value.facet_id uuid NOT NULL`;
- индекс `idx_listing_option_signature_value_facet_signature` построен по
  `(store_id, facet_id, signature_key, value_key)`.

Целевое состояние для option signatures: заменить `facet_id` на
`facet_handle`/`facet_value_handle` и индексировать по handle columns.

## Целевой контракт

### Listing index keys

Для facet postings использовать stable handle key:

```text
value_key = <facetHandle>:<facetValueHandle>
```

Примеры:

```text
color:black
size:xl
tag:summer
material:cotton
```

Правила:

- `facetHandle` берется из catalog facet public handle (`Facet.slug` сейчас);
- `facetValueHandle` берется из root/group `FacetValue.handle`;
- source child handles не являются storefront listing filter key;
- если нужно поддержать source child input, этот alias должен резолвиться до
  group handle до попадания в listing, но не через listing DB join к catalog.

### Filter input без `handle -> id` resolution

Repository input должен сразу нести facet scope:

```ts
export type StorefrontListingFilterInput =
  | {
      kind: "facet";
      scope: "product" | "variant";
      facetHandle: string;
      valueHandles: string[];
    }
  | { kind: "vendor"; vendorIds: string[] }
  | { kind: "price"; minPriceMinor?: number; maxPriceMinor?: number }
  | { kind: "in_stock"; value: boolean };
```

Resolver mapping:

- `productFacet` -> `kind: "facet", scope: "product"`;
- `variantFacet` -> `kind: "facet", scope: "variant"`;
- legacy `tag` -> product facet with `facetHandle = "tag"`;
- legacy `variantOption` -> variant facet with `facetHandle = name`.

`ResolvedFacetFilterGroup` должен стать handle-native:

```ts
export interface ResolvedFacetFilterGroup {
  facetHandle: string;
  valueKeys: string[];
}
```

`StorefrontFacetResolutionRepository.resolveFilterPlan()` больше не должен
делать SQL. Он группирует normalized filters и строит `valueKey` напрямую:

```ts
const valueKey = `${facetHandle}:${facetValueHandle}`;
```

Unknown facet/value больше не должен валидироваться через catalog DB внутри
listing. Для несуществующего key listing возвращает пустой результат или нулевой
count. Форматные ошибки остаются validation errors.

### Virtual facets

`PRICE` и `IN_STOCK` не должны идти через catalog facet resolution в listing.

- Price filter использует `ListingPriceRangeFilter`;
- availability filter использует `available`;
- virtual listing facets остаются локальными `ListingFacet`-подобными объектами,
  потому для них нет catalog `FacetValue` postings.

Если catalog будет иметь facet rows для price/in-stock, listing все равно не
должен читать их из DB. Связь с ними должна быть отдельным supergraph/UI
решением, не частью generic facet postings.

## GraphQL через supergraph

### Catalog schema

Catalog должен стать federation owner для facet entities по handle-based keys.
Текущие `Facet` и `FacetValue` уже существуют, но `Facet`/`FacetValue` не
объявлены как federation entities.

Минимальный целевой вариант, совместимый с handle-based listing index:

```graphql
type Facet implements Node @key(fields: "slug") {
  id: ID!
  slug: String!
  label: String!
  uiType: FacetUIType!
  facetType: FacetType!
}

type FacetValue implements Node @key(fields: "facetHandle handle") {
  id: ID!
  facetHandle: String!
  facet: Facet!
  handle: String!
  label: String!
  swatch: FacetSwatch
  sortIndex: Int!
  enabled: Boolean!
}
```

Если catalog в рамках этой же работы переименовывает `slug` в `handle`,
использовать `handle` вместо `slug`, но смысл ключа остается тем же.

Catalog resolver changes:

- добавить `Facet.__resolveReference` по `{ slug }` внутри текущего project/store
  context;
- добавить `FacetValue.__resolveReference` по `{ facetHandle, handle }`;
- добавить resolver `FacetValue.facetHandle`, который возвращает handle parent
  facet;
- оставить `id` как catalog-owned Global ID (`GlobalIdEntity.Facet` /
  `GlobalIdEntity.FacetValue`).

### Listing schema

Listing subgraph должен расширить catalog entities только для возврата
references:

```graphql
extend type Facet @key(fields: "slug", resolvable: false) {
  slug: String! @external
}

extend type FacetValue @key(fields: "facetHandle handle", resolvable: false) {
  facetHandle: String! @external
  handle: String! @external
}
```

Local listing result должен перестать владеть catalog metadata:

```graphql
type ListingFacet {
  facet: Facet!
  values: [ListingFacetValue!]!
}

type ListingFacetValue {
  value: FacetValue!
  count: Int!
  selected: Boolean!
  input: JSON!
}
```

Поля, которые должны уйти из listing-owned result:

- `ListingFacet.id`;
- `ListingFacet.label`;
- `ListingFacet.uiType`;
- `ListingFacetValue.id`;
- `ListingFacetValue.label`;
- `ListingFacetValue.swatch`.

Эти данные запрашиваются у catalog через supergraph:

```graphql
facets {
  facet {
    id
    slug
    label
    uiType
  }
  values {
    value {
      id
      handle
      label
      swatch { id }
    }
    count
    selected
    input
  }
}
```

Так listing возвращает только entity reference keys, а catalog отдает IDs,
labels, UI metadata и swatches.

### Federation resolution flow

Listing не должен иметь `Facet.id` или `FacetValue.id`. Он должен вернуть
достаточный federation reference.

Для facet:

```ts
{
  __typename: "Facet",
  slug: "color",
}
```

Router передаст этот reference в catalog, если клиент запросил catalog-owned
fields:

```graphql
facets {
  facet {
    id
    label
    uiType
  }
}
```

Catalog resolver:

```ts
Facet: {
  __resolveReference(reference, ctx) {
    return ctx.loaders.facetBySlug.load(reference.slug);
  }
}
```

Фактический catalog lookup:

```sql
SELECT *
FROM catalog.facet
WHERE store_id = :storeId
  AND slug = :slug
```

Для facet value одного `handle` недостаточно, потому `FacetValue.handle`
уникален только внутри facet. Listing должен вернуть пару:

```ts
{
  __typename: "FacetValue",
  facetHandle: "color",
  handle: "black",
}
```

Router передаст reference в catalog:

```graphql
values {
  value {
    id
    label
    swatch { id }
  }
}
```

Catalog resolver:

```ts
FacetValue: {
  __resolveReference(reference, ctx) {
    return ctx.loaders.facetValueByFacetHandleAndHandle.load({
      facetHandle: reference.facetHandle,
      handle: reference.handle,
    });
  }
}
```

Фактический catalog lookup:

```sql
SELECT fv.*
FROM catalog.facet f
JOIN catalog.facet_value fv
  ON fv.store_id = f.store_id
 AND fv.facet_id = f.id
WHERE f.store_id = :storeId
  AND f.slug = :facetHandle
  AND fv.handle = :handle
  AND fv.parent_id IS NULL
```

Итоговое правило:

- `Facet` reference key: `slug` или будущий `handle`;
- `FacetValue` reference key: `facetHandle + handle`;
- listing result не должен содержать только `valueHandle` без `facetHandle`,
  потому такой reference нельзя однозначно дорезолвить в catalog.

## DB migration для handle-based option index

### `listing.listing_posting_bitmap`

Таблица уже generic:

```sql
PRIMARY KEY (store_id, entity_type, field, value_key)
```

Ее можно оставить без новых колонок, если `value_key` становится
`facetHandle:facetValueHandle`.

Для replacement scope использовать prefixes:

```text
valueKeyPrefixes = ["color:", "size:", "tag:"]
```

### `listing.listing_option_signature_value`

Заменить физическую зависимость от `facet_id` breaking migration-ом. Так как
данных сохранять не нужно, не добавлять временные nullable columns и не делать
backfill. Финальная таблица должна хранить handle identity:

```sql
DROP INDEX listing.idx_listing_option_signature_value_facet_signature;

ALTER TABLE listing.listing_option_signature_value
  DROP COLUMN facet_id,
  ADD COLUMN facet_handle text NOT NULL,
  ADD COLUMN facet_value_handle text NOT NULL;

CREATE INDEX idx_listing_option_signature_value_facet_handle_signature
  ON listing.listing_option_signature_value (
    store_id,
    facet_handle,
    signature_key,
    value_key
  );
```

Можно оставить `value_key` как denormalized composite key, но все places,
которые сейчас читают или группируют `facet_id`, должны читать `facet_handle`.

Старые rows формата `facet_id:facet_value_id` не переносить. После migration
выполнить rebuild listing index из producer payload в новом формате.

## SQL/query changes

### Удалить `compileFacetResolutionSql`

Удалить CTE chain:

- `requested_facets`;
- `resolved_facets`;
- `missing_requested_facets`;
- `unsupported_price_facet_filters`;
- `stock_facet_values`;
- `stock_facet_filter`;
- `facet_resolution_guard`.

Page/total/facets/counts queries больше не должны иметь `facetErrorCode` /
`facetErrorValue`. Ошибки формата должны возникать до SQL, в TypeScript
normalization.

### `compileListingInputSql`

`facet_filters_json` должен хранить уже handle-native rows:

```json
[
  {
    "scope": "product",
    "facet_handle": "material",
    "value_handle": "cotton",
    "value_key": "material:cotton"
  },
  {
    "scope": "variant",
    "facet_handle": "size",
    "value_handle": "xl",
    "value_key": "size:xl"
  }
]
```

### `compileListingProductMatchesSql`

Product facet groups и variant facet groups должны использовать готовые
`valueKeys`, как сейчас, но group isolation должен быть по `facetHandle`, а не
`facetId`.

### `compileFacetsQuerySql`

Заменить catalog metadata CTE на discovered handle rows из listing index:

- product facets: `listing.listing_posting_bitmap`
  where `entity_type = 'product' and field = 'facet'`;
- variant facets: `listing.listing_option_signature_value` или variant posting
  rows, но preferred source для visible option values - option signature table,
  потому она уже deduplicated by signature/product.

Result rows должны содержать только:

```ts
interface FacetMetadataSqlRow {
  facetHandle: string | null;
  facetScope: "product" | "variant" | null;
  valueHandle: string | null;
  valueKey: string | null;
}
```

Ordering:

- без catalog DB listing не может знать `facet.lexo_rank` и
  `facet_value.sort_index`;
- сразу использовать deterministic order by `facetHandle ASC, valueHandle ASC`;
- если catalog order должен сохраняться, нужен event-fed listing projection
  with `facet_rank` and `value_sort`, но это должна быть listing-owned read
  model, не direct read из `catalog.facet*`.

### `compileFacetCountsQuerySql`

`visible_facet_values` должен стать handle-native:

```text
facet_handle
facet_scope
value_handle
value_key
```

Заменить все usages:

- `facet_id` -> `facet_handle`;
- `facet_type = 'OPTION'` -> `facet_scope = 'variant'`;
- `facet_type IN ('TAG', 'FEATURE')` -> `facet_scope = 'product'`;
- option strategy rows and estimates group by `facetHandle`;
- active option filter value rows use `(facet_handle, value_key)`.

Особенно заменить index-dependent joins к
`listing.listing_option_signature_value`:

```sql
-- before
sv.facet_id = required.required_facet_id::uuid

-- after
sv.facet_handle = required.required_facet_handle
```

## Producer/indexing changes

Любой producer listing postings должен перестать отправлять
`facet_id:facet_value_id`.

Старый producer contract не поддерживать параллельно. Все fixtures, seed scripts
и будущие sync producers переводятся на handle-based payload одним изменением.

Новый payload:

```ts
productFacetValueKeys: ["material:cotton", "tag:summer"]
variantFacetValueKeys: ["color:black", "size:xl"]
```

Для `listing_option_signature_value` producer должен также передавать:

```ts
{
  facetHandle: "color",
  facetValueHandle: "black",
  valueKey: "color:black"
}
```

E2E seed changes:

- `e2e/fixtures/listing/seed.ts` больше не должен строить `facetUuid:valueUuid`
  через `decodeGlobalId`;
- `mapFacetValueKeys()` должен строить keys из facet slug + group value handle;
- `e2e/utils/listingSeed.ts` должен заполнять `facet_handle` и
  `facet_value_handle`, а не парсить uuid из `valueKey.split(":")[0]`.

## File-level checklist

### Listing

- `services/listing/src/repositories/models/catalogFacetRuntime.ts` - удалить.
- `services/listing/src/repositories/models/index.ts` - убрать export.
- `services/listing/src/repositories/storefront/StorefrontFacetResolutionRepository.ts`
  - заменить SQL resolution на pure normalization или удалить repository.
- `services/listing/src/repositories/storefront/types.ts`
  - переименовать `facetSlug` -> `facetHandle`;
  - убрать `facetId`, `facetValueId`, `facetType` из runtime groups;
  - добавить `facetScope`.
- `services/listing/src/repositories/storefront/sql/compileFacetResolutionSql.ts`
  - удалить файл и imports.
- `services/listing/src/repositories/storefront/sql/compileListingInputSql.ts`
  - передавать handle-native `facet_filters_json`.
- `services/listing/src/repositories/storefront/sql/compileMatchesSql.ts`
  - убрать подключение `compileFacetResolutionSql()`.
- `services/listing/src/repositories/storefront/sql/compileFacetsQuerySql.ts`
  - убрать catalog joins, возвращать reference keys.
- `services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`
  - заменить `facet_id` на `facet_handle`.
- `services/listing/src/repositories/storefront/sql/resultMappers.ts`
  - убрать facet resolution guard;
  - мапить facet/value references by handle keys.
- `services/listing/src/resolvers/admin/listingInput.ts`
  - сохранить product/variant facet scope;
  - убрать ожидание catalog validation.
- `services/listing/src/resolvers/admin/listingFacetMapper.ts`
  - возвращать `Facet`/`FacetValue` references, не labels/ui/swatch.
- `services/listing/src/api/graphql-admin/schema/listing.graphql`
  - добавить extensions для `Facet`/`FacetValue`;
  - заменить local metadata fields на entity reference fields.
- `services/listing/migrations/domains/0100_listing_index/*`
  - добавить migration для `facet_handle`/`facet_value_handle`;
  - заменить option signature index.

### Catalog

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`
  - добавить `@key` для `Facet`;
  - добавить handle-based `@key` для `FacetValue`;
  - добавить `facetHandle` field на `FacetValue` или использовать nested key,
    если federation/codegen flow это стабильно поддерживает.
- `services/catalog/src/api/graphql-admin/resolvers/types.ts`
  - добавить `Facet.__resolveReference`;
  - добавить `FacetValue.__resolveReference`;
  - при необходимости добавить `FacetSwatch.__resolveReference`, потому listing
    уже возвращает `FacetSwatch` reference.
- `services/catalog/src/resolvers/admin/FacetValueResolver.ts`
  - добавить `facetHandle()`.

### E2E/fixtures

- `e2e/fixtures/listing/seed.ts`
  - заменить `mapFacetValueKeys()` на handle-based key builder.
- `e2e/utils/listingSeed.ts`
  - заменить `facetIds = valueKey.split(":")[0]` на parsing
    `facetHandle/facetValueHandle`;
  - вставлять `facet_handle`/`facet_value_handle`.

## Acceptance criteria

- В `services/listing/src` нет упоминаний:
  - `catalog.facet`;
  - `catalog.facet_value`;
  - `catalogFacetRuntime`;
  - `catalogFacetValueRuntime`.
- Нет compatibility path для старого `facet_id:facet_value_id`.
- Нет SQL backfill, который читает `catalog.facet*` ради сохранения старого
  listing index.
- `listing` не импортирует Drizzle models из catalog schema.
- Storefront listing filters не выполняют DB query для
  `facetHandle -> facet_id`.
- `listing_option_signature_value` больше не имеет runtime dependency на
  `facet_id` для query/index path.
- Facet counts isolate selected values by `facetHandle`.
- Listing GraphQL result returns catalog facet/value references; catalog fields
  resolved by supergraph.
- Unknown facet handles do not produce catalog DB validation errors from
  listing; they produce empty matches/counts unless input format is invalid.

## Риски и решения

### Потеря catalog ordering

Без catalog DB listing не знает `lexo_rank` и `sort_index`.

Решения:

1. Сразу deterministic order by `facetHandle`, `facetValueHandle`.
2. Полный UX: добавить event-fed listing read model только для ordering:
   `facetHandle`, `valueHandle`, `facetRank`, `valueSort`.
   Эта projection не должна читать `catalog.facet*` на storefront query path.

### Rename `slug -> handle`

Current code still exposes `Facet.slug`. Если catalog в рамках этой же работы
переименовывает `slug` в `handle`, использовать `handle` в federation keys.
Если нет, в target schema оставить `slug`, но в listing domain names
использовать `facetHandle` как internal neutral name. Compatibility alias для
обоих имен в listing не нужен.

### Source child handles

Текущий catalog source handle для `OPTION`/`FEATURE` имеет формат
`sourceHandle:valueHandle`. Listing target key должен использовать root/group
value handle. Иначе `value_key = facetHandle:facetValueHandle` станет
неоднозначным и перестанет соответствовать visible storefront values.

### Validation semantics

Сейчас listing может вернуть `UNKNOWN_FACET_VALUE`, потому читает catalog DB.
После удаления resolution listing не знает, существует ли value globally. Это
нормально для read index: отсутствующий key дает пустую выдачу. Если нужен
строгий BAD_USER_INPUT для unknown facet/value, его должен давать catalog/admin
или отдельный supergraph-level API до вызова listing.
