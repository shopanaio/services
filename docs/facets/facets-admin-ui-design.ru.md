# Facets: дизайн Admin UI

Документ проектирует страницу управления storefront facets в существующей
админке Shopana. Основа: `docs/facets/facets-data-model.ru.md`, текущие
inventory pages, `edit-attributes-modal` и inventory inline editing.

Актуальная модель UI: основная таблица является двумерной AG Grid структурой
`Facet -> FacetValue`.

- `Facet` - parent row.
- `FacetValue` - child row.

Tree rendering должно повторять `edit-attributes-modal`, но основная страница
не поддерживает DnD. Редактирование порядка вынесено в отдельную order modal с
такой же flat `Facet -> FacetValue` таблицей и drag handles. Field edit
persistence должен повторять inventory page: zustand state и нижняя save panel.

## Навигация

Раздел: `Store`.

Пункт меню: `Facets`.

URL:

```text
/:orgName/:storeName/facets
```

Причина: текущие catalog configuration pages (`Products`, `Categories`, `Tags`,
`Bundles`) зарегистрированы в sidebar domain `store` и используют URL без
`/inventory`. Domain `inventory` сейчас отвечает за stock/warehouse pages и
динамический warehouse sidebar. Facets настраивают storefront/catalog filters,
а не warehouse stock, поэтому Phase 1 должен следовать `store` pattern.

Модуль:

```text
admin/src/domains/inventory/facets/
  register.tsx
  modals.ts
  page/
    page.tsx
    filter-schema.ts
    page-config.ts
  components/
    facet-tree-name-cell.tsx
    facet-tree-actions-cell.tsx
    facet-linked-sources-cell.tsx
    facet-swatch-cell.tsx
    facet-select-cell.tsx
    facet-boolean-cell.tsx
  modals/
    create-facet-modal/
    edit-facet-modal/
    edit-facet-order-modal/
    create-facet-value-modal/
    edit-facet-value-modal/
    link-source-values-modal/
    merge-facet-values-modal/
    edit-facet-swatch-modal/
  graphql/
  hooks/
    use-facet-grid-edit-store.ts
    use-facet-tree-rows.ts
    use-facet-order-tree-rows.ts
    use-save-facet-grid-edits.ts
    use-save-facet-order.ts
  mappers/
```

`merge-facet-values-modal/` and `edit-facet-swatch-modal/` are Phase 2 module
folders. They are listed in the target structure, but must not be required for
the Phase 1 delivery.

`modals.ts` owns modal type constants, payload interfaces, module augmentation
for `ModalStackPayloads`, and typed hooks created with `createModalStackHook`.
Every Phase 1 modal must also be registered in the global modal registry file:

```text
admin/src/domains/modals.tsx
```

This follows existing `tag-*`, `category-*` and `product-*` modal registration.

## Основная страница

Страница строится как существующие admin data/list pages:

- `DataLayout` с `title="Facets"`;
- в header secondary action `Edit order` и primary action `Create`;
- сверху `DataLayout.Toolbar` с `FilterWidget`: search + filters;
- внутри `AgGridReact`;
- снизу `FloatingPanelStack` с editing panel, когда есть pending changes.

`CursorPagination` для основной таблицы не нужен, если backend отдает все
facets и values: order modal требует полный набор строк. Если позже facets
станет слишком много, нужно добавлять dedicated server-side reorder API, а не
пагинировать текущую таблицу порядка.

Facets page не использует `useInventoryRelayListPage`: `catalogQuery.facets`
не принимает `where`, `orderBy` или pagination variables. `filter-schema.ts` и
`page-config.ts` для этой страницы описывают client-side search/filter state
для `FilterWidget` и grid state только. Фильтрация применяется к уже загруженным
`FacetGridRow[]` перед вычислением `visibleRows`.

Search/filter behavior:

- search matches facet `label`/`slug` and value `label`/`slug`;
- source filter matches `facetType`;
- UI type filter matches `uiType`;
- has values filter distinguishes computed facets from discrete facets;
- when search/filter hides child rows, parent facet stays visible if either the
  facet itself or at least one child matches;
- Reset clears only facets page search/filter state, not pending edits.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Facets                                               [Edit order] [+ Create] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search facets and values...] [Source v] [UI type v] [Has values v] [Reset] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Facet / Value                 Source    UI        Linked sources  ⋯     │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ ▸ [facet] Price               PRICE     RANGE     Automatic       ⋯     │ │
│ │ ▸ [facet] Availability        IN_STOCK  BOOLEAN   Automatic       ⋯     │ │
│ │ ▾ [facet] Color               OPTION    CHECKBOX  12 values       ⋯     │ │
│ │     Red                       value     enabled   4 linked        ⋯     │ │
│ │     Blue                      value     enabled   2 linked        ⋯     │ │
│ │     Burgundy                  value     disabled  1 linked        ⋯     │ │
│ │ ▾ [facet] Brand               TAG       DROPDOWN  24 values       ⋯     │ │
│ │     Nike                      value     enabled   nike            ⋯     │ │
│ │     Adidas                    value     enabled   adidas          ⋯     │ │
│ │ ▸ [facet] Material            FEATURE   CHECKBOX  5 values        ⋯     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│        floating panel appears only with local edits:                          │
│        [Unsaved changes (5)]                         [Discard] [Save]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

`PRICE` and `IN_STOCK` are parent rows without editable child values. They may
still have an expand placeholder for row alignment, but expanding does nothing.

## Row model

Grid rows must be compatible with `useTreeTableDragDrop`, like
`AttributeEditorRow` in edit attributes.

