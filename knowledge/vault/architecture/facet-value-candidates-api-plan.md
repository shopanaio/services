# План API для facet value candidates

## Контекст

В админке уже есть экран Facets и модалка создания facet:

- `admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx`
- `services/catalog/src/api/graphql-admin/schema/facet.graphql`
- `services/catalog/src/repositories/models/facetSourceCandidateView.ts`
- `services/catalog/src/resolvers/admin/FacetSourceCandidateConnectionResolver.ts`

Сейчас backend уже умеет отдавать `facetSourceCandidates` через drizzle-query Relay view. Это API выбирает доступные source для facet:

- `TAG` сейчас представлен source handle `tags`;
- `OPTION` группируется по `product_option.slug`;
- `FEATURE` группируется по `product_feature.slug`;
- `PRICE` и `IN_STOCK` имеют фиксированные source.

Новый API нужен для следующего шага: после выбора source/sources в create/edit modal показать список доступных source values с пагинацией, сортировкой и поиском.

## Важные ограничения текущей модели

1. `tag.handle` уникален в рамках проекта:
   `tag_project_id_handle_key`.

2. `product_option.slug` не уникален глобально:
   `product_option_product_id_slug_key` гарантирует уникальность только внутри продукта.

3. `product_option_value.slug` не уникален глобально:
   `product_option_value_option_id_slug_key` гарантирует уникальность только внутри конкретной option.

4. `product_feature.slug` не уникален глобально:
   `product_feature_product_id_slug_uniq` гарантирует уникальность только внутри продукта.

5. `product_feature_value.slug` не уникален глобально:
   `product_feature_value_feature_id_slug_uniq` гарантирует уникальность только внутри конкретной feature.

6. Поэтому candidates для option/feature нельзя строить по одному `optionId` или `featureId`. Их нужно агрегировать по паре:
   `sourceHandle = option.slug | feature.slug` и `handle = value.slug`.

7. `FacetCreateScript` сейчас требует ровно один source:
   `sources.length !== 1` возвращает ошибку.
   Если UI действительно должен поддерживать `source/sources`, сначала нужно изменить этот contract и валидацию.

8. `FacetUpdateInput` сейчас не содержит `sources`, хотя `FacetRepository.update()` уже умеет принимать `sources`.
   Для edit modal может понадобиться отдельное расширение API обновления sources.

## Цель

Добавить read API `facetValueCandidates`, который:

- работает как Relay connection;
- построен на drizzle-query view;
- поддерживает `first/after/last/before`;
- поддерживает `where` input для поиска/autocomplete;
- поддерживает `orderBy`;
- фильтруется по `facetType`;
- фильтруется по выбранным `sourceHandles`;
- для edit modal может фильтроваться по `facetId` и исключать уже добавленные/привязанные значения;
- для `TAG` возвращает все существующие tags;
- для `OPTION` возвращает агрегированные option values по `option.slug + optionValue.slug`;
- для `FEATURE` возвращает агрегированные feature values по `feature.slug + featureValue.slug`.

## Non-goals

Этот API не должен создавать facet values.

Текущий `FacetValueCreateInput` для display value принимает `sourceValueIds`, то есть для связывания display value с source values сами source `facet_value` записи должны уже существовать. Candidates API только показывает потенциальные исходные значения из catalog data. Создание/синхронизацию source `facet_value` записей нужно проектировать отдельным шагом.

## Предлагаемая GraphQL схема

Добавить в `services/catalog/src/api/graphql-admin/schema/facet.graphql`:

```graphql
type FacetValueCandidate {
  id: ID!
  facetType: FacetType!
  sourceHandle: String!
  handle: String!
  label: String!
}

type FacetValueCandidateEdge {
  cursor: String!
  node: FacetValueCandidate!
}

type FacetValueCandidateConnection {
  edges: [FacetValueCandidateEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

input FacetValueCandidateWhereInput {
  _and: [FacetValueCandidateWhereInput!]
  _or: [FacetValueCandidateWhereInput!]
  _not: FacetValueCandidateWhereInput
  id: StringFilter
  facetType: StringFilter
  sourceHandle: StringFilter
  handle: StringFilter
  label: StringFilter
}

enum FacetValueCandidateOrderField {
  SOURCE_HANDLE
  HANDLE
  LABEL
}

input FacetValueCandidateOrderByInput {
  field: FacetValueCandidateOrderField!
  direction: SortDirection!
}
```

Добавить query в `CatalogQuery`:

```graphql
facetValueCandidates(
  first: Int
  after: String
  last: Int
  before: String
  facetType: FacetType!
  sourceHandles: [String!]
  facetId: ID
  excludeExisting: Boolean = false
  where: FacetValueCandidateWhereInput
  orderBy: [FacetValueCandidateOrderByInput!]
): FacetValueCandidateConnection!
```

Пояснения:

- `facetType` обязателен, потому что семантика candidate зависит от типа.
- `sourceHandles` нужен create modal после выбора source/sources.
- `facetId` нужен edit modal, когда source можно взять из существующего facet и/или нужно проверить существующие facet values.
- `excludeExisting` скрывает candidates, для которых уже есть root/source value в указанном facet.
- `where.handle` используется для autocomplete по value handle.
- `where.label` используется для поиска по отображаемому имени.
- `where.sourceHandle` оставляем явно, чтобы не смешивать фильтр source и фильтр value.

## Drizzle view

Создать модель:

`services/catalog/src/repositories/models/facetValueCandidateView.ts`

View должна иметь минимум такие колонки:

```ts
id: text("id").notNull(),
projectId: uuid("project_id").notNull(),
locale: varchar("locale", { length: 8 }).notNull(),
facetType: varchar("facet_type", { length: 32 }).notNull(),
sourceHandle: text("source_handle").notNull(),
handle: text("handle").notNull(),
label: text("label").notNull(),
```

### TAG branch

Для `TAG`:

- `facetType = 'TAG'`;
- `sourceHandle = 'tags'`;
- `handle = tag.handle`;
- `label = tag_translation.name`;
- `id = 'TAG:tags:' || tag.handle`.

Это обычный список существующих tags.

### OPTION branch

Для `OPTION`:

- join `product_option -> product_option_translation`;
- join `product_option_value -> product_option_value_translation`;
- `sourceHandle = product_option.slug`;
- `handle = product_option_value.slug`;
- `label = MIN(product_option_value_translation.name)`;
- group by `project_id`, `locale`, `product_option.slug`, `product_option_value.slug`;
- `id = 'OPTION:' || sourceHandle || ':' || handle`.

Так мы группируем одинаковые option values из разных продуктов, потому что option slug не глобален.

### FEATURE branch

Для `FEATURE`:

- join `product_feature -> product_feature_translation`;
- join `product_feature_value -> product_feature_value_translation`;
- только `product_feature.is_group = false`;
- `sourceHandle = product_feature.slug`;
- `handle = product_feature_value.slug`;
- `label = MIN(product_feature_value_translation.name)`;
- group by `project_id`, `locale`, `product_feature.slug`, `product_feature_value.slug`;
- `id = 'FEATURE:' || sourceHandle || ':' || handle`.

## Repository API

Добавить в `FacetRepository` или отдельный `FacetValueCandidateRepository`.

Предпочтительно отдельный repository, если дальше появятся mutation сценарии синхронизации source values. Для минимального изменения можно начать в `FacetRepository`, рядом с `getAvailableFacetSourceCandidates`.

```ts
export const facetValueCandidateRelayQuery = createRelayQuery(
  createQuery(facetValueCandidateView)
    .include([
      "id",
      "projectId",
      "locale",
      "facetType",
      "sourceHandle",
      "handle",
      "label",
    ])
    .maxLimit(100)
    .defaultLimit(30),
  { name: "facetValueCandidate", tieBreaker: "id" }
);
```

Метод:

```ts
async getFacetValueCandidates(
  args: FacetValueCandidateArgs
): Promise<FacetValueCandidateConnectionResult>
```

Базовый `where`:

```ts
{
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    { facetType: { _eq: args.facetType } },
    ...(args.sourceHandles?.length
      ? [{ sourceHandle: { _in: args.sourceHandles } }]
      : []),
    ...(args.where ? [args.where] : []),
  ],
}
```

Если передан `facetId`:

1. декодировать Global ID в resolver;
2. проверить, что facet существует в текущем project;
3. если `sourceHandles` не переданы, взять их из `facet_source`;
4. если `excludeExisting = true`, исключить candidates, для которых в `facet_value` уже есть root/source value с таким `handle`.

Для `excludeExisting` лучше не зашивать anti-join в основной view, потому что базовый candidate не должен зависеть от конкретного facet. Это repository-level условие поверх `facetId`.

## Resolver слой

Добавить:

- `services/catalog/src/resolvers/admin/FacetValueCandidateResolver.ts`
- `services/catalog/src/resolvers/admin/FacetValueCandidateConnectionResolver.ts`

