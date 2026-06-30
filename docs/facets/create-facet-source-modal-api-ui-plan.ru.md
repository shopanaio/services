# План: API и UI модалки выбора source для Create Facet

## Контекст

В `CreateFacetModal` source сейчас выбирается как простой список типов:
`PRICE`, `TAG`, `OPTION`, `FEATURE`, `IN_STOCK`. Целевое поведение должно быть
ближе к Shopify-style modal: пользователь кликает на source в поле label,
открывается модалка `Select source` со строкой поиска и таблицей доступных
источников.

Доступные source:

| Name | Type | Facet type | Handle |
| --- | --- | --- | --- |
| Price | Standard | `PRICE` | `price` |
| Availability | Standard | `IN_STOCK` | `availability` |
| Tags | Product tags | `TAG` | `tags` |
| Color | Product option | `OPTION` | `color` |
| Nice | Product feature | `FEATURE` | `nice` |

Важно: source, которые уже используются в `catalog.facet_source`, не должны
возвращаться API и не должны отображаться в UI.

## Цели

1. Добавить Admin API для списка доступных facet sources с легкой
   cursor-pagination, фильтрацией по `facetType` и клиентским поиском по
   отображаемому названию.
2. Подготовить Postgres/Drizzle `facet_source_candidate_view`, который
   нормализует standard, tag, option и feature sources в один read model.
3. Исключать уже использованные sources через `NOT EXISTS` во view.
4. Заменить dropdown выбора source в `CreateFacetModal` на отдельную модалку
   выбора source.
5. При выборе source автоматически заполнять `facetType`, `label`, `slug` и
   `sources` для создания facet.

## Не цели

- Не менять модель `facet_value` и merge/unmerge values.
- Не добавлять selection нескольких sources в create modal. Выбор source один.
- Не запускать `test` или `tsc`; для проверки новой версии кода использовать
  build по правилам проекта.
- Не редактировать changeset вручную.

## Термины и ключи

### Source key

Для исключения уже использованных источников использовать пару:

```text
facet_type + handle
```

Она уже закреплена unique constraint:

```text
facet_source_project_type_handle_uniq(project_id, facet_type, handle)
```

### Canonical handles

Standard sources:

- `PRICE`: `handle = price`
- `IN_STOCK`: `handle = availability`
- `TAG`: `handle = tags`

Dynamic sources:

- `OPTION`: `handle = product_option.slug`
- `FEATURE`: `handle = product_feature.slug`

Для `OPTION` и `FEATURE` строки должны агрегироваться по `project_id + slug`,
потому что option/feature сейчас привязаны к конкретным продуктам. Один source
`Color` должен появляться один раз, даже если option `color` есть у многих
продуктов.

### Enum casing boundary

Canonical casing для facet type в этой задаче — `UPPERCASE`.

Это значит:

- `facet_source_candidate_view.facet_type` возвращает только GraphQL enum values:
  `PRICE`, `IN_STOCK`, `TAG`, `OPTION`, `FEATURE`;
- Admin API `FacetSourceCandidate.facetType` и input `FacetCreateInput.facetType`
  работают в `UPPERCASE`;
- Admin UI form state хранит `FacetType` из generated GraphQL enum, то есть
  `UPPERCASE`;
- create validation сравнивает selected candidate с GraphQL input в
  `UPPERCASE`, до любой legacy-нормализации;
- `FacetCreateScript` должен принимать/валидировать `UPPERCASE` facetType и
  передавать `UPPERCASE` в `repository.facet.create()`;
- `MutationResolver.facetCreate()` больше не должен делать `.toLowerCase()` для
  `facetType`; lowercasing допустим только для legacy `uiType` /
  `selectionMode`, если storage для этих полей остается lowercase.

Текущий код resolver/script использует lowercase boundary:
`MutationResolver.facetCreate()` вызывает `args.input.facetType.toLowerCase()`,
а `FacetCreateScript` валидирует `price`, `tag`, `feature`, `option`,
`in_stock`. Это нужно изменить вместе с добавлением `sources`, иначе
`facet_source_candidate_view` с `UPPERCASE` values не сможет корректно
сравниваться с create input.

