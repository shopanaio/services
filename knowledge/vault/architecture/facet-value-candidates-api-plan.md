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
- фильтруется по raw полям view через `where`;
- поддерживает create flow через `where.facetType + where.sourceHandle`;
- поддерживает edit flow через `meta.facetsScope`;
- поддерживает только `TAG`, `OPTION` и `FEATURE`;
- для edit flow всегда исключает уже добавленные/привязанные source values;
- для `TAG` возвращает все существующие tags;
- для `OPTION` возвращает агрегированные option values по `option.slug + optionValue.slug`, где публичный `handle` имеет формат `option.slug:optionValue.slug`;
- для `FEATURE` возвращает агрегированные feature values по `feature.slug + featureValue.slug`, где публичный `handle` имеет формат `feature.slug:featureValue.slug`.
- для `PRICE` и `IN_STOCK` candidates API не применяется и должен возвращать ошибку валидации на resolver/repository boundary.

## Non-goals

Admin UI не входит в этот план. План описывает только backend/API часть в `services/catalog`.

Этот API не должен создавать facet values.

Текущий `FacetValueCreateInput` для display value принимает `sourceValueIds`, то есть для связывания display value с source values сами source `facet_value` записи должны уже существовать. Candidates API только показывает потенциальные исходные значения из catalog data. Создание/синхронизацию source `facet_value` записей нужно проектировать отдельным шагом.

## Предлагаемая GraphQL схема

Добавить в `services/catalog/src/api/graphql-admin/schema/facet.graphql` публичные object/connection types:

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
  sourceHandle: StringFilter
  handle: StringFilter
  label: StringFilter
}

enum FacetValueCandidateOrderField {
  id
  facetType
  sourceHandle
  handle
  label
}
```

Важно: generated enum values должны быть в текущем стиле проекта
(`handle`, `label`), а не `HANDLE`/`LABEL`.
`sourceHandle` должен попадать в public generated where/order для этого API,
потому create flow фильтрует raw candidates через `where.sourceHandle`.
В `services/catalog/scripts/generate-filters.ts` для `FacetValueCandidate`
обязательно указать `excludeFields: ["projectId", "locale"]`
и для `generateWhereInputType`, и для `generateOrderByInputType`.

Добавить meta input рядом с facet schema types:

```graphql
input FacetValueCandidatesMetaInput {
  facetsScope: FacetValueCandidatesFacetsScopeInput
}

input FacetValueCandidatesFacetsScopeInput {
  referenceIds: [ID!]!
  mode: CategoryHierarchyScopeMode!
}
```

`facetsScope` повторяет scope-паттерн существующих list queries
(`ProductCategoriesScopeInput`, `CategoryProductsScopeInput`): scope передается
через `meta`, а generic `where` остается фильтром по полям списка.

Добавить query в `CatalogQuery`:

```graphql
facetValueCandidates(
  first: Int
  after: String
  last: Int
  before: String
  where: FacetValueCandidateWhereInput
  orderBy: [FacetValueCandidateOrderByInput!]
  meta: FacetValueCandidatesMetaInput
): FacetValueCandidateConnection!
```

Пояснения:

- Top-level custom args для `facetType`, `sourceHandles`, `facetId` и `excludeExisting` не добавлять.
- допустимые значения `facetType` для этого API: `TAG`, `OPTION`, `FEATURE`; `PRICE` и `IN_STOCK` не поддерживаются.
- Create flow фильтрует raw candidates через `where.facetType + where.sourceHandle`.
- Edit flow передает существующий facet через `meta.facetsScope`.
- `exclude existing` не является публичной опцией: для edit flow repository всегда скрывает candidates, для которых в выбранном facet уже есть source `facet_value` с таким же `handle`.
- `where.facetType` используется как raw filter по типу candidate.
- `where.sourceHandle` используется как raw filter по выбранному source.
- `where.handle` используется для поиска по persisted source value handle. Для `OPTION`/`FEATURE` это составной handle вида `source:value`.
- `where.label` используется для поиска по отображаемому имени.
- `meta.facetsScope` не попадает в generated where/order inputs, потому это context/scope списка, а не поле raw candidate view.

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
```

