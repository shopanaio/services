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

1. Добавить Admin API для списка доступных facet sources с фильтрами,
   сортировкой, поиском и pagination через `@shopana/drizzle-query`.
2. Подготовить специальный Postgres/Drizzle view, который нормализует standard,
   tag, option и feature sources в один read model.
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

## DB design

### Новый view

Добавить модель:

```text
services/catalog/src/repositories/models/facetSourceCandidateView.ts
```

Drizzle export:

```ts
export const facetSourceCandidateView =
  catalogSchema.view("facet_source_candidate_view").as(...)
```

Колонки view:

| Column | Type | Meaning |
| --- | --- | --- |
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
{ locale: { _eq: this.locale } }
```

Пример SQL shape:

```sql
CREATE VIEW catalog.facet_source_candidate_view AS
SELECT
  p.project_id AS project_id,
  l.locale AS locale,
  'PRICE'::text AS facet_type,
  'price'::text AS handle,
  NULL::text AS name
FROM (SELECT DISTINCT project_id FROM catalog.product) p
CROSS JOIN (
  SELECT DISTINCT project_id, locale FROM catalog.product_translation
) l
WHERE l.project_id = p.project_id

UNION ALL
SELECT
  p.project_id AS project_id,
  l.locale AS locale,
  'IN_STOCK'::text AS facet_type,
  'availability'::text AS handle,
  NULL::text AS name
FROM (SELECT DISTINCT project_id FROM catalog.product) p
CROSS JOIN (
  SELECT DISTINCT project_id, locale FROM catalog.product_translation
) l
WHERE l.project_id = p.project_id

UNION ALL
SELECT
  t.project_id AS project_id,
  l.locale AS locale,
  'TAG'::text AS facet_type,
  'tags'::text AS handle,
  NULL::text AS name
FROM (SELECT DISTINCT project_id FROM catalog.tag) t
CROSS JOIN (
  SELECT DISTINCT project_id, locale FROM catalog.product_translation
) l
WHERE l.project_id = t.project_id

UNION ALL
SELECT
  po.project_id AS project_id,
  pot.locale AS locale,
  'OPTION'::text AS facet_type,
  po.slug AS handle,
  MIN(pot.name) AS name
FROM catalog.product_option po
INNER JOIN catalog.product_option_translation pot
  ON pot.project_id = po.project_id
 AND pot.option_id = po.id
GROUP BY po.project_id, pot.locale, po.slug

UNION ALL
SELECT
  pf.project_id AS project_id,
  pft.locale AS locale,
  'FEATURE'::text AS facet_type,
  pf.slug AS handle,
  MIN(pft.name) AS name
FROM catalog.product_feature pf
INNER JOIN catalog.product_feature_translation pft
  ON pft.project_id = pf.project_id
 AND pft.feature_id = pf.id
WHERE pf.is_group = false
GROUP BY pf.project_id, pft.locale, pf.slug;
```

Решение по `TAG`: source `Tags` отображается один раз, если в проекте есть хотя
бы один tag. Если нужно разрешить facet по тегам даже до создания первого tag,
лучше добавить `project/store` table как источник project ids вместо
`catalog.tag`.

### Индексы

Обычный Postgres view индексировать нельзя. Для текущего объема admin source
modal достаточно фильтра по `project_id` и `locale`. Если список option и
feature станет большим, второй этап:

1. заменить view на materialized view;
2. добавить indexes:
   - `(project_id, facet_type, handle)`;
   - `(project_id, locale, name)`;
   - trigram по `name` при необходимости.

## Drizzle Query API

### Query object

Добавить в `FacetRepository.ts`:

```ts
const facetSourceCandidateRelayQuery = createRelayQuery(
  createQuery(facetSourceCandidateView)
    .include(["facetType", "handle"])
    .maxLimit(100)
    .defaultLimit(30),
  { name: "facetSourceCandidate", tieBreaker: "handle" }
);
```

Если cursor по одному `handle` недостаточно стабилен для разных `facetType`,
добавить synthetic column в view:

```text
id = facet_type || ':' || handle
```

и использовать `tieBreaker: "id"`.

### Repository method

Добавить метод:

```ts
async getAvailableFacetSourceCandidates(
  args: FacetSourceCandidateRelayInput
): Promise<FacetSourceCandidateConnectionResult>
```

Repository merge where:

```ts
where: {
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    { _not: { id: { _in: usedSourceIds } } },
    ...(args.where ? [args.where] : []),
  ],
}
```

`usedSourceIds` получить отдельным select из `facetSource`:

```sql
SELECT facet_type || ':' || handle
FROM catalog.facet_source
WHERE project_id = :storeId
```

Причина делать exclusion в repository, а не внутри candidate view: view остается
переиспользуемым read model всех кандидатов, а "available" является
use-case фильтром create modal.

### Search

Поиск в модалке работает по отображаемому названию source. Для dynamic
`OPTION`/`FEATURE` это backend поле `name`, полученное из translation tables.
Для fixed/system sources это frontend i18n label по `facetType + handle`.

```ts
where: search
  ? { name: { _containsi: search } }
  : undefined