Для persisted `catalog.facet.facet_type` и `catalog.facet_source.facet_type`
целевое значение тоже `UPPERCASE`. Так `NOT EXISTS` во view может сравнивать
`fs.facet_type = c.facet_type` без `LOWER()`/`UPPER()` wrapper и использовать
индекс `facet_source_project_type_handle_uniq(project_id, facet_type, handle)`.
Если в dev/seed данных уже есть lowercase facet types, migration или seed
refresh должен привести их к `UPPERCASE` в рамках этой работы.

## DB/API read model

### Candidate view

Добавить read model:

```text
services/catalog/src/repositories/models/facetSourceCandidateView.ts
```

Drizzle export:

```ts
export const facetSourceCandidateView =
  catalogSchema.view("facet_source_candidate_view", {
    id: text("id").notNull(),
    projectId: uuid("project_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    handle: text("handle").notNull(),
    name: text("name"),
    sourceSortBucket: integer("source_sort_bucket").notNull(),
    sortName: text("sort_name"),
  }).as(...);
```

View должен быть normalization + availability read model для create modal. Он:

- нормализует standard, tag, option и feature candidates;
- исключает already-used sources через `NOT EXISTS`;
- не применяет pagination;
- не применяет final `ASC`/`DESC` sort;
- не зависит от UI search.

`NOT EXISTS` остается в SQL view, чтобы `@shopana/drizzle-query` работал уже с
available rows и не требовал отдельного raw SQL wrapper в repository.

Read model кандидата:

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | text | stable candidate id: `facet_type || ':' || handle` |
| `projectId` | uuid | tenant/store scope |
| `locale` | varchar/text | locale of translated `name` |
| `facetType` | text/varchar | `PRICE`, `IN_STOCK`, `TAG`, `OPTION`, `FEATURE` |
| `handle` | text | canonical source handle |
| `name` | text/null | localized DB label for dynamic option/feature sources |
| `sourceSortBucket` | integer | stable source group order |
| `sortName` | text/null | backend name sort key; `null` for fixed/system sources |

Backend не должен отдавать UI-тексты для fixed/system sources. Для `PRICE`,
`IN_STOCK` и `TAG` поле `name` должно быть `null`; Admin UI локализует `Name`
и `Type` по стабильной паре `facetType + handle`.

`name` для `OPTION` и `FEATURE` нельзя строить из `slug`. Название должно
приходить из locale-aware translation tables:

- `catalog.product_option_translation.name`;
- `catalog.product_feature_translation.name`.

Repository обязан фильтровать view по текущему project и locale:

```ts
const projectId = this.storeId;
const locale = this.locale;
```

Предпочтительный SQL shape для view:

```sql
CREATE VIEW catalog.facet_source_candidate_view AS
WITH project_locale_source AS (
  SELECT DISTINCT project_id, locale
  FROM catalog.product_translation

  UNION
  SELECT DISTINCT project_id, locale
  FROM catalog.tag_translation

  UNION
  SELECT DISTINCT project_id, locale
  FROM catalog.product_option_translation

  UNION
  SELECT DISTINCT project_id, locale
  FROM catalog.product_feature_translation

  UNION
  SELECT DISTINCT project_id, locale
  FROM catalog.facet_translation
),
candidates AS (
  SELECT
    pls.project_id,
    pls.locale,
    'PRICE'::text AS facet_type,
    'price'::text AS handle,
    NULL::text AS name,
    0 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.project_id,
    pls.locale,
    'IN_STOCK'::text AS facet_type,
    'availability'::text AS handle,
    NULL::text AS name,
    1 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.project_id,
    pls.locale,
    'TAG'::text AS facet_type,
    'tags'::text AS handle,
    NULL::text AS name,
    2 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    po.project_id,
    pot.locale,
    'OPTION'::text AS facet_type,
    po.slug AS handle,
    MIN(pot.name) AS name,
    3 AS source_sort_bucket
  FROM catalog.product_option po
  INNER JOIN catalog.product_option_translation pot
    ON pot.project_id = po.project_id
   AND pot.option_id = po.id
  GROUP BY po.project_id, pot.locale, po.slug

  UNION ALL
  SELECT
    pf.project_id,
    pft.locale,
    'FEATURE'::text AS facet_type,
    pf.slug AS handle,
    MIN(pft.name) AS name,
    4 AS source_sort_bucket
  FROM catalog.product_feature pf
  INNER JOIN catalog.product_feature_translation pft
    ON pft.project_id = pf.project_id
   AND pft.feature_id = pf.id
  WHERE pf.is_group = false
  GROUP BY pf.project_id, pft.locale, pf.slug
)
SELECT
  c.facet_type || ':' || c.handle AS id,
  c.project_id,
  c.locale,
  c.facet_type,
  c.handle,
  c.name,
  c.source_sort_bucket,
  c.name AS sort_name
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM catalog.facet_source fs
  WHERE fs.project_id = c.project_id
    AND fs.facet_type = c.facet_type
    AND fs.handle = c.handle
);
```