Старые migration файлы не изменять. `0504_facets__source_candidate_view.sql` остается без изменений, потому новый API читает отдельную view и не меняет contract `facetSourceCandidates`.

Существующие не-migration файлы, которые будут изменены при реализации:

- `services/catalog/src/repositories/models/index.ts` — добавить export `facetValueCandidateView`.
- `services/catalog/src/api/graphql-admin/schema/facet.graphql` — добавить публичные object/connection/meta/scope types.
- `services/catalog/src/api/graphql-admin/schema/base.graphql` — обновится через существующий schema/codegen flow, если этот файл является агрегированным generated snapshot в текущем процессе.
- `services/catalog/scripts/generate-filters.ts` — добавить генерацию `FacetValueCandidateWhereInput` и `FacetValueCandidateOrderByInput`; исключить `projectId`, `locale` из public filters/order.
- `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql` — generated output после `generate:filters`.
- `services/catalog/src/resolvers/admin/generated/types.ts` и `services/catalog/src/resolvers/admin/generated/schemas.ts` — generated output после GraphQL codegen.
- `services/catalog/src/repositories/facet/FacetRepository.ts` — добавить relay query и repository method.
- `services/catalog/src/resolvers/admin/filter-normalizers.ts` — добавить нормализацию `FacetValueCandidatesFacetsScopeInput`.
- `services/catalog/src/resolvers/admin/FacetValueCandidateResolver.ts` — новый resolver для node.
- `services/catalog/src/resolvers/admin/FacetValueCandidateConnectionResolver.ts` — новый resolver для connection.
- `services/catalog/src/resolvers/admin/QueryResolver.ts` — подключить `facetValueCandidates`.
- `services/catalog/src/resolvers/admin/index.ts` — export новых resolvers и input types.

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

`FacetValueCandidateArgs` должен быть обычным relay input плюс `meta`:

```ts
export type FacetValueCandidateRelayInput = InferRelayInput<
  typeof facetValueCandidateRelayQuery
>;

export type NormalizedFacetValueCandidatesFacetsScope =
  | { kind: "empty" }
  | {
      kind: "scope";
      referenceIds: string[];
      mode: "INCLUDE" | "EXCLUDE";
    };

export type FacetValueCandidateArgs = FacetValueCandidateRelayInput & {
  meta?: {
    facetsScope?: NormalizedFacetValueCandidatesFacetsScope;
  } | null;
};
```

Базовый `where` для raw create mode:

```ts
{
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    ...(args.where ? [args.where] : []),
  ],
}
```

`sourceHandle` является raw полем view и public filter/order field, поэтому он должен быть включен в `facetValueCandidateRelayQuery.include(...)`.
Ожидаемая настройка генерации:

```ts
const facetValueCandidateFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  facetType: "String",
  sourceHandle: "String",
  handle: "String",
  label: "String",
};

const facetValueCandidateWhere = generateWhereInputType(
  facetValueCandidateRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["projectId", "locale"],
  }
);

const facetValueCandidateOrderBy = generateOrderByInputType(
  facetValueCandidateRelayQuery,
  "FacetValueCandidate",
  {
    includeDescriptions: true,
    fieldTypes: facetValueCandidateFieldTypes,
    excludeFields: ["projectId", "locale"],
  }
);
```

### Raw create mode

Если `meta.facetsScope` не передан, repository только добавляет системные фильтры
`projectId` и `locale`. Клиент обязан сузить raw candidates через `where`,
обычно через `facetType` и `sourceHandle`.

Практическая repository validation:

- raw create mode должен содержать достаточный filter scope, минимум `where.facetType` и `where.sourceHandle`;
- `PRICE` и `IN_STOCK` должны возвращать validation error, потому для них нет raw source value candidates.

### Facets scope edit mode

Если передан `meta.facetsScope`:

1. resolver нормализует `referenceIds` через `decodeGlobalIdByType(id, GlobalIdEntity.Facet)`;
2. пустой или невалидный scope превращается в `{ kind: "empty" }`;
3. repository загружает facets в текущем project;
4. для первой реализации поддерживается только `mode: INCLUDE` и один `referenceId`;
5. repository берет sources выбранного facet из `facet_source`;
6. repository берет existing source value handles из `facet_value`;
7. raw candidates запрашиваются из view с дополнительными условиями:

   ```ts
   {
     _and: [
       { projectId: { _eq: this.storeId } },
       { locale: { _eq: this.locale } },
       { facetType: { _eq: facet.facetType } },
       { sourceHandle: { _in: facetSourceHandles } },
       ...(existingSourceValueHandles.length
         ? [{ handle: { _notIn: existingSourceValueHandles } }]
         : []),
       ...(args.where ? [args.where] : []),
     ],
   }
   ```

Смысл SQL:

```sql
SELECT *
FROM "catalog"."facet_value_candidate_view"
WHERE project_id = :projectId
  AND locale = :locale
  AND facet_type = :facetType
  AND source_handle IN (:facetSourceHandles)
  AND handle NOT IN (:existingSourceValueHandles)
```

`exclude existing` не зашивать в view, потому raw candidate не должен зависеть
от конкретного facet. Это repository-level invariant для edit mode.
Условие занятости не должно проверять `parent_id IS NULL`: source value может
быть уже прикреплен к display value, но candidate все равно должен считаться занятым.

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

### Выбран source `color`

```graphql
query FacetValueCandidates(
  $after: String
  $where: FacetValueCandidateWhereInput
) {
  catalogQuery {
    facetValueCandidates(
      first: 30
      after: $after
      where: $where
      orderBy: [{ field: label, direction: ASC }]
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
    "_and": [
      { "facetType": { "_eq": "OPTION" } },
      { "sourceHandle": { "_eq": "color" } },
      {
        "_or": [
          { "handle": { "_containsi": "red" } },
          { "label": { "_containsi": "red" } }
        ]
      }
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
      first: 20
      where: $where
      meta: {
        facetsScope: {
          referenceIds: [$facetId]
          mode: INCLUDE
        }
      }
      orderBy: [{ field: label, direction: ASC }]
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

3. Source values creation flow.

   Если отдельный сценарий создания source values будет добавлен позже, он должен использовать тот же identity contract, что и edit-mode exclusion: duplicate source value определяется по `facetId + kind = 'source' + handle`. Для `OPTION`/`FEATURE` candidate handle уже составной (`source:value`).

4. Multiple facets в `facetsScope`.

   Scope input поддерживает `referenceIds`, потому интерфейс совпадает с существующим scope pattern. Для первой реализации edit flow должен поддержать только `mode: INCLUDE` и ровно один facet id. Расширение на несколько facets нужно проектировать отдельно, потому candidate node не содержит facet context, а existing handles считаются facet-scoped.

## Порядок реализации

1. Добавить migration `services/catalog/migrations/domains/0500_facets/0505_facets__value_candidate_view.sql` с SQL из раздела `Migration SQL`.

2. Добавить `facetValueCandidateView` в models и export из `repositories/models/index.ts`.

3. Добавить GraphQL object/connection/meta/scope types и query в `facet.graphql`.

4. Добавить/обновить drizzle-query config для генерации `FacetValueCandidateWhereInput`, `FacetValueCandidateOrderField` и `FacetValueCandidateOrderByInput` в `schema/__generated__/filters.graphql`.

5. Сгенерировать GraphQL filters, resolver types и schemas через существующий project codegen flow.

6. Добавить нормализацию `FacetValueCandidatesFacetsScopeInput` в `filter-normalizers.ts`.

7. Добавить relay query и repository method с raw create mode и facets scope edit mode.

8. Добавить `FacetValueCandidateResolver` и `FacetValueCandidateConnectionResolver`.

9. Подключить `facetValueCandidates` в `CatalogQueryResolver` и передавать нормализованный `meta.facetsScope`.

10. После реализации запускать build, но не запускать test/tsc отдельно по правилам проекта.

Frontend/Admin UI шаги намеренно не включены в этот порядок реализации.