```ts
type FacetGridRowType = "facet" | "value";

interface FacetGridRow extends ITreeTableRow {
  id: string;
  apiId?: string;
  type: FacetGridRowType;
  parentId: string | null;
  level: 0 | 1;
  sortIndex: number;
  name: string;

  // facet rows
  slug?: string;
  facetType?: FacetType;
  uiType?: FacetUiType;
  selectionMode?: FacetSelectionMode;
  valuesCount?: number;
  enabledValuesCount?: number;
  linkedSourceHandlesCount?: number;

  // value rows
  enabled?: boolean;
  sourceHandles?: string[];
  swatchId?: string | null;
  swatch?: ApiFacetSwatch | null;
}
```

Mapping:

- `Facet` -> `type: "facet"`, `parentId: null`, `apiId = facet.id`,
  `level = 0`;
- `FacetValue` -> `type: "value"`, `parentId = facet.id`,
  `apiId = value.id`, `level = 1`;
- `PRICE` and `IN_STOCK` facets never receive value child rows;
- `TAG`, `FEATURE`, `OPTION` facets receive child rows from `facet.values`;

## Attributes grid mechanics to reuse

`edit-attributes-modal` does not use AG Grid tree data mode. It builds a flat
row array and computes visible tree manually:

- source rows are stored in `allRows`;
- grid receives only `visibleRows`;
- `visibleRows` is built from root rows sorted by `sortIndex`;
- child rows are appended immediately after a parent only when `expandedIds`
  contains the parent id;
- row visual level comes from `row.level`, not AG Grid tree data;
- indentation is drawn in the name cell by `level * 24`;
- `getRowClass` returns `row-group` or `row-child`;
- `row-group` has stronger text weight;
- `row-child` uses normal container background.

For facets use the same manual tree approach:

```text
allRows
  facet: Price
  facet: Availability
  facet: Color
  value: Red, parentId = Color
  value: Blue, parentId = Color
  facet: Brand
  value: Nike, parentId = Brand

visibleRows
  depends on expandedIds
```

Do not use `treeData`, `getDataPath`, master/detail, row grouping, or nested
tables. This must stay the same flat AG Grid pattern as attributes grid.

## Columns

| Column | Facet row | Value row | Editable |
| --- | --- | --- | --- |
| `Facet / Value` | facet label + slug, expand icon | public value label + slug | facet label, value label |
| `Source` | `facetType` | `value` | no |
| `UI / Status` | `uiType` + `selectionMode` | `enabled` | facet UI/status, value enabled |
| `Linked sources` | `Automatic` or `N values` | chips/count for `sourceHandles` | opens link modal |
| `Swatch` | empty or count summary | swatch preview | Phase 1: read-only; Phase 2: opens swatch picker/modal |
| `Order` | `sortIndex` | `sortIndex` | no; edit in order modal |
| `Actions` | menu | menu | no |

Actions is always the rightmost column.

### Name cell

Reuse the visual pattern from
`admin/src/domains/inventory/products/modals/edit-attributes-modal/components/name-cell-renderer.tsx`:

- indent by `level * 24`;
- expand/collapse icon for facet rows with values;
- facet icon for parent rows;
- value/tag icon for child rows;
- no row drag handle on the main page;
- facet rows use `row-group`;
- value rows use `row-child`.

### Actions column

Rightmost `ActionsCellRenderer` mirrors edit attributes.

Facet row menu:

- `Edit`;
- `Create value` for `TAG`, `FEATURE`, `OPTION`;
- `Duplicate`;
- `Delete`.

Value row menu:

- `Edit`;
- `Link source values`;
- `Duplicate`;
- `Delete`.

`Delete` is destructive and opens confirmation. If there are unsaved grid edits,
delete is disabled and shows message: save or discard changes first.

## Order editing modal

The main facets page does not enable DnD. It shows `Order` as read-only data and
opens a dedicated `edit-facet-order-modal` from the header `Edit order` action.
This avoids persisting wrong `sortIndex` values while the main table is
searched, filtered or sorted.

The order modal uses the same flat `Facet -> FacetValue` AG Grid shape as the
main page, but only the modal table has row drag handles.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Edit facet order                                                 [Save] │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Facet / Value                          Source      Order              │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ ⋮⋮ [facet] Price                       PRICE       0                  │ │
│ │ ⋮⋮ [facet] Availability                IN_STOCK    1                  │ │
│ │ ⋮⋮ [facet] Color                       OPTION      2                  │ │
│ │   Red                                  value       0                  │ │
│ │   Blue                                 value       1                  │ │
│ │ ⋮⋮ [facet] Brand                       TAG         3                  │ │
│ │   Nike                                 value       0                  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Phase 1 order modal scope:

- reorder facet parent rows only;
- value rows are visible for context but do not expose drag handles;
- value rows keep their current `sortIndex`;
- `PRICE` and `IN_STOCK` are reordered like any other facet row;
- save maps changed facet order to `facetUpdate({ id, sortIndex })`;
- cancel closes the modal without touching page pending edits.

Phase 2 can enable same-facet value reorder inside this same modal.

Do not implement a second drag model from scratch. The order modal needs a
dedicated hook that reuses the flat tree mechanics from `useTreeTableDragDrop`,
but adds facet-specific reorder constraints and server row resync behavior.

Hook file:

```text
admin/src/domains/inventory/facets/hooks/use-facet-order-tree-rows.ts
```

The order hook owns modal-local state only:

- `allRows`;
- `visibleRows`;
- `expandedIds`;
- expand/collapse handlers;
- AG Grid row drag handlers;
- reset from latest server rows when the modal opens or after successful save;
- facet-only reorder in Phase 1;
- optional same-facet value reorder in Phase 2.

It must reuse the common algorithmic parts from `useTreeTableDragDrop`: flat
`allRows`, derived `visibleRows`, manual expansion, sorting by `sortIndex`, row
class calculation, collapse-on-parent-drag and restore expansion after drag. If
this creates duplication, extract shared flat-tree helpers from
`useTreeTableDragDrop` instead of forking the logic silently.

Use facets as the hook "group" rows internally:

```text
useFacetOrderTreeRows({
  initialRows,
  onFacetOrderEdit: setFacetOrderEdit,
  onInvalidMove: showWarning,
  valueDragMode: "disabled",
})
```