`GROUP BY project_id, locale, slug` нужен только для дедупликации product-level
option/feature rows в один source на конкретную локаль. `MIN(name)` выбирает
стабильное canonical name, если один и тот же slug встретился с разными
переводами в рамках одной локали. Это не сортировка списка.

Сортировка списка должна быть только в repository query поверх view. Направление
передается в `drizzle-query` через `orderBy`, без raw SQL interpolation:

```sql
-- asc
ORDER BY c.source_sort_bucket ASC, c.sort_name ASC NULLS LAST, c.id ASC

-- desc
ORDER BY c.source_sort_bucket ASC, c.sort_name DESC NULLS LAST, c.id ASC
```

`source_sort_bucket` держит standard sources перед dynamic sources.

`TAG` отображается для каждого `project_id + locale`, найденного в
`project_locale_source`, даже если в проекте еще нет тегов.

Ограничение: если в catalog DB нет ни одной локализованной строки для проекта,
`project_locale_source` не сможет породить standard rows. Если нужно показывать
`PRICE`/`IN_STOCK`/`TAG` для полностью пустого tenant, нужно добавить или
использовать catalog-local `project/store locale` reference table и строить
`project_locale_source` из нее.

### Индексы

Для быстрого view и repository query добавить индексы к таблицам, которые
участвуют в dynamic branches:

```sql
CREATE INDEX idx_product_option_project_slug
  ON catalog.product_option (project_id, slug);

CREATE INDEX idx_product_option_translation_project_locale_option
  ON catalog.product_option_translation (project_id, locale, option_id);

CREATE INDEX idx_product_feature_project_group_slug
  ON catalog.product_feature (project_id, is_group, slug);

CREATE INDEX idx_product_feature_translation_project_locale_feature
  ON catalog.product_feature_translation (project_id, locale, feature_id);
```

Exclusion уже покрыт текущим индексом/unique constraint на
`catalog.facet_source(project_id, facet_type, handle)`.

Не использовать materialized view на первом этапе. Он добавит refresh/invalidate
сложность без явной пользы для admin modal. Возвращаться к materialized view
только после `EXPLAIN ANALYZE` на реальных seed-данных, если query стабильно
медленнее целевого порога.

## Repository API

### Drizzle Query integration

Repository должен использовать `@shopana/drizzle-query` поверх
`facetSourceCandidateView`:

```ts
export const facetSourceCandidateRelayQuery = createRelayQuery(
  createQuery(facetSourceCandidateView)
    .include(["id", "projectId", "locale", "facetType", "handle"])
    .maxLimit(100)
    .defaultLimit(30),
  { name: "facetSourceCandidate", tieBreaker: "id" }
);

export type FacetSourceCandidateRelayInput =
  InferRelayInput<typeof facetSourceCandidateRelayQuery>;
```

