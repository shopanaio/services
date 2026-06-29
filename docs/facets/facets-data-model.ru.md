# Facets: модель данных и проектирование

Этот документ описывает текущую backend-модель facets в Catalog service и то,
как она задумана для настройки фильтров каталожного листинга. Речь идет именно
о domain facets: фильтрах витрины/листинга по цене, тегам, характеристикам,
опциям и наличию. Это отдельный слой от статических фильтров таблиц в Admin UI.

## Назначение

Facet описывает один фильтр каталожного листинга:

- какой бизнес-источник он фильтрует (`PRICE`, `TAG`, `FEATURE`, `OPTION`, `IN_STOCK`);
- как он должен отображаться (`CHECKBOX`, `RADIO`, `DROPDOWN`, `RANGE`, `BOOLEAN`);
- как пользователь выбирает значения (`SINGLE`, `MULTI`);
- какие значения доступны для дискретных фильтров;
- как сортировать и ограничивать видимые значения;
- в какую группу UI он попадает.

Модель спроектирована так, чтобы настройки фильтров хранились в Catalog DB, а
реальные значения фильтра могли ссылаться на существующие источники каталога:
tag handles, feature slugs и option value slugs. Благодаря этому storefront/listing
слой не должен знать, как в админке названы группы и labels, но может получить
готовую структуру фильтров с counts.

## Основные сущности

### FacetGroup

`FacetGroup` группирует несколько facets для UI.

DB таблицы:

- `catalog.facet_group`;
- `catalog.facet_group_translation`.

Ключевые поля:

- `id`;
- `project_id`;
- `sort_index`;
- `created_at`;
- `updated_at`;
- translated `name`.

Группа не определяет логику фильтрации. Она отвечает только за организацию
фильтров в интерфейсе.

### Facet

`Facet` описывает сам фильтр.

DB таблицы:

- `catalog.facet`;
- `catalog.facet_translation`.

Ключевые поля:

- `facet_type` - источник фильтрации: `price`, `tag`, `feature`, `option`, `in_stock`;
- `ui_type` - UI-контрол: `checkbox`, `radio`, `dropdown`, `range`, `boolean`;
- `selection_mode` - `single` или `multi`;
- `group_id` - nullable ссылка на группу;
- `sort_index` - порядок фильтра;
- `slug` - стабильный slug фильтра;
- translated `label`.

Ограничения:

- `facet.project_id + facet.slug` уникальны;
- `PRICE` и `IN_STOCK` не требуют `FacetValue`;
- `TAG`, `FEATURE`, `OPTION` используют `FacetValue`.

### FacetValue

`FacetValue` описывает одно значение дискретного facet.

DB таблицы:

- `catalog.facet_value`;
- `catalog.facet_value_translation`;
- `catalog.facet_value_source_handle`.

Ключевые поля:

- `facet_id`;
- `slug`;
- `swatch_id`;
- `sort_index`;
- `enabled`;
- translated `label`.

`facet_value_source_handle` связывает значение facet с реальными источниками
данных:

- для `TAG` это tag handles;
- для `FEATURE` это feature slugs;
- для `OPTION` это option value slugs.

Один `FacetValue` может ссылаться на несколько source handles. Это позволяет
собрать одно публичное значение фильтра из нескольких внутренних значений.
Например, значение "Red" может включать `red`, `dark-red`, `wine-red`.

## Группировка нескольких source values в один FacetValue

Группировка работает не через отдельную group table, а через несколько строк в
`catalog.facet_value_source_handle`, которые указывают на один и тот же
`facet_value_id`.

Пример: в каталоге реально существуют разные option value slugs:

- `red`;
- `dark-red`;
- `wine-red`;
- `burgundy`.

Покупателю не обязательно видеть четыре отдельных фильтра цвета. Для витрины
можно создать одно публичное значение:

```text
Facet: Color
FacetValue:
  slug: red
  label: Red
```

И привязать к нему несколько source handles:

```text
facet_value_source_handle:
  facet_value_id: <Red value id>, source_handle: red
  facet_value_id: <Red value id>, source_handle: dark-red
  facet_value_id: <Red value id>, source_handle: wine-red
  facet_value_id: <Red value id>, source_handle: burgundy
```

Когда пользователь выбирает `Color = Red`, backend трактует это как:

```text
red OR dark-red OR wine-red OR burgundy
```

То есть товар или вариант подходит под фильтр, если его исходные данные содержат
хотя бы один из привязанных source handles.

Такая схема нужна, чтобы:

- объединять близкие внутренние значения в одно понятное публичное значение;
- не показывать покупателю технические или слишком детальные значения;
- менять UX фильтров без переписывания товаров и вариантов;
- поддерживать один и тот же механизм для `TAG`, `FEATURE` и `OPTION`.

Ограничения:

- `facet_value.facet_id + facet_value.slug` уникальны;
- source handle уникален в рамках project/facet;
- source handle также уникален в рамках project/facet type, чтобы один
  источник не был неоднозначно привязан к нескольким значениям одного типа.

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

Swatch подключается к `FacetValue` через `facet_value.swatch_id`.

## GraphQL Admin API

