# Facets: модель данных и проектирование

Этот документ описывает целевую backend-модель facets в Catalog service и то,
как она используется для настройки фильтров каталожного листинга. Речь идет о
domain facets: фильтрах витрины/листинга по цене, тегам, характеристикам,
опциям и наличию. Это отдельный слой от статических фильтров таблиц в Admin UI.

## Назначение

Facet описывает один фильтр каталожного листинга:

- какой бизнес-источник он фильтрует (`PRICE`, `TAG`, `FEATURE`, `OPTION`, `IN_STOCK`);
- как он должен отображаться (`CHECKBOX`, `RADIO`, `DROPDOWN`, `RANGE`, `BOOLEAN`);
- как пользователь выбирает значения (`SINGLE`, `MULTI`);
- какие значения доступны для дискретных фильтров;
- как группировать, сортировать и ограничивать видимые значения.

Модель спроектирована так, чтобы настройки фильтров хранились в Catalog DB, а
реальные source values могли ссылаться на существующие источники каталога:
tag handles, feature value handles и option value handles из search index.
Storefront/listing слой получает готовую структуру фильтров с counts и не
зависит от того, как source values названы внутри админки.

## Основные сущности

### Facet

`Facet` описывает сам фильтр.

DB таблицы:

- `catalog.facet`;
- `catalog.facet_translation`.

Ключевые поля:

- `facet_type` - источник фильтрации: `price`, `tag`, `feature`, `option`, `in_stock`;
- `ui_type` - UI-контрол: `checkbox`, `radio`, `dropdown`, `range`, `boolean`;
- `selection_mode` - `single` или `multi`;
- `lexo_rank` - порядок фильтра;
- `slug` - стабильный slug фильтра;
- translated `label`.

Ограничения:

- `facet.project_id + facet.slug` уникальны;
- `PRICE` и `IN_STOCK` не требуют `FacetValue`;
- `TAG`, `FEATURE`, `OPTION` используют `FacetValue`.

`facet.slug` остается ключом фильтра на storefront boundary. Внешний token
имеет форму:

```text
facetSlug:valueHandle
```

### FacetValue

`FacetValue` описывает значение дискретного facet. В целевой модели одна таблица
`catalog.facet_value` хранит и реальные source values, и публичные display values.
Отдельной source-handle mapping table больше нет.

DB таблицы:

- `catalog.facet_value`;
- `catalog.facet_value_translation`.

Ключевые поля:

- `facet_id`;
- `parent_id`;
- `kind` - `source` или `display`;
- `handle`;
- `swatch_id`;
- `sort_index`;
- `enabled`;
- translated `label`.

`FacetValue.kind = source` означает реальное значение из каталога/search index:

- для `TAG`: `handle = tag.handle`;
- для `FEATURE`: `handle = feature.slug:value.slug`;
- для `OPTION`: `handle = option.slug:option_value.slug`.

`FacetValue.kind = display` означает публичное значение фильтра. Оно используется
для custom label, custom handle, swatch, порядка или группировки нескольких
source values.

Правило видимости:

```sql
parent_id IS NULL
```

Visible values включают:

- root source values без parent;
- display values.

Source values с `parent_id IS NOT NULL` не выводятся как отдельные значения.
Они являются hidden children своего display value.

Пример:

```text
Facet: Color

facet_value:
1. kind=source,  handle=color:red,       label=Red,       parent_id=10
2. kind=source,  handle=color:dark-red,  label=Dark red,  parent_id=10
3. kind=source,  handle=color:black,     label=Black,     parent_id=NULL
4. kind=source,  handle=color:white,     label=White,     parent_id=NULL

10. kind=display, handle=red, label=Red tones, parent_id=NULL
```

В списке фильтров выводятся:

```text
Red tones
Black
White
```

При выборе `Color = Red tones` backend фильтрует по source handles:

```text
color:red OR color:dark-red
```

При выборе `Color = Black` backend фильтрует по одному source handle:

```text
color:black
```

### Целевая структура `catalog.facet_value`

```sql
catalog.facet_value (
  id             uuid PRIMARY KEY,
  project_id     uuid NOT NULL,
  facet_id       uuid NOT NULL REFERENCES catalog.facet(id) ON DELETE CASCADE,

  parent_id      uuid NULL REFERENCES catalog.facet_value(id) ON DELETE NO ACTION,
  kind           varchar(16) NOT NULL, -- 'source' | 'display'
  handle         text NOT NULL,

  swatch_id      uuid NULL REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index     integer NOT NULL DEFAULT 0,
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
)
```

Обязательные индексы и constraints:

