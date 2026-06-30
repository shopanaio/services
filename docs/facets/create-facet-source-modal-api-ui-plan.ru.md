# План: API выбора source для Create Facet

## Контекст

Create facet flow должен выбирать source не как абстрактный тип, а как
конкретный доступный source из backend read model. API должен возвращать только
те source, которые еще не используются в `catalog.facet_source`, и create
mutation должна сохранять выбранный source в `facet_source`.

Доступные source:

| Name | Type | Facet type | Handle |
| --- | --- | --- | --- |
| Price | Standard | `PRICE` | `price` |
| Availability | Standard | `IN_STOCK` | `availability` |
| Tags | Product tags | `TAG` | `tags` |
| Color | Product option | `OPTION` | `color` |
| Nice | Product feature | `FEATURE` | `nice` |

Важно: source, которые уже используются в `catalog.facet_source`, не должны
возвращаться API.

## Цели

1. Добавить Catalog GraphQL API для списка доступных facet sources с легкой
   cursor-pagination и фильтрацией по `facetType`.
2. Подготовить Postgres/Drizzle `facet_source_candidate_view`, который
   нормализует standard, tag, option и feature sources в один read model.
3. Исключать уже использованные sources через `NOT EXISTS` во view.
4. Расширить create facet mutation так, чтобы она принимала выбранный source и
   сохраняла `facet_source` / `facet_source_translation`.

## Не цели

- Не менять модель `facet_value` и merge/unmerge values.
- Не добавлять selection нескольких sources. Выбор source один.
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
- GraphQL API `FacetSourceCandidate.facetType` и input `FacetCreateInput.facetType`
  работают в `UPPERCASE`;
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

View должен быть normalization + availability read model для create flow. Он:

- нормализует standard, tag, option и feature candidates;
- исключает already-used sources через `NOT EXISTS`;
- не применяет pagination;
- не применяет final `ASC`/`DESC` sort;
- не зависит от presentation-layer search.

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

Backend не должен отдавать display-тексты для fixed/system sources. Для `PRICE`,
`IN_STOCK` и `TAG` поле `name` должно быть `null`; внешний consumer может
локализовать `Name` и `Type` по стабильной паре `facetType + handle`.

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

### Catalog migrations

Catalog migrations для этой задачи пишутся вручную PostgreSQL SQL и исполняются
через текущий `node-pg-migrate` runner. Не использовать Drizzle migrator,
Drizzle Kit generation или generated migration для catalog.

Файлы, которые должны измениться в рамках DB/model части:

```text
services/catalog/src/repositories/models/facetSourceCandidateView.ts
services/catalog/src/repositories/models/index.ts
services/catalog/docs/catalog-migrations-domain-inventory.md
services/catalog/migrations/domains/0500_facets/0504_facets__source_candidate_view.sql
```

`facetSourceCandidateView.ts` добавляет Drizzle view model для runtime query
contract. `repositories/models/index.ts` экспортирует новую модель рядом с
`facet`. `catalog-migrations-domain-inventory.md` нужно обновить вручную, чтобы
inventory отражал новый view и новые индексы. SQL migration добавляется новым
файлом в существующий facets-domain folder.

Migration file:

```text
services/catalog/migrations/domains/0500_facets/0504_facets__source_candidate_view.sql
```

Порядок обновления migration-файлов:

1. Не запускать Drizzle migration generation для catalog.
2. Создать новый SQL-файл:
   `services/catalog/migrations/domains/0500_facets/0504_facets__source_candidate_view.sql`.
3. Не изменять существующие migration files:
   - `services/catalog/migrations/domains/0500_facets/0500_facets__tables.sql`;
   - `services/catalog/migrations/domains/0500_facets/0501_facets__values.sql`;
   - `services/catalog/migrations/domains/0500_facets/0502_facets__sources.sql`;
   - `services/catalog/migrations/domains/0500_facets/0503_facets__relations.sql`.
4. В новом SQL-файле писать только `-- Up Migration`; down migration не добавлять,
   потому что project migrations сейчас forward-only и destructive rollback
   запрещен.
5. Добавить SQL statements в порядке ниже.
6. После SQL-файла вручную обновить
   `services/catalog/docs/catalog-migrations-domain-inventory.md`.

Точный порядок SQL внутри
`0504_facets__source_candidate_view.sql`:

1. Optional casing backfill, только если в этой работе принят `UPPERCASE`
   storage boundary:

   ```sql
   UPDATE "catalog"."facet"
   SET "facet_type" = UPPER("facet_type")
   WHERE "facet_type" <> UPPER("facet_type");

   UPDATE "catalog"."facet_source"
   SET "facet_type" = UPPER("facet_type")
   WHERE "facet_type" <> UPPER("facet_type");
   ```

   Этот блок должен идти до `CREATE VIEW`, чтобы view сразу сравнивал
   `facet_source.facet_type` с candidate `facet_type` без `LOWER()`/`UPPER()`.

2. Создать plain view:

   ```sql
   CREATE VIEW "catalog"."facet_source_candidate_view" AS
   -- use the CTE/query shape from the Candidate view section above
   ;
   ```

   View name is new. Do not use `CREATE OR REPLACE VIEW`, because there is no
   existing view to replace and this plan forbids replace-by-drop/rename flows.

3. Add supporting indexes with `IF NOT EXISTS`:

   ```sql
   CREATE INDEX IF NOT EXISTS "idx_product_option_project_slug"
     ON "catalog"."product_option" ("project_id", "slug");

   CREATE INDEX IF NOT EXISTS "idx_product_option_translation_project_locale_option"
     ON "catalog"."product_option_translation" ("project_id", "locale", "option_id");

   CREATE INDEX IF NOT EXISTS "idx_product_feature_project_group_slug"
     ON "catalog"."product_feature" ("project_id", "is_group", "slug");

   CREATE INDEX IF NOT EXISTS "idx_product_feature_translation_project_locale_feature"
     ON "catalog"."product_feature_translation" ("project_id", "locale", "feature_id");
   ```

Inventory update в
`services/catalog/docs/catalog-migrations-domain-inventory.md`:

1. Найти строку facets inventory, где сейчас перечислены
   `facet`, `facet_translation`, `facet_swatch`, `facet_value`,
   `facet_value_translation`, `facet_source`, `facet_source_translation`,
   `facet_value_source_handle`.
2. Добавить в список объектов `facet_source_candidate_view`.
3. В колонке migrations оставить domain pattern `0500_facets/*.sql` или явно
   добавить, что source candidate view находится в
   `0500_facets/0504_facets__source_candidate_view.sql`.
4. В колонке notes/constraints указать:
   - plain view `catalog.facet_source_candidate_view`;
   - candidate columns: `id`, `project_id`, `locale`, `facet_type`, `handle`,
     `name`, `source_sort_bucket`, `sort_name`;
   - support indexes:
     `idx_product_option_project_slug`,
     `idx_product_option_translation_project_locale_option`,
     `idx_product_feature_project_group_slug`,
     `idx_product_feature_translation_project_locale_feature`;
   - exclusion uses existing
     `facet_source_project_type_handle_uniq(project_id, facet_type, handle)`.

Manual migration review checklist:

- new SQL file lives only under `services/catalog/migrations/domains/0500_facets/`;
- no existing migration file is edited;
- no changeset file is edited;
- no `DROP` appears in the migration;
- no `RENAME` appears in the migration;
- no materialized view is introduced;
- all new indexes use `CREATE INDEX IF NOT EXISTS`;
- `facet_source_candidate_view` is exported from Drizzle models and documented in
  `catalog-migrations-domain-inventory.md`;
- if uppercase backfill is included, all lowercase-sensitive facet consumers are
  updated in code in the same implementation branch.

Запрещенные операции в этой migration:

- `DROP TABLE`;
- `DROP VIEW`;
- `DROP MATERIALIZED VIEW`;
- `DROP INDEX`;
- `DROP COLUMN`;
- `ALTER TABLE ... RENAME`;
- `ALTER INDEX ... RENAME`;
- `ALTER VIEW ... RENAME`;
- любые rename-команды.

Если существующий объект нужно заменить, нельзя делать `DROP`/`RENAME`.
Разрешены только изменение существующих полей через `ALTER TABLE ... ALTER
COLUMN ...`, создание новых таблиц/view/indexes и data backfill через `UPDATE`.
Для этой задачи expected path - новый view и новые индексы, без изменения
существующих column definitions.

Если migration нужно сделать идемпотентнее для локального dev окружения,
использовать `CREATE INDEX IF NOT EXISTS`. Для `CREATE VIEW` имя новое, поэтому
`DROP VIEW` не нужен и не разрешен.

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
потому что backend не знает external translation catalog.

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