`FacetValueCandidateConnectionResolver` должен повторять паттерн `FacetSourceCandidateConnectionResolver`, но node передавать целиком, потому что candidate не является persisted entity.

`FacetValueCandidateResolver`:

```ts
id() {
  return this.$props.id;
}

facetType() {
  return this.$props.facetType;
}

sourceHandle() {
  return this.$props.sourceHandle;
}

handle() {
  return this.$props.handle;
}

label() {
  return this.$props.label;
}
```

## Query примеры

### Create modal: пользователь выбрал source `color`

```graphql
query FacetValueCandidates(
  $after: String
  $where: FacetValueCandidateWhereInput
) {
  catalogQuery {
    facetValueCandidates(
      facetType: OPTION
      sourceHandles: ["color"]
      first: 30
      after: $after
      where: $where
      orderBy: [{ field: LABEL, direction: ASC }]
    ) {
      edges {
        cursor
        node {
          id
          sourceHandle
          handle
          label
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

Поиск:

```json
{
  "where": {
    "_or": [
      { "handle": { "_containsi": "red" } },
      { "label": { "_containsi": "red" } }
    ]
  }
}
```

### Edit modal: autocomplete доступных source values

```graphql
query FacetValueAutocomplete(
  $facetId: ID!
  $where: FacetValueCandidateWhereInput
) {
  catalogQuery {
    facetValueCandidates(
      facetType: OPTION
      facetId: $facetId
      first: 20
      excludeExisting: true
      where: $where
      orderBy: [{ field: LABEL, direction: ASC }]
    ) {
      edges {
        node {
          id
          sourceHandle
          handle
          label
        }
      }
    }
  }
}
```

## Admin frontend integration

1. В `admin/src/domains/inventory/facets/graphql/queries.ts` добавить `FACET_VALUE_CANDIDATES_QUERY`.

2. В `operation-types.ts` добавить типы через generated API types, без re-export generated schema types.

3. Добавить hook:

   `admin/src/domains/inventory/facets/hooks/use-facet-value-candidates.ts`

4. В create modal:

   - после выбора `facetType + sourceHandles` показывать таблицу candidates;
   - таблица должна использовать Relay pagination state;
   - поиск должен мапиться в `where._or` по `handle` и `label`;
   - сортировка должна мапиться в `orderBy`;
   - для `TAG` не требовать дополнительный source picker, использовать `sourceHandles: ["tags"]`.

5. В edit facet modal:

   - использовать тот же hook;
   - передавать `facetId`;
   - включать `excludeExisting: true` для autocomplete добавления;
   - autocomplete должен искать по `handle` и `label`, а не только по handle.

## Открытые решения

1. Поддержка нескольких sources.

   Текущий backend запрещает больше одного source при создании facet. Если UI должен выбрать несколько sources, нужно:

   - изменить `FacetCreateScript`;
   - добавить `sources` в `FacetUpdateInput`;
   - решить, разрешать ли несколько sources одного `facetType`;
   - проверить constraint `facet_source_project_type_handle_uniq`, потому что он запрещает повторное использование одного source handle в другом facet.

2. Создание source facet values.

   Candidates API не дает `sourceValueIds`, потому что эти IDs относятся к `facet_value`, а не к raw catalog option/tag/feature values. Нужен отдельный сценарий:

   - либо mutation `facetValueSourceEnsureMany(facetId, candidates)` создает source values по `sourceHandle + handle`;
   - либо `facetValueCreate` расширяется и принимает `sourceCandidates`;
   - либо `facetCreate` расширяется и может сразу создать selected display/source values.

3. Что считать duplicate для `excludeExisting`.

   Для root display values duplicate очевиден по `facetId + handle`.
   Для source values duplicate тоже по `facetId + handle`.
   Если один display value объединяет несколько source values, candidate может быть "занят", даже если display handle другой. Для точного autocomplete нужно проверять source children, а не только root handle.

## Порядок реализации

1. Добавить `facetValueCandidateView` в models и export из `repositories/models/index.ts`.

2. Добавить GraphQL types/query/input/order types в `facet.graphql`.

3. Сгенерировать resolver types/schemas через существующий project codegen flow.

4. Добавить relay query и repository method.

5. Добавить `FacetValueCandidateResolver` и `FacetValueCandidateConnectionResolver`.

6. Подключить `facetValueCandidates` в `CatalogQueryResolver`.

7. Добавить admin GraphQL query/hook.

8. Интегрировать create modal table.

9. Интегрировать edit modal autocomplete.

10. После реализации запускать build, но не запускать test/tsc отдельно по правилам проекта.