```sql
CREATE UNIQUE INDEX facet_value_source_project_facet_handle_uniq
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE kind = 'source';

CREATE UNIQUE INDEX facet_value_root_project_facet_handle_uniq
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE parent_id IS NULL;

CREATE INDEX idx_facet_value_project_facet_visible_order
  ON catalog.facet_value (project_id, facet_id, sort_index, id)
  WHERE parent_id IS NULL;

CREATE INDEX idx_facet_value_project_parent
  ON catalog.facet_value (project_id, parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX idx_facet_value_project_facet_source_handle
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE kind = 'source';

CHECK (kind IN ('source', 'display'));
CHECK (kind <> 'display' OR parent_id IS NULL);
```

Source handle уникален только в рамках конкретного `facet_id`. Один raw source
handle может участвовать в разных facets, если у них разные `facet_id`; runtime
resolution всегда начинается с `facet.slug`, поэтому token `facetSlug:valueHandle`
остается однозначным.

Application-level validation:

- `parent_id` должен указывать на value того же `project_id` и `facet_id`;
- parent для source value должен быть `kind = 'display'`;
- display value не может быть child другого value;
- enabled display value должен иметь хотя бы один enabled source child перед
  использованием в storefront/listing;
- `PRICE` и `IN_STOCK` не должны иметь `facet_value` rows.

### FacetValueTranslation

`catalog.facet_value_translation.label` меняет смысл в зависимости от
`facet_value.kind`:

- `source`: исходное i18n имя source value;
- `display`: публичное custom имя display/group value.

Структура таблицы остается обычной translation table:

```sql
catalog.facet_value_translation (
  facet_value_id uuid NOT NULL REFERENCES catalog.facet_value(id) ON DELETE CASCADE,
  locale         varchar(8) NOT NULL,
  project_id     uuid NOT NULL,
  label          text NOT NULL,
  PRIMARY KEY (facet_value_id, locale)
)
```

### FacetSwatch

`FacetSwatch` описывает визуальный маркер значения: цвет, градиент или картинку.

DB таблица:

- `catalog.facet_swatch`.

Ключевые поля:

- `swatch_type` - `color`, `gradient`, `image`;
- `color_one`;
- `color_two`;
- `image_id`;
- `metadata`.

Swatch подключается к `FacetValue` через `facet_value.swatch_id`. Storefront
читает swatch у visible value. Для hidden source children swatch может
храниться, но не используется при выводе фильтров.

## Runtime resolution

Storefront/listing input остается строкой:

```text
facetSlug:valueHandle
```

Алгоритм resolution:

1. Найти facet по `project_id + facet.slug`.
2. Найти visible value по `facet_id + handle + parent_id IS NULL + enabled`.
3. Если value не найден, filter value invalid и игнорируется.
4. Если `value.kind = source`, source handles равны `[value.handle]`.
5. Если `value.kind = display`, source handles равны handles всех enabled source
   children этого display value.
6. Если display value не имеет enabled source children, filter value invalid и
   игнорируется.

Lookup visible value:

```sql
SELECT fv.*
FROM catalog.facet_value fv
WHERE fv.project_id = :projectId
  AND fv.facet_id = :facetId
  AND fv.handle = :valueHandle
  AND fv.parent_id IS NULL
  AND fv.enabled = true
LIMIT 1;
```

Lookup source children:

```sql
SELECT child.handle
FROM catalog.facet_value child
WHERE child.project_id = :projectId
  AND child.facet_id = :facetId
  AND child.parent_id = :displayValueId
  AND child.kind = 'source'
  AND child.enabled = true
ORDER BY child.handle;
```

Внутренний runtime result может использовать термин `resolvedSourceHandles`, но это
derived value, а не отдельная DB table и не Admin API contract.

## Merge и unmerge

Merge/unmerge не создает и не удаляет source rows. Эти операции меняют только
`parent_id` у source values.

### Merge

Merge attach-ит source values к существующему или новому display value:

```sql
UPDATE catalog.facet_value
SET parent_id = :displayValueId,
    updated_at = now()
WHERE id = ANY(:sourceValueIds)
  AND project_id = :projectId
  AND facet_id = :facetId
  AND kind = 'source';
```

Если новый display value должен получить тот же `handle`, что и root source
value из merge set, операция должна идти transactionally через временный handle:

1. создать display row с временным уникальным `handle`;
2. attach source values к display;
3. обновить display `handle` на финальный.

Так сохраняется unique constraint для root values.

### Unmerge

Unmerge detach-ит source values и снова делает их visible root values:

```sql
UPDATE catalog.facet_value
SET parent_id = NULL,
    updated_at = now()
WHERE id = :sourceValueId
  AND project_id = :projectId
  AND kind = 'source';
```