Required modal grid setup:

```text
ModuleRegistry.registerModules([AllCommunityModule, RowDragModule])

<AgGridReact<FacetGridRow>
  rowData={visibleRows}
  rowDragManaged
  animateRows
  suppressMovableColumns
  getRowId={getRowId}
  getRowClass={getRowClass}
  onRowDragEnter={handleRowDragEnter}
  onRowDragEnd={handleRowDragEnd}
/>
```

Facet-specific constraints in `useFacetOrderTreeRows()`:

- `FacetValue` is never a root row. It must always stay under its owning
  `Facet`.
- Phase 1 disables value row dragging completely. Only `Facet` rows get a drag
  handle and only facet `sortIndex` changes are persisted.
- The first column `rowDrag` callback returns `true` only for
  `row.type === "facet"`.
- When a `Facet` drag starts, collapse all facets and restore previous expansion
  after drag ends.
- `onRowDragEnd` reads current modal grid visual order through
  `event.api.forEachNodeAfterFilterAndSort`.
- It walks rows top-to-bottom and assigns the next root `sortIndex` only to
  facet rows.
- Valid reorder writes a modal-local facet order edit.
- If AG Grid produces an invalid candidate order, restore the previous rows and
  show `Facet values can only be reordered inside their facet`.

The generic `useTreeTableDragDrop` configuration is not enough for Phase 2 value
rules: it currently allows child rows to become root rows or move under another
parent. The order modal therefore must not call it directly without
facet-specific guarding.

`useFacetTreeRows()` remains a non-DnD page hook. It owns visible tree state for
the main page only:

- `allRows`;
- `visibleRows`;
- `expandedIds`;
- expand/collapse handlers;
- row reset from latest server rows after discard/refetch.

It must not expose row drag handlers and the main page must not pass
`rowDragManaged`, `onRowDragEnter` or `onRowDragEnd` to `AgGridReact`.

## Inline editing

There are two existing patterns and both matter:

1. Attributes grid edits local tree rows directly:
   - `editable: true`;
   - `onCellValueChanged` for `name`;
   - `valueGetter`/`valueSetter` for comma-separated values;
   - `valueSetter` calls `updateRow(...)` and returns `false`;
   - `onRowsChange` calls `setDirty(true)`.
2. Inventory page persists inline edits through zustand and bottom panel:
   - `readOnlyEdit`;
   - `onCellEditRequest`;
   - store holds original/current values;
   - display data is server data merged with pending edits;
   - `FloatingPanelStack` shows Save/Discard.

For facets use attributes grid for flat tree rendering and inventory page for
pending field persistence:

- grid uses `readOnlyEdit`;
- cell edits are captured in `onCellEditRequest`;
- pending changes live in zustand;
- server rows are merged with pending edits for display;
- bottom `FloatingPanelStack` editing panel appears when edits exist;
- `Save` sends all pending field changes;
- `Discard` clears local field edits.

Order editing is separate from page inline editing. The main page never updates
row order locally through DnD. `Edit order` opens the order modal, and the modal
owns its own local order draft until the modal save succeeds or the modal is
closed.

Do not use `onCellValueChanged` as the only source of pending field edits,
because page-level save/discard needs original/current values like inventory.

### Zustand page state

Zustand store is page-local draft state, not an API cache. Server data remains
owned by Apollo query hooks. The page derives grid rows from:

```text
catalogQuery.facets response
  + pending field edits from zustand
  -> FacetGridRow[]
  -> useFacetTreeRows visibleRows
```

Store file:

```text
admin/src/domains/inventory/facets/hooks/use-facet-grid-edit-store.ts
```

Responsibilities:

- keep unsaved field edits;
- keep row-level API validation errors;
- keep submit-level API errors;
- keep page editing status;
- keep selected value row ids for Phase 2 merge actions;
- expose selectors for bottom save panel and cell renderers;
- reset itself when user discards, save succeeds, or page unmounts.

The store must not keep `ApiFacet[]` or replace Apollo cache. API objects are
read directly from GraphQL hooks, then merged with drafts at the display
boundary.

### Store shape

```ts
type FacetGridRowId = `facet:${string}` | `value:${string}`;

type FacetGridEditableField =
  | "facet.label"
  | "facet.slug"
  | "facet.uiType"
  | "facet.selectionMode"
  | "value.label"
  | "value.slug"
  | "value.enabled"
  | "value.sourceHandles"
  | "value.swatchId";

interface FacetGridFieldEdit {
  originalValue: string | number | boolean | string[] | null;
  currentValue: string | number | boolean | string[] | null;
}

interface FacetGridEditStore {
  fieldEdits: Partial<
    Record<FacetGridRowId, Partial<Record<FacetGridEditableField, FacetGridFieldEdit>>>
  >;
  selectedRowIds: FacetGridRowId[];
  rowErrors: Partial<Record<FacetGridRowId, ApiGenericUserError[]>>;
  submitErrors: ApiGenericUserError[];
  status: "idle" | "saving";

  setFieldValue: (
    rowId: FacetGridRowId,
    field: FacetGridEditableField,
    originalValue: FacetGridFieldEdit["originalValue"],
    currentValue: FacetGridFieldEdit["currentValue"],
  ) => void;
  setSelectedRowIds: (rowIds: FacetGridRowId[]) => void;
  discardRow: (rowId: FacetGridRowId) => void;
  discardAll: () => void;
  startSaving: () => void;
  finishSaving: () => void;
  onSubmitAccepted: () => void;
  setRowErrors: (rowId: FacetGridRowId, errors: ApiGenericUserError[]) => void;
  clearRowErrors: (rowId: FacetGridRowId) => void;
  setSubmitErrors: (errors: ApiGenericUserError[]) => void;
  clearSubmitErrors: () => void;
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getFieldEdit: (
    rowId: FacetGridRowId,
    field: FacetGridEditableField,
  ) => FacetGridFieldEdit | undefined;
  getRowEdits: (
    rowId: FacetGridRowId,
  ) => Partial<Record<FacetGridEditableField, FacetGridFieldEdit>> | undefined;
  getAllFieldEdits: () => FacetGridEditStore["fieldEdits"];
}
```