Схема находится в:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`.

Типы:

- `FacetGroup`;
- `Facet`;
- `FacetValue`;
- `FacetSwatch`.

Enums:

- `FacetType`: `PRICE`, `TAG`, `FEATURE`, `OPTION`, `IN_STOCK`;
- `FacetUIType`: `CHECKBOX`, `RADIO`, `DROPDOWN`, `RANGE`, `BOOLEAN`;
- `FacetSelectionMode`: `SINGLE`, `MULTI`.

Queries:

```graphql
catalogQuery {
  facetGroup(id: ID!): FacetGroup
  facetGroups: [FacetGroup!]!

  facet(id: ID!): Facet
  facets: [Facet!]!

  facetValue(id: ID!): FacetValue
  facetValues(facetId: ID!): [FacetValue!]!

  facetSwatch(id: ID!): FacetSwatch
  facetSwatches: [FacetSwatch!]!
}
```

Mutations:

```graphql
catalogMutation {
  facetGroupCreate(input: FacetGroupCreateInput!): FacetGroupCreatePayload!
  facetGroupUpdate(input: FacetGroupUpdateInput!): FacetGroupUpdatePayload!
  facetGroupDelete(input: FacetGroupDeleteInput!): FacetGroupDeletePayload!

  facetCreate(input: FacetCreateInput!): FacetCreatePayload!
  facetUpdate(input: FacetUpdateInput!): FacetUpdatePayload!
  facetDelete(input: FacetDeleteInput!): FacetDeletePayload!

  facetValueCreate(input: FacetValueCreateInput!): FacetValueCreatePayload!
  facetValueUpdate(input: FacetValueUpdateInput!): FacetValueUpdatePayload!
  facetValueDelete(input: FacetValueDeleteInput!): FacetValueDeletePayload!

  facetSwatchCreate(input: FacetSwatchCreateInput!): FacetSwatchCreatePayload!
  facetSwatchUpdate(input: FacetSwatchUpdateInput!): FacetSwatchUpdatePayload!
  facetSwatchDelete(input: FacetSwatchDeleteInput!): FacetSwatchDeletePayload!
}
```

На GraphQL boundary используются global IDs. Резолверы декодируют их в raw UUID
перед вызовом scripts/repositories.

## Правила создания и обновления

Create/update логика находится в scripts:

- `services/catalog/src/scripts/facet/FacetGroupCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetUpdateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueUpdateScript.ts`;
- `services/catalog/src/scripts/facet/FacetSwatchCreateScript.ts`.

Основные правила:

- `Facet.slug` и `FacetValue.slug` должны быть валидными slug;
- `Facet.label` обязателен;
- `FacetValue.label` обязателен;
- `FacetValue.sourceHandles` обязательны для `TAG`, `FEATURE`, `OPTION`;
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

Builder читает все configured facets из DB и строит результат:

- `priceRange`;
- `groups`;
- внутри групп - facets;
- внутри дискретных facets - values с `count`, `label`, `slug`, `swatch`.

Для `TAG` и `FEATURE` фильтрация считается на product-level данных.
Для `OPTION`, `PRICE`, `IN_STOCK` учитываются variants.

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

То есть сейчас есть два разных слоя:

1. Admin table filters - статическая frontend-конфигурация для таблиц админки.
2. Catalog facets - DB-backed настройки фильтров листинга/витрины.

Их не стоит смешивать. Если нужно сделать страницу настроек facets в админке,
она должна работать с `catalogQuery.facets/facetGroups/facetValues/facetSwatches`
и `catalogMutation.facet*`, а не с `FilterWidget` schemas для таблиц.

## Текущее состояние интеграции

На backend:

- DB schema для facets есть;
- repositories есть;
- loaders есть;
- Admin GraphQL queries/mutations есть;
- scripts для create/update/delete есть;
- builder для listing facet counts есть.

На admin frontend:

- generated GraphQL types уже содержат `ApiFacet`, `ApiFacetGroup`,
  `ApiFacetValue`, `ApiFacetSwatch` и соответствующие input/payload types;
- отдельного feature module/page/hooks для управления facets сейчас нет.

На listing API:

- `Category.listing` в Admin GraphQL сейчас принимает `where` и `orderBy`;
- отдельное поле `listing.filters` или `listing.facets` в текущей admin schema
  не подключено;
- builder facets существует как backend-основа для будущего storefront/listing
  API контракта.

## Ожидаемый Admin UX для настройки facets

Практичный UI можно строить вокруг четырех областей:

- groups: порядок, название;
- facets: тип, slug, label, UI type, selection mode, group, sort index,
  visibility;
- values: slug, label, source handles, swatch, sort index, enabled;
- swatches: color/gradient/image assets.

Для `TAG`, `FEATURE`, `OPTION` админка должна помогать выбирать source handles из
реальных сущностей каталога. Для `PRICE` и `IN_STOCK` вкладка values должна быть
недоступна, потому что эти facets вычисляются автоматически.

## Проектные инварианты

- Facet configuration принадлежит project/tenant.
- Переводы labels и group names вынесены в translation tables.
- GraphQL наружу отдает enum values в uppercase.
- DB хранит enum-like values в lowercase strings.
- GraphQL IDs наружу всегда global IDs.
- Repositories работают с raw UUID.
- `sourceHandles` являются контрактом между facet values и search/listing data.
- `FacetValue` не должен ссылаться напрямую на tag/feature/option records через FK:
  source handle позволяет пережить разные источники и агрегировать несколько
  внутренних значений в одно публичное значение фильтра.
