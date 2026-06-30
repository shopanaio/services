# План модалки выбора facet source

## Цель

Сделать выбор source в `CreateFacetModal` не через dropdown с типом facet, а через отдельную модалку-пикер в стиле screenshot:

- пользователь нажимает на source-control в поле label;
- открывается modal entity picker `Select source`;
- список грузится из `facetSourceCandidates`;
- список фильтруется по нужному `FacetType`;
- пользователь выбирает один source;
- create form сохраняет `facetType` и конкретный `source`;
- `facetCreate` получает `sources: [{ handle, name }]`.

Паттерн реализации: `usePageQuery + modal entity picker`. В текущем admin уже есть общий `EntityPickerContent` с `pageConfig`/cursor pagination. Для этого flow нужно добавить source-specific data hook, который использует тот же контракт picker-а и внутри вызывает `usePageQuery` для GraphQL connection.

## Текущий контекст

Backend уже имеет API для source candidates:

- schema: `services/catalog/src/api/graphql-admin/schema/facet.graphql`;
- query: `catalogQuery.facetSourceCandidates`;
- type: `FacetSourceCandidate { id, locale, facetType, handle, name }`;
- resolver/repository фильтруют по текущему store/project и locale;
- default backend sorting уже отдаёт fixed sources, tags, options, features в стабильном порядке.

Admin create modal сейчас:

- файл: `admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx`;
- `FacetSourceSelector` выбирает только `FacetType`;
- `mapFacetFormToCreateInput()` не передаёт `sources`;
- schema формы не хранит выбранный source handle/name.

## UX flow

1. Пользователь открывает `Create facet`.
2. В поле label слева видит source pill/button:
   - если source не выбран: `Source`;
   - если выбран: краткий label source, например `Color`, `Brand`, `Price`.
3. По клику открывается `FacetSourcePickerModal`.
4. Модалка показывает search, таблицу и cursor pagination.
5. Для `PRICE` и `IN_STOCK` можно выбрать fixed source; для `TAG`, `OPTION`, `FEATURE` выбираются реальные candidates из API.
6. После подтверждения picker возвращает один `FacetSourcePickerEntity`.
7. Форма обновляет:
   - `facetType = entity.facetType`;
   - `source = { handle: entity.handle, name: entity.name ?? fallback }`;
   - `uiType` пересчитывается через `getDefaultFacetUiType(facetType)`, если текущий `uiType` не разрешён.
8. Submit отправляет `facetCreate(input.sources)`.

## Текстовый wireframe

### Create facet modal

```text
┌────────────────────────────────────────────────────────────┐
│ Create facet                                           [x] │
├────────────────────────────────────────────────────────────┤
│ General                                                    │
│                                                            │
│ Label                                                      │
│ ┌──────────────┬─────────────────────────────────────────┐ │
│ │ Color     ▾  │ Color                                   │ │
│ └──────────────┴─────────────────────────────────────────┘ │
│                                                            │
│ UI type                                                    │
│ [Checkbox] [Radio] [Dropdown]                             │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                             [Cancel] [Create]│
└────────────────────────────────────────────────────────────┘
```

### Select source modal

```text
┌────────────────────────────────────────────────────────────┐
│ Select source                                         [x] │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search filter sources                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Name                                      Type              │
│ ────────────────────────────────────────────────────────── │
│ Price                                     Standard          │
│ Brand                                     Standard          │
│ Category                                  Standard          │
│ Color                                     Product option    │
│ Denominations                             Product option    │
│ Material                                  Product feature   │
│ Tags                                      Tag               │
│ In stock                                  Standard          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 1-20 of 47                              [Prev] [Next]       │
│                                             [Cancel] [Select]│
└────────────────────────────────────────────────────────────┘
```

## UI model

Добавить entity type `facet-source`.

```ts
interface FacetSourcePickerEntity extends IPickableEntity {
  id: string;
  title: string;
  facetType: FacetType;
  handle: string;
  name: string;
  typeLabel: string;
}
```

Mapping:

- `id`: `${facetType}:${handle}` или API `id`;
- `title`: `name ?? handle`;
- `facetType`: API `facetType`;
- `handle`: API `handle`;
- `name`: `name ?? handle`;
- `typeLabel`:
  - `PRICE`, `IN_STOCK`, `TAG` -> `Standard`;
  - `OPTION` -> `Product option`;
  - `FEATURE` -> `Product feature`.

Колонки picker-а:

- `Name`: основной текст `title`, вторичная строка `Source: ${handle}` только если полезно отличать display name от handle;
- `Type`: `typeLabel`.

Selection mode: только `single`.

## GraphQL интеграция

Добавить query в `admin/src/domains/inventory/facets/graphql/queries.ts`:

```graphql
query FacetSourceCandidates(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: FacetSourceCandidateWhereInput
  $orderBy: [FacetSourceCandidateOrderByInput!]
) {
  catalogQuery {
    facetSourceCandidates(
      first: $first
      after: $after
      last: $last
      before: $before
      where: $where
      orderBy: $orderBy
    ) {
      edges {
        cursor
        node {
          id
          facetType
          handle
          name
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

Search condition:

```ts
function buildFacetSourceSearchCondition(search: string): ApiFacetSourceCandidateWhereInput {
  return {
    _or: [
      { name: { _containsi: search } },
      { handle: { _containsi: search } },
    ],
  };
}
```

Type filter:

```ts
const facetTypeFilter = allowedFacetTypes.length
  ? { facetType: { _in: allowedFacetTypes } }
  : undefined;