View уже возвращает только available rows благодаря `NOT EXISTS`, поэтому
repository не делает отдельный raw SQL anti-join и не делает предварительный
`usedSourceIds` select.

Repository merge поверх Relay input:

- обязательные `projectId = this.storeId` и `locale = this.locale`;
- optional `facetType`;
- stable `orderBy`;
- `execute()` и `count()` через один и тот же merged `where`.

Пример:

```ts
const mergedWhere: FacetSourceCandidateRelayInput["where"] = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    ...(args.facetType ? [{ facetType: { _eq: args.facetType } }] : []),
  ],
};

const direction = args.sortDirection ?? "asc";
const executeInput: FacetSourceCandidateRelayInput = {
  first: args.first,
  after: args.after,
  where: mergedWhere,
  orderBy: [
    { field: "sourceSortBucket", direction: "asc" },
    { field: "sortName", direction },
    { field: "id", direction: "asc" },
  ],
};

const [result, totalCount] = await Promise.all([
  facetSourceCandidateRelayQuery.execute(this.connection, executeInput),
  facetSourceCandidateRelayQuery.count(this.connection, { where: mergedWhere }),
]);
```

`sortName` равен DB translation `name` и используется только для dynamic rows.
Fixed/system rows имеют `sortName = null`; их порядок задает `sourceSortBucket`,
потому что backend не знает frontend translation catalog.

### Repository method

Добавить метод:

```ts
async getAvailableFacetSourceCandidates(
  args: FacetSourceCandidateRelayInput
): Promise<FacetSourceCandidateConnectionResult>
```

Input type должен быть derived от `InferRelayInput`:

```ts
type FacetSourceCandidatesArgs = Omit<
  FacetSourceCandidateRelayInput,
  "where" | "orderBy"
> & {
  first?: number | null;
  after?: string | null;
  facetType?: string | null;
  sortDirection?: "asc" | "desc" | null;
};
```

Default/max limits:

```ts
const defaultLimit = 30;
const maxLimit = 100;
```

### Exclude used sources

Доступный source определяется как row из `facet_source_candidate_view`, где уже
применен `NOT EXISTS` к `catalog.facet_source` по тому же:

```text
project_id + facet_type + handle
```

Фильтрация уже использованных sources должна оставаться в view SQL, а не в UI и
не в отдельном `usedSourceIds` select. Это сохраняет чистую интеграцию
repository с `createRelayQuery`.

Правила exclusion:

- если есть `facet_source(project_id, 'PRICE', 'price')`, `Price` не
  возвращается;
- если есть `facet_source(project_id, 'IN_STOCK', 'availability')`,
  `Availability` не возвращается;
- если есть `facet_source(project_id, 'TAG', 'tags')`, `Tags` не возвращается;
- если есть `facet_source(project_id, 'OPTION', 'color')`, option source
  `color` не возвращается;
- если есть `facet_source(project_id, 'FEATURE', 'nice')`, feature source
  `nice` не возвращается.

Причина держать exclusion внутри view: `drizzle-query` получает уже available
read model и может отвечать за filtering, sorting, cursor pagination и
`totalCount` без raw SQL wrapper.

### Search

Поиск в модалке работает по отображаемому названию source. Для dynamic
`OPTION`/`FEATURE` это backend поле `name`, полученное из translation tables.
Для fixed/system sources это frontend i18n label по `facetType + handle`.

Backend не должен делать search по `name` на первом этапе, потому что:

- fixed/system rows имеют `name = null`;
- backend не знает frontend translation catalog;
- список candidates для modal ограничен `maxLimit = 100`;
- клиентский поиск по display label проще и не ломает fixed sources.

Hook загружает available candidates и фильтрует на клиенте:

```ts
const displayName =
  source.name ?? getSystemSourceName(source.facetType, source.handle);
```

Backend разрешает только легкие параметры:

- `facetType`;
- `sortDirection`;

Сортировка backend:

```text
sourceSortBucket, sortName ASC/DESC NULLS LAST, id
```

## GraphQL schema