Перед detach нужно проверить, что в том же facet нет другого root value с таким
же `handle`. Если конфликт есть, mutation должна вернуть userError и не делать
частичный detach.

Если display value после unmerge остался без source children, dedicated mutation
применяет `emptyDisplayAction`:

- `disable` - выставить `enabled = false`;
- `delete` - удалить пустой display row;
- `keep` - оставить пустой display row, но storefront/listing не должны считать
  его usable filter value.

## GraphQL Admin API

Схема находится в:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`.

Основные типы:

- `Facet`;
- `FacetValue`;
- `FacetSwatch`.

Enums:

- `FacetType`: `PRICE`, `TAG`, `FEATURE`, `OPTION`, `IN_STOCK`;
- `FacetUIType`: `CHECKBOX`, `RADIO`, `DROPDOWN`, `RANGE`, `BOOLEAN`;
- `FacetSelectionMode`: `SINGLE`, `MULTI`;
- `FacetValueKind`: `SOURCE`, `DISPLAY`;
- `FacetValueEmptyDisplayAction`: `DISABLE`, `DELETE`, `KEEP`.

`FacetValue` - единственный GraphQL output type для facet values. Source value и
display value отличаются полем `kind`.

```graphql
type FacetValue implements Node {
  id: ID!
  facet: Facet!
  parent: FacetValue
  kind: FacetValueKind!
  handle: String!
  label: String!
  sourceValues: [FacetValue!]!
  swatch: FacetSwatch
  sortIndex: Int!
  enabled: Boolean!
}
```

`FacetValue.sourceValues` возвращает child rows как `FacetValue` objects:

- для `DISPLAY` - child source values;
- для `SOURCE` - пустой список.

Admin API не экспонирует строковое поле source handles на `FacetValue`.
Строковые handles source values доступны как `FacetValue.handle` у source rows.

Queries:

```graphql
catalogQuery {
  facet(id: ID!): Facet
  facets: [Facet!]!

  facetValue(id: ID!): FacetValue
  facetValues(facetId: ID!): [FacetValue!]!

  facetSwatch(id: ID!): FacetSwatch
  facetSwatches: [FacetSwatch!]!
}
```

`Facet.values` и `facetValues(facetId:)` для обычного отображения возвращают
visible values. Для админских экранов, которым нужно управлять hidden source
children, нужен отдельный repository/script/query contract или явное поле вроде
`sourceValues`.

Mutations:

```graphql
catalogMutation {
  facetCreate(input: FacetCreateInput!): FacetCreatePayload!
  facetUpdate(input: FacetUpdateInput!): FacetUpdatePayload!
  facetDelete(input: FacetDeleteInput!): FacetDeletePayload!

  facetValueCreate(input: FacetValueCreateInput!): FacetValueCreatePayload!
  facetValueUpdate(input: FacetValueUpdateInput!): FacetValueUpdatePayload!
  facetValueDelete(input: FacetValueDeleteInput!): FacetValueDeletePayload!
  facetValueMerge(input: FacetValueMergeInput!): FacetValueMergePayload!
  facetValueUnmerge(input: FacetValueUnmergeInput!): FacetValueUnmergePayload!

  facetSwatchCreate(input: FacetSwatchCreateInput!): FacetSwatchCreatePayload!
  facetSwatchUpdate(input: FacetSwatchUpdateInput!): FacetSwatchUpdatePayload!
  facetSwatchDelete(input: FacetSwatchDeleteInput!): FacetSwatchDeletePayload!
}
```

Value inputs:

```graphql
input FacetValueCreateInput {
  facetId: ID!
  kind: FacetValueKind = DISPLAY
  handle: String!
  label: String!
  sourceValueIds: [ID!]
  swatchId: ID
  sortIndex: Int
  enabled: Boolean
}

input FacetValueUpdateInput {
  id: ID!
  handle: String
  label: String
  swatchId: ID
  sortIndex: Int
  enabled: Boolean
}

input FacetValueMergeInput {
  facetId: ID!
  targetDisplayValueId: ID
  targetHandle: String
  targetLabel: String
  sourceValueIds: [ID!]!
}