```

Итоговый `where` собирается через `_and`:

- `pageQuery.where` из search/filter widget;
- `facetTypeFilter`, если picker открыт для конкретного набора типов;
- `excludeIds`, если нужно скрыть уже выбранный source.

## Hook слой через usePageQuery

Добавить hook рядом с facets hooks:

```text
admin/src/domains/inventory/facets/hooks/use-facet-source-candidates.ts
```

Ответ hook-а должен быть connection-shaped и совместимым с `IEntityPickerDataResult`:

```ts
useFacetSourceCandidatesPageQuery({
  first,
  after,
  last,
  before,
  where,
  orderBy,
})
```

Если в проекте уже есть shared `usePageQuery`, использовать его как единственный владелец:

- cursor variables;
- `pageInfo`;
- `totalCount`;
- loading/error;
- сохранение предыдущих данных при `cache-and-network`.

Если shared `usePageQuery` отсутствует в admin, добавить тонкий local wrapper для этого query, но не дублировать pagination state внутри modal. State остаётся у `EntityPickerContent`/page config.

## Entity picker config

Добавить конфиг:

```text
admin/src/domains/inventory/facets/pickers/facet-source-picker-config.ts
```

Config:

- `entityType: "facet-source"`;
- `entityName: "Source"`;
- `entityNamePlural: "Sources"`;
- `searchEnabled: true`;
- `filterSchema`: минимум filter по `facetType`, если нужен ручной фильтр;
- `pageConfig.storageKey: "facet-source-picker-grid-state"`;
- `pageConfig.sortFieldMapping`: `name -> name`, `facetType -> facetType`, `handle -> handle`;
- `pageConfig.buildSearchCondition`: `buildFacetSourceSearchCondition`;
- `useData`: вызывает `useFacetSourceCandidatesPageQuery`;
- `getRowId`: `entity.id`.

Зарегистрировать config через `registerEntityPickerConfig(facetSourcePickerConfig)`.

## Modal API

Можно использовать generic `entity-picker`:

```ts
const { openPicker } = useEntityPicker<FacetSourcePickerEntity>({
  entityType: "facet-source",
  selectionMode: "single",
  initialSelection: selectedSource ? [selectedSource.id] : [],
  queryMeta: {
    allowedFacetTypes: [FacetType.Price, FacetType.Tag, FacetType.Option, FacetType.Feature, FacetType.InStock],
  },
  onConfirm: ([source]) => {
    if (!source) return;
    setValue("facetType", source.facetType, { shouldValidate: true });
    setValue("source", {
      handle: source.handle,
      name: source.name,
    }, { shouldValidate: true, shouldDirty: true });
  },
});
```

Если нужен title ровно `Select source`, добавить dedicated wrapper modal `FacetSourcePickerModal`, который переиспользует `EntityPickerContent`, но задаёт свой title и confirm text. Это ближе к screenshot и не ломает generic `Select Sources`.

## Изменения формы CreateFacetModal

Расширить schema:

```ts
source: z.object({
  handle: z.string().trim().min(1),
  name: z.string().trim().min(1),
}).nullable()
```

Validation:

- `source` обязателен для всех `FacetType`, потому backend `FacetCreateScript` сейчас ожидает ровно один source;
- при смене source обновлять `facetType`;
- при несовместимом `uiType` выбирать дефолтный `uiType`.

Default values:

```ts
source: null
```

`ICreateFacetModalPayload.initialValues` расширить опциональным `source`, чтобы future flows могли открывать create modal с заранее выбранным source.

## Mapper

Обновить `FacetFormInput` и `mapFacetFormToCreateInput()`:

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
};
```

Важно: не генерировать source на frontend из одного `facetType`. Источник истины для `handle/name` - `facetSourceCandidates`.

## Ошибки и empty states

Picker:

- loading: стандартный AG Grid loading;
- empty search: `No sources found`;
- API error: показать alert/toast и оставить modal открытой;
- disabled confirm, пока нет выбранной строки.

Create modal:

- если `facetCreate` вернул ошибку по `sources`, привязать её к `source`;
- если ошибка по `facetType`, тоже подсветить source-control, потому type выбирается через source.

## Файлы для реализации

Основные:

- `admin/src/domains/inventory/facets/graphql/queries.ts`;
- `admin/src/domains/inventory/facets/graphql/operation-types.ts`;
- `admin/src/domains/inventory/facets/hooks/use-facet-source-candidates.ts`;
- `admin/src/domains/inventory/facets/pickers/facet-source-picker-config.ts`;
- `admin/src/domains/inventory/facets/modals/create-facet-modal/schema.ts`;
- `admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx`;
- `admin/src/domains/inventory/facets/mappers/facet-input.mapper.ts`;
- `admin/src/domains/inventory/facets/modals.ts`;
- `admin/src/domains/modals.tsx`, только если нужен dedicated `FacetSourcePickerModal`.

Опционально:

- shared `usePageQuery`, если он ещё не существует в admin;
- dedicated source cell renderer, если `EntityCellRenderer` недостаточно похож на screenshot.

## Проверка

По проектным правилам не запускать `test` и `tsc`.

Минимальная проверка после реализации:

1. Запустить codegen, если GraphQL operation types генерируются из documents.
2. Запустить build, когда нужна новая версия кода.
3. Вручную проверить create flow:
   - открыть `Create facet`;
   - открыть `Select source`;
   - поискать `color`;
   - выбрать option source;
   - убедиться, что label input сохранил введённый label;
   - submit отправляет `sources`.

## Открытые решения

1. Оставлять generic modal title `Select Sources` или делать dedicated `Select source`.
2. Разрешать ли фильтр по `FacetType` внутри picker-а пользователю, или type должен задаваться только через caller `queryMeta`.
3. Нужен ли preselect source для current `typedPayload.initialValues.facetType`, если create modal открыт из action `Add same type`.