`rowId` for store:

- facet: `facet:${apiId}`;
- value: `value:${apiId}`.

`discardRow(rowId)` removes accepted field edits and row errors for one row. It
is used by `useSaveFacetGridEdits()` after a row mutation succeeds.

`setFieldValue` follows the inventory edit store behavior:

- if `currentValue` equals `originalValue`, remove that field edit;
- if a row has no more field edits, remove the row entry;
- clear `rowErrors[rowId]` and `submitErrors` when the user changes that row
  again;
- arrays such as `sourceHandles` compare by normalized content, not by reference.

### Page state flow

Page component responsibilities:

1. call `useFacets()` to load server facets;
2. map server facets to base `FacetGridRow[]`;
3. merge base rows with `fieldEdits`;
4. pass merged rows into `useFacetTreeRows()`;
5. render `visibleRows` in AG Grid;
6. render bottom `FloatingPanelStack` when `hasChanges()` is true.

`useFacetTreeRows()` is the facet-specific flat-tree hook:

- owns `allRows`, `visibleRows`, `expandedIds`, and expand/collapse handlers;
- receives merged rows from server + zustand drafts;
- exposes `resetRowsFromServer(nextRows)` for Discard and successful refetch;
- reuses shared flat-tree mechanics from `useTreeTableDragDrop`;
- does not expose any DnD handlers.

### Order modal state

Order modal draft state is local to `edit-facet-order-modal`, not part of the
page edit store.

```ts
type FacetOrderRowId = `facet:${string}` | `value:${string}`;

interface FacetOrderEdit {
  rowKind: "facet" | "value";
  parentId: string | null;
  originalParentId: string | null;
  originalSortIndex: number;
  sortIndex: number;
}
```

Phase 1 produces only `rowKind: "facet"` edits. Phase 2 can produce
`rowKind: "value"` edits, but only when `parentId` equals `originalParentId`.

Modal cleanup rules:

- if `sortIndex` and `parentId` match the original values, remove the order edit;
- otherwise keep the latest pending order for that row;
- cancel closes the modal and drops local order edits;
- successful save refetches `FACET_GRID_QUERY`, resets page rows from the fresh
  server data and then closes the modal.

Discard flow:

1. call `discardAll()` in zustand;
2. call `resetRowsFromServer()` with the latest server rows;
3. keep current filters/search state unchanged;
4. clear selected rows.

Successful save flow:

1. call `onSubmitAccepted()` in zustand;
2. refetch `FACET_GRID_QUERY`;
3. rebuild rows from fresh server data;
4. clear selected rows;
5. show success message.

When the page unmounts or route store changes, call `discardAll()` so draft
edits from one store cannot leak into another store.

### Page save flow

Main page save maps zustand field edits to backend mutations:

1. facet field edits -> `facetUpdate`;
2. value field edits -> `facetValueUpdate`.

If a mutation fails:

- keep failed local edits;
- remove edits that were already accepted by the API only after their mutation
  succeeds;
- attach errors to row if possible;
- show first error in custom floating panel above editing panel or as
  `App.message.error`;
- do not clear the entire store unless every mutation succeeds.

The save handler lives in a hook:

```text
admin/src/domains/inventory/facets/hooks/use-save-facet-grid-edits.ts
```

It reads `fieldEdits`, groups them by row kind, maps them to GraphQL inputs,
and calls the generated mutation hooks sequentially.

### Order modal save flow

Order modal save maps local order edits to backend mutations:

1. Phase 1 facet order edits -> `facetUpdate({ id, sortIndex })`;
2. Phase 2 same-facet value order edits ->
   `facetValueUpdate({ id, sortIndex })`.

For first implementation, sequential mutations are acceptable because API has
no bulk reorder mutation. If a mutation fails:

- keep the modal open;
- keep failed local order edits;
- attach mapped errors to the modal row if possible;
- show first unmapped error in the modal error area or as `App.message.error`;
- do not refetch or close the modal unless every order mutation succeeds.

The save handler lives in a separate hook:

```text
admin/src/domains/inventory/facets/hooks/use-save-facet-order.ts
```

It receives modal-local order edits, maps them through `facet-order.mapper.ts`,
calls generated mutation hooks sequentially, then refetches facets and resets
the main page rows from fresh server data on success.

### Cell editing by column

| Column | Edit handling |
| --- | --- |
| facet label | text editor -> `facet.label` |
| facet slug | text editor -> `facet.slug` |
| facet UI | select editor constrained by `facetType` |
| facet selection | select editor constrained by `uiType` |
| facet order | read-only on main page; edit through order modal |
| value order | read-only on main page; Phase 2 edits through order modal |
| value label | text editor -> `value.label` |
| value slug | text editor -> `value.slug` |
| value enabled | boolean renderer/editor -> `value.enabled` |
| linked sources | opens link source values modal -> `value.sourceHandles` |
| swatch | Phase 1 read-only preview; Phase 2 opens swatch picker/modal -> `value.swatchId` |

## Row click

- Facet row click opens `edit-facet-modal`.
- Value row click opens `edit-facet-value-modal`.
- Expand/collapse icon click only toggles facet expansion.
- Cells with inline editors and action buttons must stop propagation.

## Create facet modal

Header `Create` opens create facet modal.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Create facet                                                   [Create] │
├────────────────────────────────────────────────────────────────────────────┤
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ General                                                    │      │
│        │ Label *                     Slug *                         │      │
│        │ [Color                    ] [color                       ] │      │
│        │ Source *                                                    │      │
│        │ [OPTION v]                                                  │      │
│        └────────────────────────────────────────────────────────────┘      │
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Display                                                    │      │
│        │ UI type *                  Selection mode                  │      │
│        │ [CHECKBOX v]              [MULTI v]                        │      │
│        └────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

