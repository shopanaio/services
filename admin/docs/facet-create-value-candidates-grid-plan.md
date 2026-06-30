# План AG Grid с facet value candidates в CreateFacetModal

## Цель

Добавить в `CreateFacetModal` секцию `Values`, похожую на Shopify screenshot:

- список `facetValueCandidates` грузится в AG Grid после выбора facet source;
- список поддерживает поиск и сортировку по имени;
- строки выбираются чекбоксами;
- выбранные candidates создаются как `FacetValue` вместе с facet в той же `facetCreate` мутации;
- фронт не вызывает отдельные `facetValueCreate` после создания facet.

## Текущий контекст

Backend уже имеет read API:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`;
- `CatalogQuery.facetValueCandidates(...)`;
- `FacetValueCandidate { id, facetType, sourceHandle, handle, label }`;
- `FacetValueCandidatesMetaInput { candidateType, sourceHandles, facetId }`;
- поддержанные candidate types: `TAG`, `OPTION`, `FEATURE`;
- `PRICE` и `IN_STOCK` не имеют raw value candidates.

Create flow сейчас неполный для этой задачи:

- `CreateFacetModal` хранит только `label`, `slug`, `facetType`, `uiType`;
- `FacetSourceSelector` пока выбирает только тип через dropdown;
- backend `FacetCreateScript` требует ровно один source в `sources`;
- `FacetCreateInput` пока не принимает выбранные value candidates;
- `FacetValueCreateInput` создаёт values отдельно, но это не подходит, потому нужно создание в одной мутации.

Важно: этот план предполагает, что план `admin/docs/facet-source-picker-modal-plan.md` уже реализован или реализуется первым. Без выбранного `source.handle` нельзя корректно запросить `facetValueCandidates`.

## UX flow

1. Пользователь открывает `Create facet`.
2. В поле `Label` выбирает source через source-control.
3. После выбора source форма получает:
   - `facetType`;
   - `source.handle`;
   - `source.name`.
4. Если `facetType` равен `TAG`, `OPTION` или `FEATURE`, ниже показывается секция `Values`.
5. Секция грузит candidates через `facetValueCandidates(meta: { candidateType, sourceHandles: [source.handle] })`.
6. Пользователь ищет values через search input.
7. Пользователь сортирует колонку `Value` по имени.
8. Пользователь отмечает чекбоксами candidates, которые нужно создать вместе с facet.
9. Submit вызывает одну мутацию `facetCreate`.
10. Backend в одной транзакции создаёт:
    - facet;
    - facet source;
    - source facet values по выбранным candidates.

Для `PRICE` и `IN_STOCK` секция `Values` скрыта: у них нет candidate list из catalog data.

## Текстовый wireframe

### Create facet modal

```text
┌────────────────────────────────────────────────────────────────────┐
│ Create facet                                                   [x] │
├────────────────────────────────────────────────────────────────────┤
│ General                                                            │
│                                                                    │
│ Label                                                              │
│ ┌──────────────┬─────────────────────────────────────────────────┐ │
│ │ Color     ▾  │ Color                                           │ │
│ └──────────────┴─────────────────────────────────────────────────┘ │
│                                                                    │
│ UI type                                                            │
│ [Checkbox] [Radio] [Dropdown]                                      │
│                                                                    │
│ Values                                      12 selected            │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search filter values                                       │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ ├─────┬──────────────────────────────────────────────┬───────────┤ │
│ │ [ ] │ Value                                        │ Source    │ │
│ ├─────┼──────────────────────────────────────────────┼───────────┤ │
│ │ [x] │ Blue                                         │ color     │ │
│ │ [x] │ Green                                        │ color     │ │
│ │ [ ] │ Red                                          │ color     │ │
│ │ [ ] │ Yellow                                       │ color     │ │
│ └─────┴──────────────────────────────────────────────┴───────────┘ │
│ 1-20 of 86                                      [Prev] [Next]      │
├────────────────────────────────────────────────────────────────────┤
│                                                   [Cancel] [Create]│
└────────────────────────────────────────────────────────────────────┘
```

### Empty state до выбора source

```text
┌────────────────────────────────────────────────────────────────┐
│ Values                                                         │
│ Select a source to load available values.                      │
└────────────────────────────────────────────────────────────────┘
```

### Empty search

```text
┌────────────────────────────────────────────────────────────────┐
│ 🔍 Search filter values: "cotton blue"                         │
├────────────────────────────────────────────────────────────────┤
│ No values found                                                │
└────────────────────────────────────────────────────────────────┘
```

## UI model

Расширить форму:

```ts
interface FacetSourceFormValue {
  handle: string;
  name: string;
}