Добавить в `services/catalog/src/api/graphql-admin/schema/facet.graphql`:

```graphql
type FacetSourceCandidate {
  id: ID!
  locale: String!
  facetType: FacetType!
  handle: String!
  name: String
}

type FacetSourceCandidateEdge {
  cursor: String!
  node: FacetSourceCandidate!
}

type FacetSourceCandidateConnection {
  edges: [FacetSourceCandidateEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

В `CatalogQuery` добавить:

```graphql
facetSourceCandidates(
  first: Int
  after: String
  facetType: FacetType
  sortDirection: SortDirection = asc
): FacetSourceCandidateConnection!
```

`FacetSourceCandidate` не должен реализовывать `Node`: это computed candidate,
а не persisted entity с lookup через `node(id:)`. `id` остается стабильным
candidate id для cursor/UI selection.

## Resolvers

Добавить:

```text
services/catalog/src/resolvers/admin/FacetSourceCandidateResolver.ts
services/catalog/src/resolvers/admin/FacetSourceCandidateConnectionResolver.ts
```

Resolver поля:

- `id()` возвращает synthetic key `facetType:handle`;
- `facetType()` возвращает GraphQL enum;
- `handle()` возвращает canonical source handle;
- `name()` возвращает DB translation для `OPTION`/`FEATURE`, иначе `null`.

В `QueryResolver` добавить:

```ts
facetSourceCandidates(args: FacetSourceCandidateConnectionInput) {
  return new FacetSourceCandidateConnectionResolver(args, this.$ctx);
}
```

## Mutation create facet

Сейчас `FacetCreateInput` принимает только `facetType`, `slug`, `uiType`,
`selectionMode`, `label`. Чтобы сохранить выбранный source, добавить:

Текущее состояние важно не трактовать как отсутствие поддержки sources во всех
слоях. `FacetRepository.create()` уже принимает `sources?: FacetSourceInput[]`
и умеет вставлять `facet_source`/`facet_source_translation` через
`replaceSources()`. Поэтому эта часть работы не должна переписывать repository
создания facet с нуля. Нужно протянуть `sources` через внешние слои, которые
сейчас его не передают:

- GraphQL schema `FacetCreateInput`;
- generated GraphQL zod/types после codegen;
- `MutationResolver.facetCreate()` mapping из GraphQL input в script params;
- `FacetCreateParams` DTO;
- `FacetCreateScript` validation и передача `sources` в
  `repository.facet.create()`;
- admin `mapFacetFormToCreateInput()` и form state create modal.

```graphql
input FacetCreateSourceInput {
  handle: String!
  name: String!
}