No group selector. Created facet is appended to root facet rows by `sortIndex`.

Implementation pattern:

- use fullscreen `ModalLayout` with `ModalHeader`;
- use `react-hook-form` with `zodResolver`;
- use `Paper`/`PaperHeader` sections like existing inventory forms;
- auto-generate slug from label until the user edits slug manually;
- form mapper converts values to `ApiFacetCreateInput`;
- error mapper converts `ApiGenericUserError.field` to form fields;
- on success refetches `FACET_GRID_QUERY`, resets rows from server data and
  closes the modal.

After create:

- `TAG`, `FEATURE`, `OPTION`: append facet row and optionally open value create
  flow;
- `PRICE`, `IN_STOCK`: append facet row without values.

## Edit facet modal

Facet row click opens fullscreen `ModalLayout` for advanced facet editing.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Color                                                           [Save]  │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ General                                                              │   │
│ │ Label              [Color]                                           │   │
│ │ Slug               [color]                                           │   │
│ │ Source             OPTION                                            │   │
│ │ UI type            [CHECKBOX]                                        │   │
│ │ Selection mode     [MULTI]                                           │   │
│ │ Order              4                                                 │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Values                                                [+ Create]     │   │
│ │ 12 public values, 31 linked source handles                           │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

`facetType` is immutable after create.

For `PRICE` and `IN_STOCK`, values are computed:

```text
Values are calculated automatically.
PRICE returns price range. IN_STOCK returns availability count.
```

No create value action for computed facets.

The `Values` section in Phase 1 is a compact summary and action entry point, not
a second nested table. Main value management remains in the grid.

## FacetValue rows and linked source values

`TAG`, `FEATURE` and `OPTION` facets support Shopify-like linked values: one
public storefront value can represent multiple source values.

Backend model:

- one `FacetValue`;
- many `FacetValue.sourceHandles`;
- source handles are tag handles, feature slugs or option value slugs.

UX principle:

- storefront sees one public value, for example `Red`;
- admin links several internal source values to it:
  `red`, `dark-red`, `wine-red`, `burgundy`;
- selecting `Red` on storefront means source handle OR logic.

### Edit value modal

Value row click opens edit modal.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Red                                                              [Save] │
├────────────────────────────────────────────────────────────────────────────┤
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Identity                                                   │      │
│        │ Label *                    Slug *                          │      │
│        │ [Red                     ] [red                          ] │      │
│        │ Enabled                                                    │      │
│        │ [x]                                                        │      │
│        └────────────────────────────────────────────────────────────┘      │
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Linked source values                         [Edit links] │      │
│        │ red, dark-red, wine-red, burgundy                         │      │
│        └────────────────────────────────────────────────────────────┘      │
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Swatch                                                    │      │
│        │ ● #D92D20                                                  │      │
│        └────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

In Phase 1, the swatch section is display-only. Creating or editing swatches
from the value modal is Phase 2.

### Create value modal

Facet row action `Create value` opens `create-facet-value-modal` for
`TAG`, `FEATURE` and `OPTION` facets only.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Create value: Color                                             [Create] │
├────────────────────────────────────────────────────────────────────────────┤
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Identity                                                   │      │
│        │ Label *                    Slug *                          │      │
│        │ [Red                     ] [red                          ] │      │
│        │ Enabled                                                    │      │
│        │ [x]                                                        │      │
│        └────────────────────────────────────────────────────────────┘      │
│        ┌────────────────────────────────────────────────────────────┐      │
│        │ Linked source values *                                    │      │
│        │ [ red ]                                                    │      │
│        │ [+ Add handle]                                             │      │
│        └────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

Create value rules:

- payload contains `facetId`, `facetLabel`, `facetType`, and optional
  `nextSortIndex`;
- `facetId` is the GraphQL global id from `ApiFacet.id`;
- form mapper converts values to `ApiFacetValueCreateInput`;
- `sourceHandles` are trimmed, empty handles are removed, and local duplicates
  are collapsed before submit;
- if no handle remains, block submit with a local form error;
- on success refetches `FACET_GRID_QUERY`, resets rows from server data and
  expands the parent facet.

`edit-facet-value-modal` uses the same form sections and mapper family, but maps
to `ApiFacetValueUpdateInput` and does not send `facetId` because the current
API does not allow moving a value between facets.

### Link source values modal: Phase 1

Phase 1 edits manual handle strings only. It does not query real tag handles,
feature slugs or option value slugs.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Link source values: Red                                         [Save]  │
├────────────────────────────────────────────────────────────────────────────┤
│ Source handles                                                            │
│ [ red ] [ dark-red ] [ wine-red ] [ burgundy ]                            │
│ [+ Add handle]                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Behavior:

- user manually adds/removes handle strings;
- trim whitespace and drop empty strings before save;
- local duplicate handles inside the edited value are collapsed or rejected;
- save writes `FacetValue.sourceHandles`;
- empty linked handles is invalid for `TAG`, `FEATURE`, `OPTION`;
- duplicate/ambiguous handles across values should be shown from backend
  `userErrors` when the API returns field-level errors;
- if the backend only returns a generic/unmapped error for a DB uniqueness
  constraint, keep the edit, show it in `submitErrors`, and do not clear the row.

Phase 1 must not silently assume duplicate source-handle errors are always
field-mapped. A later backend improvement can map known DB constraint names to
`field: ["sourceHandles"]`; the UI error mapper must already handle both mapped
and unmapped cases.

### Link source values modal: Phase 2

