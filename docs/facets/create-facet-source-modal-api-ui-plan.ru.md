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
2. Сформировать candidates быстрым параметризованным SQL/Drizzle query в
   repository, без all-project/all-locale Postgres view.
3. Исключать уже использованные sources на уровне repository query.
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

## DB/API read model

### Легкий candidate query вместо view

Не добавлять persisted Postgres view для этой модалки. Query должен быть
use-case specific и получать `projectId`/`locale` из repository context:

- standard sources строятся из констант и не читают catalog tables;
- dynamic `OPTION`/`FEATURE` читаются только для текущего `project_id`;
- translations фильтруются по текущей `locale` до дедупликации;
- уже использованные sources исключаются через `NOT EXISTS`;
- результат сразу содержит стабильный synthetic `id = facet_type || ':' || handle`.

Почему не создаем `VIEW`:

- обычный Postgres view не принимает runtime параметры `projectId` и `locale`;
- view придется строить как all-project/all-locale read model, а это возвращает
  тяжелые `UNION/GROUP BY` по всем tenants;
- standard sources в view требуют отдельный источник всех project ids, хотя для
  create modal достаточно `this.storeId`;
- exclusion already-used sources является use-case логикой create modal, поэтому
  его проще и быстрее держать в одном repository SQL;
- если позже понадобится shared read model, его можно добавить отдельным этапом
  после `EXPLAIN ANALYZE`, но это не baseline для быстрого modal API.

Read model кандидата:

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | text | stable candidate id: `facet_type || ':' || handle` |
| `projectId` | uuid | tenant/store scope |
| `locale` | varchar/text | locale of translated `name` |
| `facetType` | text/varchar | `PRICE`, `IN_STOCK`, `TAG`, `OPTION`, `FEATURE` |
| `handle` | text | canonical source handle |
| `name` | text/null | localized DB label for dynamic option/feature sources |

Backend не должен отдавать UI-тексты для fixed/system sources. Для `PRICE`,
`IN_STOCK` и `TAG` поле `name` должно быть `null`; Admin UI локализует `Name`
и `Type` по стабильной паре `facetType + handle`.

`name` для `OPTION` и `FEATURE` нельзя строить из `slug`. Название должно
приходить из locale-aware translation tables:

- `catalog.product_option_translation.name`;
- `catalog.product_feature_translation.name`.

Repository обязан фильтровать кандидатов по текущей локали:

```ts
const projectId = this.storeId;
const locale = this.locale;
```

Предпочтительный SQL shape:

```sql
WITH candidates AS (
  SELECT
    :projectId::uuid AS project_id,
    :locale::text AS locale,
    'PRICE'::text AS facet_type,
    'price'::text AS handle,
    NULL::text AS name

  UNION ALL
  SELECT :projectId::uuid, :locale::text, 'IN_STOCK', 'availability', NULL

  UNION ALL
  SELECT :projectId::uuid, :locale::text, 'TAG', 'tags', NULL

  UNION ALL
  SELECT
    po.project_id,
    :locale::text AS locale,
    'OPTION'::text AS facet_type,
    po.slug AS handle,
    MIN(pot.name) AS name
  FROM catalog.product_option po
  INNER JOIN catalog.product_option_translation pot
    ON pot.project_id = po.project_id
   AND pot.option_id = po.id
   AND pot.locale = :locale
  WHERE po.project_id = :projectId
  GROUP BY po.project_id, po.slug

  UNION ALL
  SELECT
    pf.project_id,
    :locale::text AS locale,
    'FEATURE'::text AS facet_type,
    pf.slug AS handle,
    MIN(pft.name) AS name
  FROM catalog.product_feature pf
  INNER JOIN catalog.product_feature_translation pft
    ON pft.project_id = pf.project_id
   AND pft.feature_id = pf.id
   AND pft.locale = :locale
  WHERE pf.project_id = :projectId
    AND pf.is_group = false
  GROUP BY pf.project_id, pf.slug
)
SELECT
  c.facet_type || ':' || c.handle AS id,
  c.project_id,
  c.locale,
  c.facet_type,
  c.handle,
  c.name
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM catalog.facet_source fs
  WHERE fs.project_id = c.project_id
    AND fs.facet_type = c.facet_type
    AND fs.handle = c.handle
)
ORDER BY
  CASE c.facet_type
    WHEN 'PRICE' THEN 0
    WHEN 'IN_STOCK' THEN 1
    WHEN 'TAG' THEN 2
    WHEN 'OPTION' THEN 3
    WHEN 'FEATURE' THEN 4
    ELSE 5
  END,
  COALESCE(c.name, c.handle) ASC,
  c.id ASC
LIMIT :limitPlusOne;
```

