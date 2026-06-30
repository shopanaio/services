# План перевода facet values в AGGrid

## Контекст

В `admin/src/domains/inventory/facets/modals/edit-facet-modal/` текущий блок Values работает как draggable list:

- `components/facet-values-list.tsx` использует `@dnd-kit` и `SortableValue`;
- каждая строка редактируется через input;
- порядок сохраняется через `facetValueUpdate.sortIndex`;
- новые display values создаются через `facetValueCreate`;
- удаление идет через `facetValueDelete`.

Для create facet flow уже есть таблица candidates:

- `admin/src/domains/inventory/facets/modals/create-facet-modal/facet-value-candidates-grid.tsx`;
- она использует `AgGridReact`, checkbox selection, поиск, Relay pagination;
- данные загружаются через `facetValueCandidates`.

Нужно заменить list с inputs в edit facet modal на AGGrid, похожий на референс: слева value, справа grouped values, строки draggable, selection через checkboxes, bulk panel для группировки, row action dropdown, кнопка `+` для добавления value candidates через отдельную модалку.

## Целевая модель UI

Все modal wireframes ниже должны соответствовать текущему modal stack pattern:

- root всегда `ModalLayout`;
- сверху всегда `ModalHeader` высотой 48px с close button, `esc`, title и primary submit action справа;
- `antd` modal footer не используется (`footer={null}`);
- body scrollable, светлый layout background;
- контент внутри body идет через один или несколько `Paper`;
- `PaperHeader` используется для заголовка секции и actions внутри секции;
- submit/cancel не рисуются внизу body: primary action находится в `ModalHeader`, закрытие через close/esc.

### Values table в EditFacetModal

```text
ModalLayout: Edit facet
┌──────────────────────────────────────────────────────────────────────────────┐
│ [x] esc  Edit facet                                             [Save]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Body                                                                         │
│                                                                              │
│ Paper: General                                                               │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ General                                                                  │ │
│ │ Label                                                                    │ │
│ │ [ Size                                                               ]   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Paper: Values                                                                │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Values                                                        [+] [⋯]    │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ Search filter values                                                     │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ Sort: [Manually v]  [Reorder for me]                                     │ │
│ ├──────┬──────┬──────────────────────┬──────────────────────────┬────────┤ │
│ │ [ ]  │ Drag │ Value                │ Grouped values           │        │ │
│ ├──────┼──────┼──────────────────────┼──────────────────────────┼────────┤ │
│ │ [ ]  │ ⋮⋮   │ XS                   │                          │ [⋯]    │ │
│ │ [ ]  │ ⋮⋮   │ XL                   │                          │ [⋯]    │ │
│ │ [ ]  │ ⋮⋮   │ Small                │ l, m, s                  │ [⋯]    │ │
│ │ [ ]  │ ⋮⋮   │ Black                │ graphite, dark, noir     │ [⋯]    │ │
│ └──────┴──────┴──────────────────────┴──────────────────────────┴────────┘ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Compact body view for the Values paper:

```text
Paper: Values
┌──────────────────────────────────────────────────────────────────────────────┐
│ Values                                                        [+] [⋯]        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search filter values                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sort: [Manually v]  [Reorder for me]                                         │
├──────┬──────┬──────────────────────┬──────────────────────────────┬────────┤
│ [ ]  │ Drag │ Value                │ Grouped values               │        │
├──────┼──────┼──────────────────────┼──────────────────────────────┼────────┤
│ [ ]  │ ⋮⋮   │ XS                   │                              │ [⋯]    │
│ [ ]  │ ⋮⋮   │ XL                   │                              │ [⋯]    │
│ [ ]  │ ⋮⋮   │ Small                │ l, m, s                      │ [⋯]    │
│ [ ]  │ ⋮⋮   │ Black                │ graphite, dark, noir         │ [⋯]    │
└──────┴──────┴──────────────────────┴──────────────────────────────┴────────┘
```

Колонки:

- selection checkbox;
- drag handle;
- `Value` - label value;
- `Grouped values` - source values, которые привязаны к display value через `facetValueMerge`;
- row actions dropdown справа.

Row actions зависят от `FacetValue.kind`:

```text
kind: DISPLAY
[⋯]
  Edit
  Ungroup
  Delete

kind: SOURCE
[⋯]
  Delete