Phase 2 replaces or enhances the manual editor with a source picker backed by
real source entity queries.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Link source values: Red                                         [Save]  │
├────────────────────────────────────────────────────────────────────────────┤
│ [Search option values...]                                                │
│                                                                            │
│ ┌──────────────────────────────────┐ ┌─────────────────────────────────┐  │
│ │ Available source values          │ │ Linked to "Red"                 │  │
│ ├──────────────────────────────────┤ ├─────────────────────────────────┤  │
│ │ [ ] red                          │ │ [x] red                         │  │
│ │ [ ] dark-red                     │ │ [x] dark-red                    │  │
│ │ [ ] wine-red                     │ │ [x] wine-red                    │  │
│ │ [ ] burgundy                     │ │ [x] burgundy                    │  │
│ │ [disabled] blue - used by Blue   │ │                                 │  │
│ └──────────────────────────────────┘ └─────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

Phase 2 behavior:

- left list is built from real source entities;
- manual handle entry remains available because backend stores strings;
- already linked handles are disabled and show the public value that owns them;
- candidate lists are searched independently from the facet grid query.

### Merge selected values

Merge is Phase 2. Phase 1 can keep row selection for future use, but must not
show a merge action until the merge flow is implemented.

Selecting several child value rows under the same facet enables:

```text
[Merge into one value]
```

Flow:

1. user selects values `Red`, `Dark red`, `Wine red`;
2. modal asks target public label/slug or lets the user choose an existing
   target value under the same facet;
3. source handles from all selected values are linked to the target value;
4. source handles are not deleted from old values by merge itself;
5. old values are not deleted by merge. They may be disabled only as an explicit
   user choice after confirmation;
6. unmerge remains possible because original values and source handles stay
   available for later relinking.

This is the explicit UX for connecting several public values into one public
storefront option without manually copying handles. Physical delete is a
separate destructive action and is not part of merge.

## Swatches

Swatches are managed from value rows/modals, not as first-class rows in the main
grid. Phase 1 displays existing swatches from GraphQL data but does not create
or edit them. Swatch create/edit UI and swatch mutation hooks are Phase 2.