input FacetCreateInput {
  facetType: FacetType!
  slug: String!
  uiType: FacetUIType
  selectionMode: FacetSelectionMode
  label: String!
  sources: [FacetCreateSourceInput!]
}
```

Для create modal отправлять один source:

```json
{
  "facetType": "OPTION",
  "label": "Color",
  "slug": "color",
  "sources": [{ "handle": "color", "name": "Color" }]
}
```

Для standard sources:

```json
{
  "facetType": "PRICE",
  "label": "<localized Price>",
  "slug": "price",
  "sources": [{ "handle": "price", "name": "<localized Price>" }]
}
```

Backend validation в create script/repository:

- `sources.length === 1` для `PRICE`, `IN_STOCK`, `TAG`, `OPTION`, `FEATURE`;
- selected source существует в `facet_source_candidate_view` для текущих
  `projectId` и `locale`;
- selected source еще не используется в `facet_source`;
- `facetType` input совпадает с candidate `facetType` в `UPPERCASE`;
- `sources[0].handle` совпадает с candidate `handle`.

Create flow должен быть транзакционным. `FacetCreateScript` является владельцем
атомарного сценария:

1. провалидировать input и выбранный source candidate;
2. создать `facet`;
3. вставить `facet_translation`;
4. вставить `facet_source` и `facet_source_translation` через уже существующую
   поддержку `sources` в `FacetRepository.create()`;
5. вернуть созданный facet.

Эти шаги должны выполняться в одной transaction boundary script/kernel flow.
Нельзя полагаться на UI как на защиту от устаревшего выбора source: UI только
выбирает candidate и отправляет payload, а backend повторно проверяет candidate
перед insert. Если source стал занят между открытием модалки и submit,
validation должна вернуть userError на `sources`/`source`; если гонка случилась
после validation, unique constraint `facet_source_project_type_handle_uniq`
остается последней защитой и должен быть преобразован в userError, а не в
необработанную internal error.

Repository уже выполняет insert sources и сохраняет translation name, но не
должен становиться владельцем UI/API-specific validation. Проверки выбранного
candidate должны жить в create script / resolver boundary до вызова
`repository.facet.create()`. Нормализация casing здесь не должна переводить
`facetType` в lowercase: resolver передает GraphQL enum как `UPPERCASE`, script
валидирует `UPPERCASE`, repository сохраняет `UPPERCASE`.

Unique constraint в `facet_source` остается последней защитой от race condition,
но не заменяет transactional validation в `FacetCreateScript`.

## Admin UI

### GraphQL операции

В `admin/src/domains/inventory/facets/graphql/queries.ts` добавить:

```graphql
query FacetSourceCandidates(
  $first: Int
  $after: String
  $facetType: FacetType
  $sortDirection: SortDirection
) {
  catalogQuery {
    facetSourceCandidates(
      first: $first
      after: $after
      facetType: $facetType
      sortDirection: $sortDirection
    ) {
      edges {
        cursor
        node {
          id
          locale
          facetType
          handle
          name
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
}
```

Добавить hook:

```text
admin/src/domains/inventory/facets/hooks/use-facet-source-candidates.ts
```

Hook принимает:

- `search`;
- pagination cursor;
- optional `facetType`;
- optional `sortDirection`;

Возвращает generated API shapes напрямую, по правилу
`knowledge/vault/patterns/admin-graphql-layer.md`.

`search` применяется в hook/client по display label:

```ts
const displayName =
  source.name ?? getSystemSourceName(source.facetType, source.handle);
```

Backend search не используется, чтобы не терять fixed/system sources с
`name = null`.

### Модалка выбора source

Добавить:

```text
admin/src/domains/inventory/facets/modals/select-facet-source-modal/
  select-facet-source-modal.tsx
  index.ts
```

Зарегистрировать в `admin/src/domains/modals.tsx` новый modal type:

```ts
type: "facet-source-select"
```

Payload:

```ts
interface ISelectFacetSourceModalPayload {
  selectedId?: string;
  onSelect: (source: FacetSourceCandidateFields) => void;
}
```

UI:

- header title: `Select source`;
- close icon;
- search input с placeholder `Search filter sources`;
- таблица с колонками `Name` и `Type`;
- колонка `Name` отображает `source.name ?? getSystemSourceName(source.facetType, source.handle)`;
- колонка `Type` отображает frontend i18n label по `source.facetType`;
- row click выбирает source и закрывает modal;
- footer только `Cancel`;
- empty state: `No sources available`;
- loading state внутри таблицы;
- infinite scroll или `Load more`, если `hasNextPage`.

Для desktop ширина около `920px`, для mobile full width с безопасными отступами.

### Интеграция в CreateFacetModal

Заменить `FacetSourceSelector` dropdown на button/addon, который открывает
`facet-source-select`.

Form state расширить:

```ts
  source: {
  id: string;
    facetType: FacetType;
    handle: string;
    name: string | null;
  }
```

При выборе source:

1. `setValue("source", source)`;
2. `setValue("facetType", source.facetType)`;
3. вычислить `displayName = source.name ?? getSystemSourceName(source.facetType, source.handle)`;
4. `setValue("label", displayName)`, если пользователь еще не редактировал label;
5. `setValue("slug", slugify(displayName))`, если slug auto-managed;
6. пересчитать default `uiType` через `getDefaultFacetUiType(source.facetType)`.

Валидация `createFacetSchema`:

- source обязателен;
- `facetType` должен совпадать с `source.facetType`;
- для `OPTION`/`FEATURE` handle не пустой;
- для `PRICE`/`IN_STOCK`/`TAG` handle должен быть фиксированным canonical handle.

`mapFacetFormToCreateInput` должен отправлять:

```ts
const displayName =
  values.source.name ??
  getSystemSourceName(values.source.facetType, values.source.handle);

sources: [
  {
    handle: values.source.handle,
    name: displayName,
  },
]
```

### UX детали

- Если API вернул пустой список, create modal не должен показывать устаревшие
  hardcoded options.
- Если source был доступен при открытии, но стал использован до submit, backend
  вернет userError на `source`; UI показывает ошибку под source button и toast.
- Search debounce: 250-300 ms.
- Поиск ищет по display label на клиенте.

## Порядок реализации

1. Добавить `facetSourceCandidateView` в catalog models и экспорт из
   `repositories/models/index.ts`.
2. Добавить migration для `catalog.facet_source_candidate_view` и индексы для
   `product_option`, `product_option_translation`,
   `product_feature`, `product_feature_translation` через generated migration
   npm/CLI; не писать migration вручную.
3. Добавить repository method в `FacetRepository`, который читает из view через
   `facetSourceCandidateRelayQuery` и применяет `projectId`, `locale`, sort,
   pagination и `count`.
4. Реализовать cursor encode/decode и `limit + 1` pagination в repository.
5. Расширить GraphQL schema для `FacetSourceCandidateConnection`.
6. Добавить resolver и подключить query в `QueryResolver`.
7. Расширить `FacetCreateInput.sources`, generated zod/types, resolver mapping,
   `FacetCreateParams`, validation create script и admin
   `mapFacetFormToCreateInput`; repository create уже принимает `sources`.
   В этом же шаге зафиксировать `UPPERCASE` boundary: убрать
   `.toLowerCase()` для `facetType` в `MutationResolver.facetCreate()`,
   перевести `FacetCreateScript` allow-list / `UI_BY_TYPE` на `UPPERCASE` и
   сохранять `facet.facet_type` / `facet_source.facet_type` в `UPPERCASE`.
8. Сделать create flow транзакционным на уровне `FacetCreateScript`: validation
   selected candidate, create facet и insert `sources` через
   `repository.facet.create()` должны происходить в одной transaction boundary;
   duplicate source race от unique constraint маппить в userError.
9. Запустить backend codegen через shopana-cli.
10. Добавить admin GraphQL query, hook и generated types через admin codegen.
11. Реализовать `SelectFacetSourceModal` и зарегистрировать modal type.
12. Переделать `CreateFacetModal` на выбор source через modal.
13. Запустить build для затронутых частей, если нужна проверка новой версии.

## Проверочные сценарии

1. В проекте нет facets: API возвращает `Price`, `Availability`, `Tags`,
   все aggregated options/features.
2. Уже есть facet source `PRICE/price`: `Price` не возвращается.
3. Уже есть facet source `IN_STOCK/availability`: `Availability` не
   возвращается.
4. Уже есть facet source `TAG/tags`: `Tags` не возвращается.
5. Уже есть facet source `OPTION/color`: все product options со slug `color`
   агрегируются в один source и больше не возвращаются.
6. Уже есть facet source `FEATURE/nice`: feature source `Nice` не возвращается.
7. Client search `colo` возвращает `Color`, но не возвращает использованный
   `Color`.
8. Backend ordering стабилен и не ломает cursor pagination.
9. Submit create facet с source, который стал занятым после открытия modal,
   возвращает `userErrors` без создания duplicate facet.

## Открытые решения

1. Нужно ли на втором этапе добавлять backend search для очень больших списков
   option/feature. Первый этап сознательно использует client search для
   корректной работы fixed/system labels.
2. Какой latency threshold считать поводом для materialized/indexed projection.
   Предложение: возвращаться к этому только если `EXPLAIN ANALYZE` на реальных
   данных показывает стабильные запросы медленнее 100-200 ms.