```

Поведение row actions:

- `Edit` доступен только для `kind: DISPLAY`; открывает ту же модалку, что создание группы, но в режиме edit: можно изменить label группы, удалить values из группы и добавить новые values в группу;
- `Ungroup` доступен только для `kind: DISPLAY` с grouped values; вызывает `facetValueUnmerge` для всех source values этой группы;
- `Delete` удаляет row через `facetValueDelete`; для `kind: DISPLAY` с grouped values нужно либо сначала запретить delete с подсказкой ungroup, либо выполнить unmerge перед delete, если product decision это разрешит;
- для `kind: SOURCE` row action содержит только `Delete`.

Поведение:

- manual order включен по умолчанию;
- drag работает только в manual mode;
- сортировка по label выключает manual drag или переводит sort selector из `Manually`;
- поиск фильтрует локальный список values в открытой модалке;
- grouped values показываются компактной строкой через `sourceValues`.

### Bulk action panel

Появляется внутри `Paper: Values`, между toolbar/search и grid, когда выбрано 2+ rows.

```text
Paper: Values
┌──────────────────────────────────────────────────────────────────────────────┐
│ Values                                                        [+] [⋯]        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search filter values                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3 selected                    [Add to group] [Ungroup] [Delete] [Clear]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sort: [Manually v]  [Reorder for me]                                         │
├──────┬──────┬──────────────────────┬──────────────────────────────┬────────┤
│ ...                                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Поведение:

- `Add to group` открывает modal выбора или создания группы и добавляет selected rows в группу через `facetValueMerge`;
- `Ungroup` вызывает `facetValueUnmerge` для selected rows, которые являются grouped source values или display groups; для неподходящих rows action disabled или пропускается с подтверждением;
- `Delete` удаляет selected rows через `facetValueDelete` после confirmation;
- `Clear` снимает selection;
- если выбрана 1 строка, панель может показывать применимые actions для одной строки или не показываться.

Для multi-select нужна явная совместимость selected rows:

- `Add to group` активен, когда выбраны source rows или display rows, которые можно трактовать как source values по backend contract;
- `Ungroup` активен, когда selection содержит хотя бы один `kind: DISPLAY` с grouped values или source row, который сейчас принадлежит группе;
- `Delete` активен для любых selected rows, но для grouped display rows должен учитывать правило удаления групп.

### Create/Edit group modal

```text
ModalLayout: Create value group
┌──────────────────────────────────────────────────────────────┐
│ [x] esc  Create value group                    [Create group] │
├──────────────────────────────────────────────────────────────┤
│ Body                                                         │
│                                                              │
│ Paper: General                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ General                                                  │ │
│ │ Name *                                                   │ │
│ │ [ Small                                              ]   │ │
│ │ Customers will see this in your store's filters          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Paper: Values                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Values *                                                 │ │
│ │ XS                                                 [x]   │ │
│ │ S                                                  [x]   │ │
│ │ M                                                  [x]   │ │
│ │ + Add another value                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Edit mode:

```text
ModalLayout: Edit value group
┌──────────────────────────────────────────────────────────────┐
│ [x] esc  Edit value group                    [Save changes]   │
├──────────────────────────────────────────────────────────────┤
│ Body                                                         │
│                                                              │
│ Paper: General                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ General                                                  │ │
│ │ Name *                                                   │ │
│ │ [ Small                                              ]   │ │
│ │ Customers will see this in your store's filters          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Paper: Values                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Values *                                                 │ │
│ │ XS                                                 [x]   │ │
│ │ S                                                  [x]   │ │
│ │ M                                                  [x]   │ │
│ │ + Add another value                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Inline add state:

```text
Paper: Values
┌──────────────────────────────────────────────────────────────┐
│ Values *                                                     │
│ XS                                                     [x]    │
│ S                                                      [x]    │
│ M                                                      [x]    │
│ [ Search source value...                              v ]     │
│ + Add another value                                          │
└──────────────────────────────────────────────────────────────┘
```

Submit:

- create mode вызывает `facetValueMerge`;
- `targetValueId` - display value, который станет группой;
- `sourceValueIds` - выбранные source values;
- если пользователь вводит новое имя группы, сначала создается новый display value через `facetValueCreate`, затем вызывается `facetValueMerge`;
- после успешного merge edit facet modal делает refetch facet details и обновляет grid.

Edit submit:

- если изменился label группы, вызывает `facetValueUpdate` для display value;
- добавленные values отправляются через `facetValueMerge` в существующий `targetValueId`;
- удаленные из группы values отправляются через `facetValueUnmerge`;
- после успешных mutations edit facet modal делает refetch facet details и обновляет grid.

Добавление values в edit group modal:

- каждый value в списке имеет кнопку `X`, которая удаляет value из draft группы;
- кнопка `+ Add another value` добавляет inline `Autocomplete` под текущим списком values;
- `Autocomplete` ищет только values с `kind: SOURCE`;
- уже добавленные в группу source values исключаются из options;
- после выбора option из `Autocomplete` value сразу добавляется в draft список, autocomplete закрывается или очищается для следующего добавления;
- если пользователь убирает value через `X` в edit mode, source value помечается как removed и на submit отправляется через `facetValueUnmerge`;
- если пользователь добавляет value в edit mode, source value помечается как added и на submit отправляется через `facetValueMerge`;
- create/edit group modal не должна открывать full value candidates modal для добавления одного value внутрь группы; full candidates modal остается для кнопки `+` в основной Values table.

Autocomplete data source:

- сначала можно использовать локальные rows из открытой edit facet modal и фильтровать `kind: SOURCE`;
- если локальных source rows недостаточно, добавить query mode для source value candidates с `meta.facetId`, но в UI все равно показывать dropdown autocomplete, а не таблицу;
- option label: `label`;
- secondary text: `handle` или `sourceHandle`, если нужно различать похожие values.

Важно: если в выбранных rows все значения являются display values, для merge нужно определить, какие rows можно использовать как source values. Если backend требует source values, UI должен:

- либо разрешать группировку только root/source rows;
- либо сначала создавать/получать source values для выбранных candidates;
- либо использовать уже существующий contract `FacetValueMergeInput` без преобразований и показывать validation error как есть.

Финальное правило нужно уточнить по backend contract перед реализацией.

### Value candidates modal

Открывается кнопкой `+` в Values table.