interface FacetValueCandidateFormValue {
  id: string;
  handle: string;
  label: string;
  sourceHandle: string;
}
```

Zod schema:

```ts
source: z.object({
  handle: z.string().trim().min(1),
  name: z.string().trim().min(1),
}).nullable(),
selectedValueCandidates: z.array(z.object({
  id: z.string().trim().min(1),
  handle: z.string().trim().min(1),
  label: z.string().trim().min(1),
  sourceHandle: z.string().trim().min(1),
})).default([]),
```

Поведение:

- при смене source очищать `selectedValueCandidates`;
- при смене source перезапрашивать candidates;
- сохранять выбранные candidates между страницами AG Grid в `Map<string, FacetValueCandidateFormValue>`;
- header checkbox выбирает только текущую загруженную страницу;
- submit отправляет только накопленную selection, а не только видимые rows.

## AG Grid секция

Добавить компонент:

```text
admin/src/domains/inventory/facets/modals/create-facet-modal/facet-value-candidates-grid.tsx
```

Props:

```ts
interface FacetValueCandidatesGridProps {
  facetType: FacetType;
  sourceHandle: string | null;
  value: FacetValueCandidateFormValue[];
  onChange: (value: FacetValueCandidateFormValue[]) => void;
}
```

Колонки:

- selection column: AG Grid checkbox selection;
- `Value`: `label`, sortable;
- `Source`: `sourceHandle`, вторичная колонка для диагностики, можно скрыть если выбран только один source;
- опционально `Handle`: `handle`, скрытая/debug колонка.

AG Grid config:

```ts
rowSelection={{
  mode: "multiRow",
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: true,
  enableSelectionWithoutKeys: true,
}}
getRowId={(params) => params.data.id}
defaultColDef={{
  sortable: true,
  resizable: false,
}}
```

Сортировка:

- сортировка работает стандартно через клик по AG Grid header cell, как на страницах;
- сортируемая колонка: `Value`;
- mapping `label -> label`;
- default sort: `label asc`, затем `id asc`;
- при смене sort сбрасывать cursor pagination на первую страницу.

Поиск:

- search input в секции `Values`, placeholder `Search filter values`;
- debounce 250-300 ms;
- search condition:

```ts
{
  _or: [
    { label: { _containsi: search } },
    { handle: { _containsi: search } },
  ],
}
```

Pagination:

- использовать cursor pagination как в `EntityPickerContent`;
- page size по умолчанию `20`;
- selection хранить отдельно от текущей страницы.

## GraphQL query для candidates

Добавить в `admin/src/domains/inventory/facets/graphql/queries.ts`:

```graphql
query FacetValueCandidates(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: FacetValueCandidateWhereInput
  $orderBy: [FacetValueCandidateOrderByInput!]
  $meta: FacetValueCandidatesMetaInput!
) {
  catalogQuery {
    facetValueCandidates(
      first: $first
      after: $after
      last: $last
      before: $before
      where: $where
      orderBy: $orderBy
      meta: $meta
    ) {
      edges {
        cursor
        node {
          id
          facetType
          sourceHandle
          handle
          label
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
}
```

Variables для create modal:

```ts
{
  first: 20,
  where: buildFacetValueCandidateSearchCondition(search),
  orderBy: [{ field: "label", direction: "asc" }],
  meta: {
    candidateType: facetType,
    sourceHandles: [source.handle],
  },
}
```

`candidateType` передавать только для `TAG`, `OPTION`, `FEATURE`. Для остальных типов query не выполнять.

## Hook слой

Добавить:

```text
admin/src/domains/inventory/facets/hooks/use-facet-value-candidates.ts
```

Hook должен возвращать:

```ts
{
  candidates: FacetValueCandidateGridRow[];
  loading: boolean;
  error?: ApolloError;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  totalCount: number;
  refetch: () => Promise<void>;
}
```

Если в admin уже есть общий cursor/page helper для GraphQL connection, использовать его. Если нет, сделать локальный hook без выноса новой shared abstraction.

## API contract для одной мутации

Расширить GraphQL schema:

```graphql
input FacetCreateValueCandidateInput {
  handle: String!
  label: String!
  sourceHandle: String!
}

input FacetCreateInput {
  facetType: FacetType!
  slug: String!
  uiType: FacetUIType
  selectionMode: FacetSelectionMode
  label: String!
  sources: [FacetCreateSourceInput!]
  valueCandidates: [FacetCreateValueCandidateInput!]
}
```

Почему не `sourceValueIds`:

- candidates не являются `FacetValue` до создания facet;
- в create flow у них есть stable candidate `handle`, но нет `FacetValue.id`;
- backend должен валидировать candidate handles через `facetValueCandidates` repository logic перед insert.

Mutation example:

```graphql
mutation FacetCreate($input: FacetCreateInput!) {
  catalogMutation {
    facetCreate(input: $input) {
      facet {
        id
        label
        facetType
        values {
          id
          kind
          handle
          label
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "facetType": "OPTION",
    "slug": "color",
    "label": "Color",
    "uiType": "CHECKBOX",
    "selectionMode": "MULTI",
    "sources": [
      { "handle": "color", "name": "Color" }
    ],
    "valueCandidates": [
      { "sourceHandle": "color", "handle": "color:blue", "label": "Blue" },
      { "sourceHandle": "color", "handle": "color:green", "label": "Green" }
    ]
  }
}
```

## Backend реализация

Расширить DTO:

```text
services/catalog/src/scripts/facet/dto/index.ts
```

Добавить:

```ts
export interface FacetCreateValueCandidateInput {
  handle: string;
  label: string;
  sourceHandle: string;
}
```

`FacetCreateParams`:

```ts
valueCandidates?: FacetCreateValueCandidateInput[];
```

В `MutationResolver.facetCreate` передавать `args.input.valueCandidates`.

В `FacetCreateScript`:

1. Проверить source как сейчас.
2. Если `valueCandidates` пустой или отсутствует, создать только facet.
3. Если `facetType` не `TAG | OPTION | FEATURE`, вернуть user error:
   - field: `["valueCandidates"]`;
   - code: `INVALID`;
   - message: `Facet value candidates are not supported for this facet type`.
4. Нормализовать candidates:
   - trim `handle`;
   - trim `label`;
   - trim `sourceHandle`;
   - удалить дубли по `handle`;
   - сохранить порядок selection.
5. Проверить, что каждый `sourceHandle` входит в выбранные `sources`.
6. Валидировать, что каждый candidate всё ещё доступен:
   - вызвать repository helper, который получает candidates по `candidateType`, `sourceHandles` и списку `handle`;
   - сравнить requested handles с найденными;
   - если есть отсутствующие, вернуть user error `SOURCE_VALUE_NOT_AVAILABLE`.
7. Создать facet.
8. Создать source facet values в той же транзакции:
   - `kind = "source"`;
   - `handle = candidate.handle`;
   - `label = candidate.label`;
   - `sortIndex` по порядку selection;
   - `enabled = true`.

Repository helper:

```text
services/catalog/src/repositories/facet/FacetRepository.ts
```

Добавить метод:

```ts
findFacetValueCandidatesByHandles(args: {
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  handles: string[];
}): Promise<FacetValueCandidateView[]>
```

Он должен переиспользовать те же concrete views, что и `getFacetValueCandidates`, и фильтровать:

- `projectId`;
- `locale`;
- `facetType`;
- `sourceHandle in sourceHandles`;
- `handle in handles`.

Создание values лучше делать repository методом, а не прямыми insert в script:

```ts
createSourceFacetValues(args: {
  facetId: string;
  values: Array<{
    handle: string;
    label: string;
    sortIndex: number;
    enabled: boolean;
  }>;
}): Promise<FacetValue[]>
```

## Frontend mapper

Расширить `FacetFormInput`:

```ts
source: {
  handle: string;
  name: string;
} | null;
selectedValueCandidates: Array<{
  handle: string;
  label: string;
  sourceHandle: string;
}>;
```

`mapFacetFormToCreateInput()`:

```ts
return {
  label: values.label.trim(),
  slug: normalizeFacetSlug(values.slug),
  facetType: values.facetType,
  uiType: values.uiType,
  selectionMode: getDefaultFacetSelectionMode(values.uiType),
  sources: values.source
    ? [{ handle: values.source.handle, name: values.source.name }]
    : [],
  valueCandidates: values.selectedValueCandidates.map((candidate) => ({
    handle: candidate.handle,
    label: candidate.label,
    sourceHandle: candidate.sourceHandle,
  })),
};
```

## Ошибки

Create modal:

- `sources` errors показывать на source-control;
- `valueCandidates` errors показывать над grid;
- если candidate стал недоступен между загрузкой и submit, оставить modal открытой и показать backend error;
- если source изменился, selection очищается без подтверждения, потому values относятся к старому source.

AG Grid:

- loading: стандартный AG Grid loading overlay;
- empty before source: отдельный текстовый state;
- empty search: `No values found`;
- API error: `Alert` внутри секции `Values`, кнопка retry.

## Файлы для реализации

Backend:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`;
- `services/catalog/src/resolvers/admin/MutationResolver.ts`;
- `services/catalog/src/scripts/facet/dto/index.ts`;
- `services/catalog/src/scripts/facet/FacetCreateScript.ts`;
- `services/catalog/src/repositories/facet/FacetRepository.ts`;
- generated GraphQL resolver types после codegen.

Admin:

- `admin/src/domains/inventory/facets/graphql/queries.ts`;
- `admin/src/domains/inventory/facets/graphql/mutations.ts`;
- `admin/src/domains/inventory/facets/graphql/operation-types.ts`;
- `admin/src/domains/inventory/facets/hooks/use-facet-value-candidates.ts`;
- `admin/src/domains/inventory/facets/modals/create-facet-modal/schema.ts`;
- `admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx`;
- `admin/src/domains/inventory/facets/modals/create-facet-modal/facet-value-candidates-grid.tsx`;
- `admin/src/domains/inventory/facets/mappers/facet-input.mapper.ts`;
- generated admin GraphQL types after schema/codegen.

## Implementation order

1. Реализовать/доделать source picker, чтобы create form имела `source`.
2. Расширить backend `FacetCreateInput` и `FacetCreateScript`.
3. Добавить repository helper для валидации selected candidates.
4. Обновить generated schema/types.
5. Добавить admin query/hook для `facetValueCandidates`.
6. Добавить `FacetValueCandidatesGrid` в create modal.
7. Расширить form schema и mapper.
8. Проверить create flow вручную.

## Проверка

По правилам проекта не запускать `test` и `tsc`.

Минимальная проверка:

1. Запустить project codegen/schema generation через `shopana-cli`/npm flow, если менялась GraphQL schema.
2. Запустить `build`, когда нужна новая версия кода.
3. Вручную проверить:
   - `Create facet`;
   - выбрать `OPTION` source `color`;
   - увидеть список values;
   - поиск по `blue`;
   - сортировку `Value`;
   - выбор нескольких чекбоксов;
   - submit одной `facetCreate`;
   - созданный facet содержит выбранные source values.

## Открытые решения

1. Нужно ли автоматически preselect all candidates по умолчанию или selection должна стартовать пустой.
2. Нужна ли отдельная колонка `Grouped values` как на screenshot, если display grouping/merge будет реализован позже.
3. Нужно ли разрешить batch select across all filtered results, или header checkbox должен выбирать только текущую страницу.
4. Должны ли созданные source values сразу иметь paired display values, или display grouping остаётся отдельным follow-up flow.