input FacetValueUnmergeInput {
  sourceValueIds: [ID!]!
  emptyDisplayAction: FacetValueEmptyDisplayAction = DISABLE
}
```

`facetValueUpdate` не меняет `parent_id` и не принимает `sourceValueIds`.
Все изменения связей source/display values проходят только через
`facetValueMerge` и `facetValueUnmerge`.

На GraphQL boundary используются global IDs. Резолверы декодируют их в raw UUID
перед вызовом scripts/repositories.

## Правила создания и обновления

Create/update логика находится в scripts:

- `services/catalog/src/scripts/facet/FacetCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetUpdateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueUpdateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueMergeScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueUnmergeScript.ts`;
- `services/catalog/src/scripts/facet/FacetSwatchCreateScript.ts`.

Основные правила:

- `Facet.slug` должен быть валидным slug;
- `FacetValue.handle` для display value должен быть valid slug-like storefront handle;
- `FacetValue.handle` для source value должен быть valid source handle:
  - tag: без `:`;
  - feature/option: `source_slug:value_slug`;
- `Facet.label` и `FacetValue.label` обязательны;
- source values управляются отдельными value-level операциями или sync flow;
- display value может группировать один или несколько source values;
- generic update не меняет `parent_id`;
- для `PRICE` и `IN_STOCK` facet values запрещены;
- `uiType` валидируется относительно `facetType`:
  - `PRICE`: `RANGE`, `CHECKBOX`, `RADIO`, `DROPDOWN`;
  - `TAG`: `CHECKBOX`, `RADIO`, `DROPDOWN`;
  - `FEATURE`: `CHECKBOX`, `RADIO`, `DROPDOWN`;
  - `OPTION`: `CHECKBOX`, `RADIO`, `DROPDOWN`;
  - `IN_STOCK`: `BOOLEAN`, `CHECKBOX`, `RADIO`, `DROPDOWN`.

## Как строятся listing facets

В коде есть общий builder:

- `services/catalog/src/scripts/shared/facets.ts`.

Он принимает:

- repository;
- базовый список продуктов;
- variants/search index по продуктам;
- currency;
- выбранные facet filters;
- price min/max;
- in-stock filter.

Builder читает configured facets из DB и строит результат:

- `priceRange`;
- `groups`;
- внутри групп - facets;
- внутри дискретных facets - visible values с `count`, `label`, `handle`, `swatch`.

Для counts каждый visible value разворачивается в source handles:

- visible source value -> один `handle`;
- display value -> handles всех enabled source children.

Дальше логика counts использует search index:

- `TAG` сравнивается с `product_search_index.tag_handles`;
- `FEATURE` сравнивается с `product_search_index.feature_slugs`;
- `OPTION` сравнивается с `variant_search_index.option_slugs`.

Для `TAG` и `FEATURE` фильтрация считается на product-level данных. Для
`OPTION`, `PRICE`, `IN_STOCK` учитываются variants.

Counts считаются с учетом выбранных фильтров, но для текущего facet builder может
игнорировать его собственное выбранное значение, чтобы показать пользователю
доступные альтернативы внутри той же группы фильтра.

## Price и In Stock facets

`PRICE` и `IN_STOCK` отличаются от дискретных facets:

- у них нет `FacetValue`;
- `PRICE` возвращает диапазон цен и total count;
- `IN_STOCK` возвращает count товаров, подходящих под наличие;
- UI behavior задается через `ui_type` и `selection_mode`, но значения не
  настраиваются через `facet_value`.

## Отличие от фильтров таблиц Admin UI

Текущие фильтры таблиц в админке не используют DB facets.

Например:

- `admin/src/domains/inventory/products/list-page/filter-schema.ts`;
- `admin/src/domains/inventory/categories/page/filter-schema.ts`;
- `admin/src/domains/inventory/tags/page/filter-schema.ts`;
- `admin/src/domains/inventory/inventory/page/filter-schema.ts`.

Эти файлы описывают frontend schema для `FilterWidget` и трансформируются в
GraphQL `WhereInput` (`ProductWhereInput`, `ListingWhereInput`,
`CategoryWhereInput`, `TagWhereInput` и т.д.).

То есть есть два разных слоя:

1. Admin table filters - статическая frontend-конфигурация для таблиц админки.
2. Catalog facets - DB-backed настройки фильтров листинга/витрины.

Их не стоит смешивать. Страница настроек facets в админке должна работать с
`catalogQuery.facets/facetValues/facetSwatches` и `catalogMutation.facet*`, а не
с `FilterWidget` schemas для таблиц.

## Текущее состояние интеграции

На backend:

- DB schema для facets есть;
- repositories есть;
- loaders есть;
- Admin GraphQL queries/mutations есть;
- scripts для create/update/delete есть;
- builder для listing facet counts есть.

На admin frontend:

- generated GraphQL types содержат `ApiFacet`, `ApiFacetValue`,
  `ApiFacetSwatch` и соответствующие input/payload types после codegen;
- отдельного feature module/page/hooks для управления facets сейчас нет.

На listing API:

- `Category.listing` в Admin GraphQL сейчас принимает `where` и `orderBy`;
- отдельное поле `listing.filters` или `listing.facets` в текущей admin schema
  не подключено;
- builder facets существует как backend-основа для будущего storefront/listing
  API контракта.