```text
ModalLayout: Add values
┌──────────────────────────────────────────────────────────────────────────────┐
│ [x] esc  Add values                                      [Add selected]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Body                                                                         │
│                                                                              │
│ Paper: Values                                                                │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Values                                                                   │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ Search filter values                                                     │ │
│ ├──────┬──────────────────────────────┬────────────────────────────────────┤ │
│ │ [ ]  │ Value                        │ Source                             │ │
│ ├──────┼──────────────────────────────┼────────────────────────────────────┤ │
│ │ [ ]  │ red                          │ color                              │ │
│ │ [ ]  │ blue                         │ color                              │ │
│ │ [ ]  │ cotton                       │ material                           │ │
│ └──────┴──────────────────────────────┴────────────────────────────────────┘ │
│ │ 1-20 of 156                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Поведение:

- использует такую же AGGrid таблицу, как create facet modal;
- `meta.facetId` передается в `facetValueCandidates`, чтобы backend исключал уже добавленные values;
- отмеченные candidates на submit создаются как facet values;
- после сохранения вызывается refetch открытой edit facet modal;
- modal закрывается только после успешного создания всех selected values.

## Интеграция с текущими файлами

### 1. Разделить существующий candidates grid

Текущий `FacetValueCandidatesGrid` лежит внутри create modal, но нужен и для edit modal.

Предлагаемая структура:

```text
admin/src/domains/inventory/facets/components/facet-value-candidates-grid.tsx
admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx
admin/src/domains/inventory/facets/modals/value-candidates-modal/value-candidates-modal.tsx
```

Изменения:

- перенести reusable grid из `create-facet-modal/facet-value-candidates-grid.tsx` в `components/`;
- расширить props:
  - `facetType`;
  - `sourceHandles?: string[]`;
  - `facetId?: string`;
  - `value`;
  - `onChange`;
  - optional `height`, `selectionMode`, `pageSize`;
- create modal продолжает передавать `sourceHandles: [source.handle]`;
- edit candidates modal передает `facetId` и, при необходимости, `sourceHandles` из facet sources.

### 2. Создать AGGrid values table

Новый компонент:

```text
admin/src/domains/inventory/facets/modals/edit-facet-modal/components/facet-values-grid.tsx
```

Responsibilities:

- рендерит `AgGridReact` вместо `FacetValuesList`;
- хранит selection ids локально или отдает наверх через `onSelectionChange`;
- использует `rowDragManaged`;
- вызывает `onReorder(nextValues)` после drag;
- показывает grouped values через `value.sourceValues`;
- поддерживает локальный search;
- показывает bulk panel над grid.

Не нужно переносить GraphQL calls в grid: компонент должен получать `values` и callbacks от `EditFacetModal`.

### 3. Обновить edit facet form state

Сейчас edit modal использует `OptionEditorValue`, где есть `name`, `slug`, `sortIndex`, `swatch`.

Для AGGrid лучше ввести UI-local model, например:

```ts
interface FacetValueEditorRow {
  id: string;
  apiId?: string;
  kind: FacetValueKind;
  label: string;
  handle: string;
  sortIndex: number;
  enabled: boolean;
  sourceValues: Array<{
    id: string;
    label: string;
    handle: string;
  }>;
  swatch?: OptionEditorSwatch | null;
}
```

Это допустимо по `patterns/admin-graphql-layer.md`, потому это editor state, а не API-output view model.

### 4. Расширить GraphQL fragment для grouped values

Сейчас `FacetValueGridFields.sourceValues` содержит только `handle`.

Для колонки `Grouped values` нужны минимум:

```graphql
sourceValues {
  id
  label
  handle
}
```

Также нужно добавить `kind`, потому row actions зависят от `DISPLAY` / `SOURCE`:

```graphql
kind
```

Если backend уже отдает `label` для `sourceValues`, достаточно расширить fragment. Если нет, сначала добавить resolver/field на backend.

### 5. Добавить frontend mutations/hooks для merge/unmerge

В admin GraphQL сейчас есть create/update/delete facet value hooks, но нет frontend hooks для `facetValueMerge` и `facetValueUnmerge`.

Добавить:

```text
admin/src/domains/inventory/facets/hooks/use-merge-facet-values.ts
admin/src/domains/inventory/facets/hooks/use-unmerge-facet-values.ts
admin/src/domains/inventory/facets/graphql/mutations.ts
admin/src/domains/inventory/facets/graphql/operation-types.ts
```

Mutation:

```graphql
mutation FacetValueMerge($input: FacetValueMergeInput!) {
  catalogMutation {
    facetValueMerge(input: $input) {
      facetValue {
        ...FacetValueGridFields
        facet { id }
      }
      sourceValues {
        ...FacetValueGridFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Unmerge mutation:

```graphql
mutation FacetValueUnmerge($input: FacetValueUnmergeInput!) {
  catalogMutation {
    facetValueUnmerge(input: $input) {
      sourceValues {
        ...FacetValueGridFields
      }
      affectedDisplayValues {
        ...FacetValueGridFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Hooks должны возвращать unwrapped result и `userErrors`, по паттерну существующих `useCreateFacetValue` / `useUpdateFacetValue`.

### 6. Добавить create/edit group modal

Новая modal:

```text
admin/src/domains/inventory/facets/modals/facet-value-group-modal/
  facet-value-group-modal.tsx
  schema.ts
  index.ts
```

Payload:

```ts
interface ICreateFacetValueGroupModalPayload extends IModalStackPayload {
  mode: "create" | "edit" | "add-to-existing";
  facetId: string;
  selectedValueIds: string[];
  selectedValues: FacetValueEditorRow[];
  groupValueId?: string;
  initialGroupLabel?: string;
  initialGroupedValues?: FacetValueEditorRow[];
  onSaved?: () => Promise<unknown> | unknown;
}
```

Submit flow:

1. validate group name;
2. decide target display value:
   - existing selected row if product decision says group is created from one selected row;
   - or newly created display value via `facetValueCreate`;
3. call `facetValueMerge`;
4. in edit mode, call `facetValueUpdate` for label changes and `facetValueUnmerge` for removed values;
5. call `onSaved`;
6. close modal.

UI details:

- values list is a simple vertical list, not AGGrid;
- every listed value has an `X` icon button on the right;
- footer action is `+ Add another value`;
- clicking it renders an inline `Autocomplete`;
- autocomplete options must be restricted to `kind: SOURCE`;
- selecting an option appends it to the draft group and removes it from future options.

### 7. Добавить value candidates modal

Новая modal:

```text
admin/src/domains/inventory/facets/modals/value-candidates-modal/
  value-candidates-modal.tsx
  index.ts
```

Payload:

```ts
interface IFacetValueCandidatesModalPayload extends IModalStackPayload {
  facetId: string;
  facetType: FacetType;
  sourceHandles: string[];
  onSaved?: () => Promise<unknown> | unknown;
}
```

Submit flow:

1. selected candidates берутся из reusable `FacetValueCandidatesGrid`;
2. для каждого candidate вызывается `facetValueCreate`:
   - `facetId`;
   - `label: candidate.label`;
   - `handle: candidate.handle`;
   - `kind: SOURCE` или default kind по backend contract;
   - `sortIndex` после текущего max sort index;
3. после успешного создания всех values вызывается `onSaved`;
4. edit facet modal refetch получает новые values.

Нужно проверить backend contract `FacetValueCreateInput.kind`: для source candidates likely нужно создавать source values, а не display values. Если API создает только display values по default, modal должна явно передавать нужный `kind`.

### 8. Обновить modal registry

В `admin/src/domains/inventory/facets/modals.ts` добавить:

- `FACET_VALUE_CANDIDATES_MODAL_TYPE`;
- `FACET_VALUE_GROUP_CREATE_MODAL_TYPE`;
- optionally use one `FACET_VALUE_GROUP_MODAL_TYPE` if create/edit share a component;
- payload interfaces;
- `createModalStackHook` exports.

Также подключить компоненты в общем modal renderer, если он регистрируется централизованно.

### 9. Обновить EditFacetModal

В `edit-facet-modal.tsx`:

- заменить `FacetValuesList` на `FacetValuesGrid`;
- `+` должен открывать `useFacetValueCandidatesModal`;
- row action `Edit` должен открывать group modal в edit mode;
- row action `Ungroup` должен вызывать `facetValueUnmerge`;
- row action `Delete` должен вызывать `facetValueDelete`;
- bulk panel `Add to group` должен открывать group modal в add-to-existing/create mode;
- bulk panel `Ungroup` должен вызывать `facetValueUnmerge`;
- bulk panel `Delete` должен вызывать `facetValueDelete` для selected rows;
- `onSaved` обеих modal вызывает refetch facet details и пересборку `editorValues`;
- сохранить текущую логику save для label/uiType/swatch/order;
- при удалении/rename оставить существующие mutations, пока backend contract не требует отдельного массового update.

## Вопросы к backend contract

Перед реализацией нужно подтвердить:

1. `FacetValueMergeInput` принимает какие ids: source value ids, display value ids или оба типа?
2. Может ли `facetValueCreate` создавать source values из candidates напрямую через `kind: SOURCE`?
3. Должны ли candidates modal создавать source values, display values или сразу display values с linked source values?
4. Нужно ли добавлять `FacetValueUnmerge` UI в grouped values column?
5. Нужно ли показывать disabled values в table или скрывать их по умолчанию?
6. Что делать при delete display group: запрещать до ungroup или автоматически ungroup + delete?
7. Как трактовать `Add to group`, если selected rows содержат `kind: DISPLAY` без grouped values?

## План работ

1. Подготовить shared candidates grid:
   - вынести компонент из create modal;
   - добавить режим `facetId`;
   - сохранить совместимость create modal.

2. Добавить `FacetValuesGrid`:
   - AGGrid layout;
   - row drag;
   - checkbox selection;
   - local search;
   - grouped values renderer;
   - row action dropdown renderer;
   - bulk action panel.

3. Расширить GraphQL operation layer:
   - fragment `FacetValueGridFields.kind`;
   - fragment `FacetValueGridFields.sourceValues`;
   - `FACET_VALUE_MERGE_MUTATION`;
   - `FACET_VALUE_UNMERGE_MUTATION`;
   - `useMergeFacetValues`;
   - `useUnmergeFacetValues`;
   - operation types.

4. Добавить create/edit group modal:
   - form schema;
   - selected values preview;
   - `X` remove button for each value;
   - `+ Add another value` inline Autocomplete;
   - Autocomplete options filtered to `kind: SOURCE`;
   - merge submit flow;
   - unmerge submit flow for removed values;
   - refetch callback.

5. Добавить value candidates modal:
   - reusable candidates grid;
   - selected candidates state;
   - create selected values flow;
   - refetch callback.

6. Интегрировать в `EditFacetModal`:
   - заменить list на grid;
   - подключить `+`;
   - подключить bulk `Create group`;
   - сохранить текущий save order/update/delete flow.

7. Проверка:
   - не запускать `test` и `tsc`;
   - при необходимости запустить только project build через утвержденный build flow;
   - руками проверить create/edit facet modal в admin UI.

## Риски

- AGGrid row drag и external sort конфликтуют: manual drag нужно блокировать, когда активна сортировка не `Manually`.
- Merge semantics могут отличаться от UX: если backend принимает только source values, нельзя слепо merge-ить любые selected display rows.
- `sourceValues { handle }` недостаточно для хорошей grouped values column; нужен `label`.
- Bulk create candidates может частично завершиться: нужен последовательный submit с остановкой на первом `userErrors` или backend batch mutation.
- Если selected rows отфильтрованы search, selection не должна теряться, пока modal открыта.