Create/edit swatch:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Create swatch                                                 [Create] │
├────────────────────────────────────────────────────────────────────────────┤
│ Type: [COLOR] [GRADIENT] [IMAGE]                                          │
│                                                                            │
│ Color one     [#D92D20]                                                    │
│ Color two     [disabled for COLOR]                                         │
│ Image         [Select from media library]                                  │
│ Preview       ●                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- `COLOR`: `colorOne`;
- `GRADIENT`: `colorOne`, `colorTwo`;
- `IMAGE`: `fileId` from media picker;
- metadata stays hidden/advanced until a concrete use case appears.

## Validation

Facet:

- `label` required;
- `slug` required and valid slug;
- `facetType` required on create and immutable after create;
- `uiType` must be valid for `facetType`;
- `sortIndex >= 0`.

Allowed UI types:

| Facet type | UI types |
| --- | --- |
| `PRICE` | `RANGE` |
| `TAG` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `FEATURE` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `OPTION` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `IN_STOCK` | `BOOLEAN` |

Even if GraphQL enum values technically allow other combinations, Admin UI must
hide invalid combinations and only send domain-valid pairs. `PRICE` is a
computed range facet, and `IN_STOCK` is a computed availability boolean.

Facet value:

- allowed only under `TAG`, `FEATURE`, `OPTION`;
- `label` required;
- `slug` required and valid slug;
- `sourceHandles` required and non-empty;
- local duplicate `sourceHandles` inside one edited value are normalized before
  submit;
- cross-value duplicate/ambiguous `sourceHandles` are backend-owned. The UI maps
  backend `userErrors` to `value.sourceHandles` when field information is
  present, otherwise it shows the error as a submit-level error and keeps local
  edits;
- `swatchId` nullable;
- `enabled` defaults to true;
- value rows cannot be root rows.

Form validation:

- create/edit facet and value modals use `react-hook-form` + `zodResolver`;
- schemas live next to the modal (`schema.ts`);
- form types live next to the modal or in a mapper-owned type file, not in
  GraphQL operation files;
- form mappers create `ApiFacetCreateInput`, `ApiFacetUpdateInput`,
  `ApiFacetValueCreateInput` and `ApiFacetValueUpdateInput`;
- API output objects remain generated API types from `@/graphql/types`.

## GraphQL integration

Follow `knowledge/vault/patterns/admin-graphql-layer.md`:

- generated API types are imported directly from `@/graphql/types`;
- hooks unwrap `catalogQuery`/`catalogMutation`;
- mappers convert form/grid edits to API inputs;
- no API-output view models for server data;
- UI-local row models are allowed for the tree grid and editor state.

GraphQL files:

```text
admin/src/domains/inventory/facets/graphql/
  fragments.ts
  queries.ts
  mutations.ts
  operation-types.ts
  index.ts
```

Phase 1 hook files:

```text
admin/src/domains/inventory/facets/hooks/
  use-facets.ts
  use-facet.ts
  use-facet-value.ts
  use-create-facet.ts
  use-update-facet.ts
  use-delete-facet.ts
  use-create-facet-value.ts
  use-update-facet-value.ts
  use-delete-facet-value.ts
  use-save-facet-grid-edits.ts
  use-save-facet-order.ts
  use-facet-grid-edit-store.ts
  use-facet-tree-rows.ts
  use-facet-order-tree-rows.ts
  index.ts
```

Phase 1 modal files:

```text
admin/src/domains/inventory/facets/modals/
  create-facet-modal/
    create-facet-modal.tsx
    schema.ts
    types.ts
  edit-facet-modal/
    edit-facet-modal.tsx
    schema.ts
    types.ts
  edit-facet-order-modal/
    edit-facet-order-modal.tsx
    schema.ts
    types.ts
  create-facet-value-modal/
    create-facet-value-modal.tsx
    schema.ts
    types.ts
  edit-facet-value-modal/
    edit-facet-value-modal.tsx
    schema.ts
    types.ts
  link-source-values-modal/
    link-source-values-modal.tsx
    schema.ts
    types.ts
```

Every modal folder exports its component through `index.ts`.

Phase 2 adds swatch mutation hooks:

```text
use-create-facet-swatch.ts
use-update-facet-swatch.ts
use-delete-facet-swatch.ts
```

Phase 1 still reads `FacetValue.swatch` through grid/detail fragments for
display.

Mapper files:

```text
admin/src/domains/inventory/facets/mappers/
  facet-grid-row.mapper.ts
  facet-grid-edit.mapper.ts
  facet-order.mapper.ts
  facet-input.mapper.ts
  facet-value-input.mapper.ts
  facet-errors.mapper.ts
  index.ts
```

Phase 2 adds `facet-swatch-input.mapper.ts`. It is not needed for the Phase 1
read-only swatch preview.

`facet-grid-row.mapper.ts` converts generated API objects to UI-local
`FacetGridRow[]`. This is allowed because `FacetGridRow` is editor state, not an
API-output view model for component props.

`facet-grid-edit.mapper.ts` converts zustand `fieldEdits` to mutation inputs:

- facet row edits -> `ApiFacetUpdateInput`;
- value row edits -> `ApiFacetValueUpdateInput`;

`facet-order.mapper.ts` converts modal-local order edits to mutation inputs:

- Phase 1 facet order edits -> `ApiFacetUpdateInput`;
- Phase 2 value order edits -> `ApiFacetValueUpdateInput`.

`facet-input.mapper.ts` converts create/edit facet modal forms to
`ApiFacetCreateInput`/`ApiFacetUpdateInput`.

`facet-value-input.mapper.ts` converts create/edit value and link-source modal
forms to `ApiFacetValueCreateInput`/`ApiFacetValueUpdateInput`.

In Phase 2, swatch modal forms map to `ApiFacetSwatchCreateInput` or
`ApiFacetSwatchUpdateInput`.

### Modal registration

`admin/src/domains/inventory/facets/modals.ts` defines:

- `FACET_CREATE_MODAL_TYPE`;
- `FACET_EDIT_MODAL_TYPE`;
- `FACET_ORDER_EDIT_MODAL_TYPE`;
- `FACET_VALUE_CREATE_MODAL_TYPE`;
- `FACET_VALUE_EDIT_MODAL_TYPE`;
- `FACET_VALUE_LINK_SOURCES_MODAL_TYPE`;
- Phase 2 constants for merge and swatch modals.

It also augments `ModalStackPayloads` and exports typed hooks:

- `useCreateFacetModal`;
- `useEditFacetModal`;
- `useEditFacetOrderModal`;
- `useCreateFacetValueModal`;
- `useEditFacetValueModal`;
- `useLinkSourceValuesModal`.

`admin/src/domains/modals.tsx` must register dynamic imports for every Phase 1
modal type before the page can open them.

### Fragments

`fragments.ts`:

```graphql
fragment FacetSwatchFields on FacetSwatch {
  id
  swatchType
  colorOne
  colorTwo
  file {
    id
    url
    altText
    originalName
  }
  metadata
}

fragment FacetValueGridFields on FacetValue {
  id
  label
  slug
  sortIndex
  enabled
  sourceHandles
  swatch {
    ...FacetSwatchFields
  }
}

fragment FacetGridFields on Facet {
  id
  label
  slug
  facetType
  uiType
  selectionMode
  sortIndex
  sourceHandles
  values {
    ...FacetValueGridFields
  }
}
```

Use existing shared `UserErrorFields` fragment if available in the admin
GraphQL shared fragments.

### Queries

Initial query should load facets with nested values. It has no pagination
variables because the page tree and order modal need the full ordered set:

```graphql
query FacetGrid {
  catalogQuery {
    facets {
      ...FacetGridFields
    }
  }
}
```

Additional detail queries:

```graphql
query FacetDetails($id: ID!) {
  catalogQuery {
    facet(id: $id) {
      ...FacetGridFields
    }
  }
}

query FacetValueDetails($id: ID!) {
  catalogQuery {
    facetValue(id: $id) {
      ...FacetValueGridFields
      facet {
        id
        facetType
      }
    }
  }
}
```

Phase 1 linked source modal does not require source candidate queries. It edits
manual handle strings and saves them to `FacetValue.sourceHandles`.

Phase 2 adds source candidate queries for real tag handles, feature slugs and
option value slugs. Those queries must stay separate from the facet grid query,
because candidate lists can be searched independently inside the link modal.

### Mutations

`mutations.ts` defines one operation per API mutation. Every mutation requests
`userErrors`.

```graphql
mutation FacetCreate($input: FacetCreateInput!) {
  catalogMutation {
    facetCreate(input: $input) {
      facet {
        ...FacetGridFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}

mutation FacetUpdate($input: FacetUpdateInput!) {
  catalogMutation {
    facetUpdate(input: $input) {
      facet {
        ...FacetGridFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}

mutation FacetDelete($input: FacetDeleteInput!) {
  catalogMutation {
    facetDelete(input: $input) {
      deletedFacetId
      userErrors {
        ...UserErrorFields
      }
    }
  }
}

mutation FacetValueCreate($input: FacetValueCreateInput!) {
  catalogMutation {
    facetValueCreate(input: $input) {
      facetValue {
        ...FacetValueGridFields
        facet {
          id
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}

mutation FacetValueUpdate($input: FacetValueUpdateInput!) {
  catalogMutation {
    facetValueUpdate(input: $input) {
      facetValue {
        ...FacetValueGridFields
        facet {
          id
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}

mutation FacetValueDelete($input: FacetValueDeleteInput!) {
  catalogMutation {
    facetValueDelete(input: $input) {
      deletedFacetValueId
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Swatch mutations are Phase 2:

- `FACET_SWATCH_CREATE_MUTATION`;
- `FACET_SWATCH_UPDATE_MUTATION`;
- `FACET_SWATCH_DELETE_MUTATION`.

They request `facetSwatch { ...FacetSwatchFields }` or
`deletedFacetSwatchId`, plus `userErrors`.

### Hook contracts

`useFacets()`:

```ts
interface UseFacetsReturn {
  facets: ApiFacet[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

Implementation details:

- owns `useQuery(FACET_GRID_QUERY)`;
- unwraps `data.catalogQuery.facets`;
- returns an empty array while data is missing;
- should use `fetchPolicy: "cache-and-network"` for responsive page reloads.

Mutation hooks follow the admin GraphQL pattern:

```ts
interface UseFacetMutationReturn<TInput, TResult> {
  mutate: (input: TInput) => Promise<{
    data: TResult | null;
    userErrors: ApiGenericUserError[];
  }>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

Public method names may be domain-specific:

- `createFacet(input)`;
- `updateFacet(input)`;
- `deleteFacet(input)`;
- `createFacetValue(input)`;
- `updateFacetValue(input)`;
- `deleteFacetValue(input)`;

Phase 2 adds:

- `createFacetSwatch(input)`;
- `updateFacetSwatch(input)`;
- `deleteFacetSwatch(input)`.

Hooks unwrap `catalogMutation.*` and never expose raw GraphQL operation nesting
to page components.

### Save hook integration

`useSaveFacetGridEdits()` receives:

```ts
interface UseSaveFacetGridEditsOptions {
  refetchFacets: () => Promise<unknown>;
  resetRowsFromServer: (nextRows: FacetGridRow[]) => void;
}
```

Save algorithm:

1. read `fieldEdits` from `useFacetGridEditStore.getState()`;
2. build one `ApiFacetUpdateInput` per edited facet row;
3. build one `ApiFacetValueUpdateInput` per edited value row;
4. call `startSaving()`;
5. run mutations sequentially: facets first, then facet values;
6. after each successful mutation, remove that row edit from the store;
7. if a mutation returns `userErrors`, map them to `rowErrors[rowId]` when the
   row id is known, otherwise to `submitErrors`;
8. stop on first failing mutation for Phase 1;
9. if all mutations succeed, call `onSubmitAccepted()`, refetch facets, reset
    rows from fresh server data, and show success message;
10. always call `finishSaving()` in `finally`.

`useSaveFacetOrder()` receives:

```ts
interface UseSaveFacetOrderOptions {
  refetchFacets: () => Promise<unknown>;
  resetRowsFromServer: (nextRows: FacetGridRow[]) => void;
  onSaved: () => void;
}
```

Order save algorithm:

1. read modal-local order edits;
2. build one `ApiFacetUpdateInput` per edited facet row in Phase 1;
3. build one `ApiFacetValueUpdateInput` per edited value row in Phase 2;
4. run mutations sequentially;
5. keep the modal open and show row/submit errors on first failing mutation;
6. if all mutations succeed, refetch facets, reset rows from fresh server data,
   clear modal-local order edits, call `onSaved()`, and show success message.

Sequential save is acceptable for Phase 1. Do not add a fake bulk operation in
the frontend. If ordering becomes slow, add a backend bulk/reorder mutation in a
later phase.

### Cache and refetch strategy

First implementation uses refetch, not manual `cache.modify`:

- after create facet -> refetch `FACET_GRID_QUERY`;
- after update facet modal save -> refetch `FACET_GRID_QUERY`;
- after delete facet -> refetch `FACET_GRID_QUERY`;
- after create/update/delete facet value -> refetch `FACET_GRID_QUERY`;
- after order modal save -> refetch `FACET_GRID_QUERY`;
- Phase 2: after swatch create/update/delete -> refetch `FACET_GRID_QUERY` if
  any visible value can display the swatch;
- after grid batch save -> refetch `FACET_GRID_QUERY`.

Rationale: facets are unpaginated, ordering-sensitive, and nested. Manual cache
updates can be added later only after the page behavior stabilizes.

### Error mapping

`facet-errors.mapper.ts` maps `ApiGenericUserError.field` to UI targets:

| API field | UI target |
| --- | --- |
| `label` | `facet.label` or `value.label` |
| `slug` | `facet.slug` or `value.slug` |
| `uiType` | `facet.uiType` |
| `selectionMode` | `facet.selectionMode` |
| `sortIndex` | order modal row |
| `sourceHandles` | link source values modal / `value.sourceHandles` |
| `swatchId` | Phase 2 swatch cell / swatch modal |

If the field path is missing or cannot be mapped, place the error in
`submitErrors`.

## Implementation phases

Phase 1:

- `store` sidebar registration and route `/:orgName/:storeName/facets`;
- main `Facet -> FacetValue` AG Grid;
- client-side search/filter state for `FilterWidget`;
- `useFacetTreeRows` with shared flat-tree mechanics and no DnD on the main
  page;
- `edit-facet-order-modal` with the same flat tree table and facet-row DnD;
- `useFacetOrderTreeRows` with facet-specific reorder constraints;
- no group rows or group UI;
- zustand page/edit store with bottom `FloatingPanelStack` save/discard;
- GraphQL fragments, queries, mutations, hooks and mappers for facets and
  values;
- read-only swatch display from `FacetValue.swatch` in query fragments;
- `useSaveFacetGridEdits` sequential save integration;
- `useSaveFacetOrder` sequential save integration for the order modal;
- create facet modal;
- edit facet modal;
- create facet value modal;
- value row editing modal;
- global modal registry entries in `admin/src/domains/modals.tsx`;
- actions column with Delete;
- linked source handles modal with manual handle editing.

Phase 2:

- source picker backed by real tag/feature/option queries;
- merge selected values flow;
- swatch create/edit from value modal, swatch mutation hooks and
  `facet-swatch-input.mapper.ts`;
- value DnD inside the order modal and only within the same facet.

Phase 3:

- dedicated bulk/reorder backend mutation if sequential updates become too slow;
- optional value move between compatible facets if backend adds safe support;
- storefront listing preview with counts when API exposes configured listing
  facets;
- translations UI for labels;