Фильтрация уже использованных sources должна оставаться в view SQL, а не в
отдельном `usedSourceIds` select. Это сохраняет чистую интеграцию
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

### Query parameters

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
candidate id для cursor и API selection.

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
  `repository.facet.create()`.

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

Create API должен принимать один source:

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
Нельзя полагаться на API consumer как на защиту от устаревшего выбора source:
backend повторно проверяет candidate перед insert. Если source стал занят между
чтением candidates и submit, validation должна вернуть userError на
`sources`/`source`; если гонка случилась после validation, unique constraint
`facet_source_project_type_handle_uniq` остается последней защитой и должен
быть преобразован в userError, а не в необработанную internal error.

Repository уже выполняет insert sources и сохраняет translation name, но не
должен становиться владельцем API-specific validation. Проверки выбранного
candidate должны жить в create script / resolver boundary до вызова
`repository.facet.create()`. Нормализация casing здесь не должна переводить
`facetType` в lowercase: resolver передает GraphQL enum как `UPPERCASE`, script
валидирует `UPPERCASE`, repository сохраняет `UPPERCASE`.

Unique constraint в `facet_source` остается последней защитой от race condition,
но не заменяет transactional validation в `FacetCreateScript`.

## Порядок реализации

1. Добавить `facetSourceCandidateView` в catalog models и экспорт из
   `repositories/models/index.ts`.
2. Добавить handwritten catalog migration
   `services/catalog/migrations/domains/0500_facets/0504_facets__source_candidate_view.sql`
   для `catalog.facet_source_candidate_view` и индексов
   `product_option`, `product_option_translation`,
   `product_feature`, `product_feature_translation`. Не использовать generated
   migration / Drizzle migrator. Не использовать `DROP` и `RENAME`; migration
   должна быть additive/replace-in-place по правилам раздела
   `Catalog migrations`.
3. Обновить model-derived inventory:
   `services/catalog/docs/catalog-migrations-domain-inventory.md`, добавив новый
   view и новые индексы из migration.
4. Добавить repository method в `FacetRepository`, который читает из view через
   `facetSourceCandidateRelayQuery` и применяет `projectId`, `locale`, sort,
   pagination и `count`.
5. Реализовать cursor encode/decode и `limit + 1` pagination в repository.
6. Расширить GraphQL schema для `FacetSourceCandidateConnection`.
7. Добавить resolver и подключить query в `QueryResolver`.
8. Расширить `FacetCreateInput.sources`, generated zod/types, resolver mapping,
   `FacetCreateParams` и validation create script; repository create уже
   принимает `sources`.
   В этом же шаге зафиксировать `UPPERCASE` boundary: убрать
   `.toLowerCase()` для `facetType` в `MutationResolver.facetCreate()`,
   перевести `FacetCreateScript` allow-list / `UI_BY_TYPE` на `UPPERCASE` и
   сохранять `facet.facet_type` / `facet_source.facet_type` в `UPPERCASE`.
9. Если persisted `facet_type` переводится в `UPPERCASE`, сделать это тем же
   handwritten SQL migration через `UPDATE`, без изменения имен колонок,
   constraints или indexes. Также обновить все lowercase-sensitive consumers
   `facet_type` в scripts/repositories/builders до единого casing boundary.
10. Сделать create flow транзакционным на уровне `FacetCreateScript`: validation
   selected candidate, create facet и insert `sources` через
   `repository.facet.create()` должны происходить в одной transaction boundary;
   duplicate source race от unique constraint маппить в userError.
11. Запустить backend codegen через shopana-cli.
12. Запустить build для затронутых частей, если нужна проверка новой версии.

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
7. Backend ordering стабилен и не ломает cursor pagination.
8. Submit create facet с source, который стал занятым после чтения candidates,
   возвращает `userErrors` без создания duplicate facet.

## Открытые решения

1. Нужно ли на втором этапе добавлять backend search для очень больших списков
   option/feature. Первый этап сознательно не добавляет search parameter,
   потому что fixed/system rows имеют `name = null`.
2. Какой latency threshold считать поводом для materialized/indexed projection.
   Предложение: возвращаться к этому только если `EXPLAIN ANALYZE` на реальных
   данных показывает стабильные запросы медленнее 100-200 ms.