```

UI должен дополнительно фильтровать fixed/system rows по локализованному
label, потому что backend не знает frontend translation catalog.

Дополнительно разрешить фильтры:

- `facetType`;
- `name`;
- `handle`;

Сортировка по умолчанию:

```ts
orderBy: [
  { field: "name", direction: "asc" },
  { field: "handle", direction: "asc" },
]
```

## GraphQL schema

Добавить в `services/catalog/src/api/graphql-admin/schema/facet.graphql`:

```graphql
type FacetSourceCandidate implements Node {
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
  nodes: [FacetSourceCandidate!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

input FacetSourceCandidateWhereInput {
  id: IDFilterInput
  locale: StringFilterInput
  facetType: FacetTypeFilterInput
  handle: StringFilterInput
  name: StringFilterInput
  _and: [FacetSourceCandidateWhereInput!]
  _or: [FacetSourceCandidateWhereInput!]
  _not: FacetSourceCandidateWhereInput
}

input FacetSourceCandidateOrderByInput {
  field: FacetSourceCandidateOrderField!
  direction: SortDirection!
}

enum FacetSourceCandidateOrderField {
  NAME
  FACET_TYPE
  HANDLE
}
```

В `CatalogQuery` добавить:

```graphql
facetSourceCandidates(
  first: Int
  after: String
  last: Int
  before: String
  where: FacetSourceCandidateWhereInput
  orderBy: [FacetSourceCandidateOrderByInput!]
): FacetSourceCandidateConnection!
```

Имена filter/order input лучше выровнять с текущими generated patterns в catalog
schema, если там уже есть shared filter inputs.

## Resolvers

Добавить:

```text
services/catalog/src/resolvers/admin/FacetSourceCandidateResolver.ts
services/catalog/src/resolvers/admin/FacetSourceCandidateConnectionResolver.ts
```

Resolver поля:

- `id()` кодирует synthetic key `facetType:handle`;
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
- selected source существует в `facet_source_candidate_view`;
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
  $where: FacetSourceCandidateWhereInput
  $orderBy: [FacetSourceCandidateOrderByInput!]
) {
  catalogQuery {
    facetSourceCandidates(
      first: $first
      after: $after
      where: $where
      orderBy: $orderBy
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
- optional sort.

Возвращает generated API shapes напрямую, по правилу
`knowledge/vault/patterns/admin-graphql-layer.md`.

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
- Поиск ищет только по `name`.

## Порядок реализации

1. Добавить `facetSourceCandidateView` в catalog models и экспорт из
   `repositories/models/index.ts`.
2. Сгенерировать Drizzle migration через npm/CLI, не писать migration вручную.
3. Добавить relay query и repository method в `FacetRepository`.
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
7. Search `colo` возвращает `Color`, но не возвращает использованный `Color`.
8. Sort by `name asc` стабилен и не ломает cursor pagination.
9. Submit create facet с source, который стал занятым после открытия modal,
   возвращает `userErrors` без создания duplicate facet.

## Открытые решения

1. Откуда брать project ids для standard sources, если в проекте еще нет ни
   одного product/tag/option/feature. Лучший вариант - использовать таблицу store
   или project, если она доступна в catalog DB; иначе standard sources появятся
   после первого product.
2. Нужно ли показывать `Tags`, когда tags еще нет. Для UX create facet обычно
   лучше показывать всегда, но для этого нужен надежный источник project ids.
