# План API для facet value candidates

## Контекст

В catalog service уже есть backend API для выбора source для facet:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`
- `services/catalog/src/repositories/models/facetSourceCandidateView.ts`
- `services/catalog/src/resolvers/admin/FacetSourceCandidateConnectionResolver.ts`

Сейчас backend уже умеет отдавать `facetSourceCandidates` через drizzle-query Relay view. Это API выбирает доступные source для facet:

- `TAG` сейчас представлен source handle `tags`;
- `OPTION` группируется по `product_option.slug`;
- `FEATURE` группируется по `product_feature.slug`;
- `PRICE` и `IN_STOCK` имеют фиксированные source.

Новый API нужен для следующего шага: после выбора source/sources получить список доступных source values с пагинацией, сортировкой и поиском.

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

6. Поэтому candidates для option/feature нельзя строить по одному `optionId` или `featureId`. Внутри view их нужно агрегировать по паре:
   `sourceHandle = option.slug | feature.slug` и `rawValueHandle = value.slug`.
   Публичный `handle` candidate должен быть сразу тем значением, которое можно сохранить в `facet_value.handle` для source value:
   `handle = sourceHandle || ':' || rawValueHandle`.
   `sourceHandle` остается внутренним ключом выбранного facet source для фильтрации candidates.

7. `FacetCreateScript` сейчас требует ровно один source:
   `sources.length !== 1` возвращает ошибку.
   Если API должен поддерживать несколько sources, сначала нужно изменить этот contract и валидацию.

8. `FacetUpdateInput` сейчас не содержит `sources`, хотя `FacetRepository.update()` уже умеет принимать `sources`.
   Для сценария обновления facet sources может понадобиться отдельное расширение API.

## Цель

Добавить read API `facetValueCandidates`, который:

- работает как Relay connection;
- построен на drizzle-query view;
- поддерживает `first/after/last/before`;
- поддерживает `where` input для поиска;
- поддерживает `orderBy`;
- фильтруется по `facetType`;
- поддерживает только `TAG`, `OPTION` и `FEATURE`;
- фильтруется по выбранным `sourceHandles`;
- может фильтроваться по `facetId` и исключать уже добавленные/привязанные значения;
- для `TAG` возвращает все существующие tags;
- для `OPTION` возвращает агрегированные option values по `option.slug + optionValue.slug`, где публичный `handle` имеет формат `option.slug:optionValue.slug`;
- для `FEATURE` возвращает агрегированные feature values по `feature.slug + featureValue.slug`, где публичный `handle` имеет формат `feature.slug:featureValue.slug`.
- для `PRICE` и `IN_STOCK` candidates API не применяется и должен возвращать ошибку валидации на resolver/repository boundary.

## Non-goals

Admin UI не входит в этот план. План описывает только backend/API часть в `services/catalog`.

Этот API не должен создавать facet values.

Текущий `FacetValueCreateInput` для display value принимает `sourceValueIds`, то есть для связывания display value с source values сами source `facet_value` записи должны уже существовать. Candidates API только показывает потенциальные исходные значения из catalog data. Создание/синхронизацию source `facet_value` записей нужно проектировать отдельным шагом.

## Предлагаемая GraphQL схема

Добавить в `services/catalog/src/api/graphql-admin/schema/facet.graphql` только публичные object/connection types:

```graphql
type FacetValueCandidate {
  id: ID!
  facetType: FacetType!
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
```

`FacetValueCandidateWhereInput`, `FacetValueCandidateOrderField` и
`FacetValueCandidateOrderByInput` не писать вручную в `facet.graphql`.
Их нужно сгенерировать существующим codegen flow для drizzle-query filters,
как сейчас сделано для `FacetSourceCandidateWhereInput` и
`FacetSourceCandidateOrderByInput` в
`services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql`.

Ожидаемые generated поля:

```graphql
input FacetValueCandidateWhereInput {
  _and: [FacetValueCandidateWhereInput!]
  _or: [FacetValueCandidateWhereInput!]
  _not: FacetValueCandidateWhereInput
  id: IDFilter
  facetType: StringFilter
  handle: StringFilter
  label: StringFilter
}

enum FacetValueCandidateOrderField {
  id
  facetType
  handle
  label
}
```

Важно: generated enum values должны быть в текущем стиле проекта
(`handle`, `label`), а не `HANDLE`/`LABEL`.
`sourceHandle` не должен попадать в public generated where/order для этого API.
Фильтрация по source идет через отдельный аргумент `sourceHandles` и repository-level condition.

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
- допустимые значения `facetType` для этого API: `TAG`, `OPTION`, `FEATURE`; `PRICE` и `IN_STOCK` не поддерживаются.
- `sourceHandles` нужен после выбора source/sources и является входным фильтром запроса.
- `facetId` нужен, когда source можно взять из существующего facet и/или нужно проверить существующие facet values.
- `excludeExisting` скрывает candidates, для которых уже есть root/source value в указанном facet.
- `where.handle` используется для поиска по persisted source value handle. Для `OPTION`/`FEATURE` это составной handle вида `source:value`.
- `where.label` используется для поиска по отображаемому имени.
- `sourceHandle` не возвращается в `FacetValueCandidate` и не нужен в generic `where`, потому что source уже задается отдельным аргументом `sourceHandles`, а публичный `handle` уже содержит source-компонент для сохранения в `facet_value.handle`.

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

View содержит только branches для `TAG`, `OPTION` и `FEATURE`.
Branches для `PRICE` и `IN_STOCK` не добавлять, потому что у них нет raw source values в catalog data.
`source_handle` остается внутренней колонкой view для фильтрации по выбранному facet source.
Для `OPTION` и `FEATURE` колонка `handle` должна быть составным persisted handle в формате `sourceHandle:valueHandle`, чтобы candidate можно было без преобразования передать в создание source `facet_value`.

### TAG branch

Для `TAG`:

- `facetType = 'TAG'`;
- `sourceHandle = 'tags'`;
- `handle = tag.handle`;
- `label = tag_translation.name`;
- `id = 'TAG:' || tag.handle`.

Это обычный список существующих tags. Для `TAG` source value handle остается обычным `tag.handle`, потому что текущая валидация source values для `TAG` принимает plain slug.

### OPTION branch

Для `OPTION`:

- join `product_option -> product_option_translation`;
- join `product_option_value -> product_option_value_translation`;
- `sourceHandle = product_option.slug`;
- `rawValueHandle = product_option_value.slug`;
- `handle = product_option.slug || ':' || product_option_value.slug`;
- `label = MIN(product_option_value_translation.name)`;
- group by `project_id`, `locale`, `product_option.slug`, `product_option_value.slug`;
- `id = 'OPTION:' || handle`.

Так мы группируем одинаковые option values из разных продуктов, потому что option slug не глобален, и сразу возвращаем handle, совместимый с `isValidSourceHandle('OPTION', handle)`.

### FEATURE branch

Для `FEATURE`:

- join `product_feature -> product_feature_translation`;
- join `product_feature_value -> product_feature_value_translation`;
- только `product_feature.is_group = false`;
- `sourceHandle = product_feature.slug`;
- `rawValueHandle = product_feature_value.slug`;
- `handle = product_feature.slug || ':' || product_feature_value.slug`;
- `label = MIN(product_feature_value_translation.name)`;
- group by `project_id`, `locale`, `product_feature.slug`, `product_feature_value.slug`;
- `id = 'FEATURE:' || handle`.

## Migration SQL

Добавить новый migration файл:

`services/catalog/migrations/domains/0500_facets/0505_facets__value_candidate_view.sql`

Точный SQL:

```sql
-- Up Migration

CREATE VIEW "catalog"."facet_value_candidate_view" AS
SELECT
  'TAG:' || t.handle AS id,
  t.project_id,
  tt.locale,
  'TAG'::text AS facet_type,
  'tags'::text AS source_handle,
  t.handle::text AS handle,
  tt.name::text AS label
FROM "catalog"."tag" t
INNER JOIN "catalog"."tag_translation" tt
  ON tt.project_id = t.project_id
 AND tt.tag_id = t.id

UNION ALL

SELECT
  'OPTION:' || po.slug || ':' || pov.slug AS id,
  po.project_id,
  povt.locale,
  'OPTION'::text AS facet_type,
  po.slug::text AS source_handle,
  (po.slug || ':' || pov.slug)::text AS handle,
  MIN(povt.name)::text AS label
FROM "catalog"."product_option" po
INNER JOIN "catalog"."product_option_translation" pot
  ON pot.project_id = po.project_id
 AND pot.option_id = po.id
INNER JOIN "catalog"."product_option_value" pov
  ON pov.project_id = po.project_id
 AND pov.option_id = po.id
INNER JOIN "catalog"."product_option_value_translation" povt
  ON povt.project_id = pov.project_id
 AND povt.option_value_id = pov.id
 AND povt.locale = pot.locale
GROUP BY po.project_id, povt.locale, po.slug, pov.slug

UNION ALL

SELECT
  'FEATURE:' || pf.slug || ':' || pfv.slug AS id,
  pf.project_id,
  pfvt.locale,
  'FEATURE'::text AS facet_type,
  pf.slug::text AS source_handle,
  (pf.slug || ':' || pfv.slug)::text AS handle,
  MIN(pfvt.name)::text AS label
FROM "catalog"."product_feature" pf
INNER JOIN "catalog"."product_feature_translation" pft
  ON pft.project_id = pf.project_id
 AND pft.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value" pfv
  ON pfv.project_id = pf.project_id
 AND pfv.feature_id = pf.id
INNER JOIN "catalog"."product_feature_value_translation" pfvt
  ON pfvt.project_id = pfv.project_id
 AND pfvt.feature_value_id = pfv.id
 AND pfvt.locale = pft.locale
WHERE pf.is_group = false
GROUP BY pf.project_id, pfvt.locale, pf.slug, pfv.slug;

CREATE INDEX IF NOT EXISTS "idx_tag_translation_project_locale_tag"
  ON "catalog"."tag_translation" ("project_id", "locale", "tag_id");

CREATE INDEX IF NOT EXISTS "idx_product_option_value_project_option_slug"
  ON "catalog"."product_option_value" ("project_id", "option_id", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_option_value_translation_project_locale_value"
  ON "catalog"."product_option_value_translation" ("project_id", "locale", "option_value_id");

CREATE INDEX IF NOT EXISTS "idx_product_feature_value_project_feature_slug"
  ON "catalog"."product_feature_value" ("project_id", "feature_id", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_feature_value_translation_project_locale_value"
  ON "catalog"."product_feature_value_translation" ("project_id", "locale", "feature_value_id");
```

Старые migration файлы не изменять. `0504_facets__source_candidate_view.sql` остается без изменений, потому новый API читает отдельную view и не меняет contract `facetSourceCandidates`.

Существующие не-migration файлы, которые будут изменены при реализации:

- `services/catalog/src/repositories/models/index.ts` — добавить export `facetValueCandidateView`.
- `services/catalog/src/api/graphql-admin/schema/facet.graphql` — добавить публичные object/connection types.
- `services/catalog/src/api/graphql-admin/schema/base.graphql` — обновится через существующий schema/codegen flow, если этот файл является агрегированным generated snapshot в текущем процессе.
- `services/catalog/scripts/generate-filters.ts` — добавить генерацию `FacetValueCandidateWhereInput` и `FacetValueCandidateOrderByInput`; исключить `projectId`, `locale`, `sourceHandle` из public filters/order.
- `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql` — generated output после `generate:filters`.
- `services/catalog/src/resolvers/admin/generated/types.ts` и `services/catalog/src/resolvers/admin/generated/schemas.ts` — generated output после GraphQL codegen.
- `services/catalog/src/repositories/facet/FacetRepository.ts` — добавить relay query и repository method.
- `services/catalog/src/resolvers/admin/FacetValueCandidateResolver.ts` — новый resolver для node.
- `services/catalog/src/resolvers/admin/FacetValueCandidateConnectionResolver.ts` — новый resolver для connection.
- `services/catalog/src/resolvers/admin/QueryResolver.ts` — подключить `facetValueCandidates`.
- `services/catalog/src/resolvers/admin/index.ts` — export новых resolvers, если текущий barrel используется для admin resolvers.

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

`sourceHandle` в этом `where` является внутренним условием repository/query layer, поэтому он должен быть включен в `facetValueCandidateRelayQuery.include(...)`.
Если генератор filters строится по колонкам view, нужно настроить generation так, чтобы
`sourceHandle` не появился в public `FacetValueCandidateWhereInput` и
`FacetValueCandidateOrderField`.

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

handle() {
  return this.$props.handle;
}

label() {
  return this.$props.label;
}
```

## Query примеры

### Выбран source `color`

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
      orderBy: [{ field: label, direction: ASC }]
    ) {
      edges {
        cursor
        node {
          id
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

### Получить доступные source values для существующего facet

```graphql
query ExistingFacetValueCandidates(
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
      orderBy: [{ field: label, direction: ASC }]
    ) {
      edges {
        node {
          id
          handle
          label
        }
      }
    }
  }
}
```

## Открытые решения

1. Поддержка нескольких sources.

   Текущий backend запрещает больше одного source при создании facet. Если API должен поддерживать несколько sources, нужно:

   - изменить `FacetCreateScript`;
   - добавить `sources` в `FacetUpdateInput`;
   - решить, разрешать ли несколько sources одного `facetType`;
   - проверить constraint `facet_source_project_type_handle_uniq`, потому что он запрещает повторное использование одного source handle в другом facet.

2. Создание source facet values.

   Candidates API не дает `sourceValueIds`, потому что эти IDs относятся к `facet_value`, а не к raw catalog option/tag/feature values. Нужен отдельный сценарий:

   - либо mutation `facetValueSourceEnsureMany(facetId, candidates)` создает source values для выбранного facet source и candidate `handle`;
   - либо `facetValueCreate` расширяется и принимает `sourceCandidates`;
   - либо `facetCreate` расширяется и может сразу создать selected display/source values.

3. Что считать duplicate для `excludeExisting`.

   Для root display values duplicate очевиден по `facetId + handle`.
   Для source values duplicate тоже по `facetId + handle`; для `OPTION`/`FEATURE` candidate handle уже составной (`source:value`).
   Если один display value объединяет несколько source values, candidate может быть "занят", даже если display handle другой. Для точного исключения нужно проверять source children, а не только root handle.

## Порядок реализации

1. Добавить migration `services/catalog/migrations/domains/0500_facets/0505_facets__value_candidate_view.sql` с SQL из раздела `Migration SQL`.

2. Добавить `facetValueCandidateView` в models и export из `repositories/models/index.ts`.

3. Добавить GraphQL object/connection types и query в `facet.graphql`.

4. Добавить/обновить drizzle-query config для генерации `FacetValueCandidateWhereInput`, `FacetValueCandidateOrderField` и `FacetValueCandidateOrderByInput` в `schema/__generated__/filters.graphql`.

5. Сгенерировать GraphQL filters, resolver types и schemas через существующий project codegen flow.

6. Добавить relay query и repository method.

7. Добавить `FacetValueCandidateResolver` и `FacetValueCandidateConnectionResolver`.

8. Подключить `facetValueCandidates` в `CatalogQueryResolver`.

9. После реализации запускать build, но не запускать test/tsc отдельно по правилам проекта.

Frontend/Admin UI шаги намеренно не включены в этот порядок реализации.