`GROUP BY project_id, slug` нужен только для дедупликации product-level
option/feature rows в один source. `MIN(name)` выбирает стабильное canonical
name, если один и тот же slug встретился с разными переводами в рамках одной
локали. Это не сортировка списка.

Сортировка списка должна быть только в финальном `ORDER BY`. Для направления
`ASC`/`DESC` repository должен использовать whitelist из двух SQL variants или
query-builder branch, а не подставлять raw direction из GraphQL input:

```sql
-- ASC
ORDER BY source_sort_bucket ASC, COALESCE(c.name, c.handle) ASC, c.id ASC

-- DESC
ORDER BY source_sort_bucket ASC, COALESCE(c.name, c.handle) DESC, c.id ASC
```

`source_sort_bucket` здесь означает тот же `CASE c.facet_type ... END`, который
держит standard sources перед dynamic sources.

`TAG` отображается всегда, даже если в проекте еще нет тегов. Это дешевле и
лучше для UX create modal, чем читать `catalog.tag` только ради проверки
существования хотя бы одного tag.

### Индексы

Для быстрого candidate query добавить индексы к таблицам, которые участвуют в
dynamic branches:

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

### Query strategy

Для этого use case не использовать `createRelayQuery` поверх Drizzle view.
Причина: available facet sources - маленький admin список, который дешевле и
прозрачнее получить одним параметризованным repository query с `LIMIT + 1`.

Repository сам отвечает за:

- построение candidates;
- exclusion уже использованных sources;
- фильтр по `facetType`, если передан;
- стабильную сортировку по `name` `ASC`/`DESC`;
- cursor encode/decode по sort fields;
- `pageInfo.hasNextPage` через `limit + 1`.

Cursor должен быть opaque string, но payload может быть простым:

```ts
type FacetSourceCandidateCursor = {
  sourceSortBucket: number;
  sortName: string;
  id: string;
};
```

Порядок должен быть стабильным:

```text
source sort bucket, display sort key ASC/DESC, id
```

Где `display sort key = COALESCE(name, handle)`. Fixed/system labels
локализуются на frontend, поэтому backend sort для fixed rows остается
стабильным, но не обязан совпадать с локализованным UI label.

### Repository method

Добавить метод:

```ts
async getAvailableFacetSourceCandidates(
  args: FacetSourceCandidateRelayInput
): Promise<FacetSourceCandidateConnectionResult>
```

Input:

```ts
interface FacetSourceCandidateRelayInput {
  first?: number | null;
  after?: string | null;
  facetType?: string | null;
  sortDirection?: "ASC" | "DESC" | null;
}
```

Default/max limits:

```ts
const defaultLimit = 30;
const maxLimit = 100;
```

### Exclude used sources

Доступный source определяется как candidate из repository CTE, для которого еще
нет строки в `catalog.facet_source` с тем же:

```text
project_id + facet_type + handle
```

Фильтрация уже использованных sources должна быть обязательной частью SQL в
`getAvailableFacetSourceCandidates`, а не ответственностью UI.

Предпочтительный SQL shape:

```sql
SELECT c.*
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM catalog.facet_source fs
  WHERE fs.project_id = c.project_id
    AND fs.facet_type = c.facet_type
    AND fs.handle = c.handle
)
```

Не использовать предварительный `usedSourceIds` select. `NOT EXISTS` в одном SQL
лучше: он не делает лишний round trip и использует индекс
`idx_facet_source_project_type_handle`.

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

Причина делать exclusion прямо в repository query: "available" является
use-case фильтром create modal, а не общей read model.

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
source sort bucket, COALESCE(name, handle) ASC/DESC, id
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
  sortDirection: SortDirection = ASC
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
- selected source существует в repository candidate query для текущих
  `projectId` и `locale`;
- selected source еще не используется в `facet_source`;
- `facetType` input совпадает с candidate `facetType`;
- `sources[0].handle` совпадает с candidate `handle`.

Unique constraint в `facet_source` остается последней защитой от race condition.

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

1. Добавить индексы для `product_option`, `product_option_translation`,
   `product_feature`, `product_feature_translation` через generated migration
   npm/CLI; не писать migration вручную.
2. Добавить lightweight candidate query и repository method в `FacetRepository`.
3. Реализовать cursor encode/decode и `limit + 1` pagination в repository.
4. Расширить GraphQL schema для `FacetSourceCandidateConnection`.
5. Добавить resolver и подключить query в `QueryResolver`.
6. Расширить `FacetCreateInput.sources` и validation create script/resolver.
7. Запустить backend codegen через shopana-cli.
8. Добавить admin GraphQL query, hook и generated types через admin codegen.
9. Реализовать `SelectFacetSourceModal` и зарегистрировать modal type.
10. Переделать `CreateFacetModal` на выбор source через modal.
11. Запустить build для затронутых частей, если нужна проверка новой версии.

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
