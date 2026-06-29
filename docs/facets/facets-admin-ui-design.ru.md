# Facets: дизайн Admin UI

Документ проектирует страницу управления storefront facets в существующей
админке Shopana. Основа: `docs/facets/facets-data-model.ru.md`, текущие
inventory pages, `edit-attributes-modal` и inventory inline editing.

Актуальная модель UI: основная таблица является двумерной AG Grid структурой
`Facet -> FacetValue`.

- `Facet` - parent row.
- `FacetValue` - child row.
- `FacetGroup` в этой странице не участвует: группы не показываются, не
  редактируются и не влияют на DnD.
- Если backend поле `groupId` остается в `Facet`, UI не отправляет его при
  обычном редактировании. На create можно оставлять `groupId: null`.

Tree/DnD поведение должно повторять `edit-attributes-modal`, но persistence
pending edits должен повторять inventory page: zustand state и нижняя save
panel.

## Навигация

Раздел: `Inventory`.

Пункт меню: `Facets`.

URL:

```text
/:orgName/:storeName/inventory/facets
```

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
    edit-facet-value-modal/
    link-source-values-modal/
    merge-facet-values-modal/
    edit-facet-swatch-modal/
  graphql/
  hooks/
    use-facet-grid-edit-store.ts
    use-facet-tree-rows.ts
  mappers/
```

## Основная страница

Страница строится как остальные inventory list pages:

- `DataLayout` с `title="Facets"`;
- в header одна primary action кнопка `Create`;
- сверху `DataLayout.Toolbar` с `FilterWidget`: search + filters;
- внутри `AgGridReact`;
- снизу `FloatingPanelStack` с editing panel, когда есть pending changes.

`CursorPagination` для основной таблицы не нужен, если backend отдает все
facets и values: reorder требует полный набор строк. Если позже facets станет
слишком много, нужно добавлять dedicated server-side reorder API, а не
пагинировать текущий drag table.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Facets                                                            [+ Create] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search facets and values...] [Source v] [UI type v] [Has values v] [Reset] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Facet / Value                 Source    UI        Linked sources  ⋯     │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ ▸ [facet] Price               PRICE     RANGE     Automatic       ⋯     │ │
│ │ ▸ [facet] Availability        IN_STOCK  BOOLEAN   Automatic       ⋯     │ │
│ │ ▾ [facet] Color               OPTION    CHECKBOX  12 values       ⋯     │ │
│ │   ⋮⋮ Red                      value     enabled   4 linked        ⋯     │ │
│ │   ⋮⋮ Blue                     value     enabled   2 linked        ⋯     │ │
│ │   ⋮⋮ Burgundy                 value     disabled  1 linked        ⋯     │ │
│ │ ▾ [facet] Brand               TAG       DROPDOWN  24 values       ⋯     │ │
│ │   ⋮⋮ Nike                     value     enabled   nike            ⋯     │ │
│ │   ⋮⋮ Adidas                   value     enabled   adidas          ⋯     │ │
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
- `FacetGroup` is ignored by this row model.

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
| `Swatch` | empty or count summary | swatch preview | opens swatch picker/modal |
| `Order` | `sortIndex` | `sortIndex` | facet order, value order |
| `Actions` | menu | menu | no |

Actions is always the rightmost column.

### Name cell

Reuse the visual pattern from
`admin/src/domains/inventory/products/modals/edit-attributes-modal/components/name-cell-renderer.tsx`:

- indent by `level * 24`;
- expand/collapse icon for facet rows with values;
- facet icon for parent rows;
- value/tag icon for child rows;
- row drag handle on the same first column;
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

## DnD behavior

Do not implement a second drag model from scratch. Facets need a dedicated
facet-tree hook that reuses the same flat tree mechanics as
`useTreeTableDragDrop`, but adds facet-specific DnD constraints and server row
resync behavior.

Hook file:

```text
admin/src/domains/inventory/facets/hooks/use-facet-tree-rows.ts
```

The hook owns the facet page row tree:

- `allRows`;
- `visibleRows`;
- `expandedIds`;
- expand/collapse handlers;
- AG Grid row drag handlers;
- row reset from latest server rows after discard/refetch;
- facet-only reorder in Phase 1;
- optional same-facet value reorder in Phase 2.

It must reuse the common algorithmic parts from
`useTreeTableDragDrop`: flat `allRows`, derived `visibleRows`, manual expansion,
sorting by `sortIndex`, row class calculation, collapse-on-parent-drag and
restore expansion after drag. If this creates duplication, extract the shared
flat-tree helpers from `useTreeTableDragDrop` instead of forking the logic
silently.

Use facets as the hook "group" rows internally:

```text
useFacetTreeRows({
  initialRows,
  onReorderEdit: setReorderValue,
  onInvalidMove: showWarning,
  valueDragMode: "disabled",
})
```

Required grid setup:

```text
ModuleRegistry.registerModules([AllCommunityModule, RowDragModule, GridStateModule])

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

Shared mechanics inherited from `edit-attributes-modal`:

- `onRowDragEnter` stores `expandedBeforeDragRef`;
- if dragged row has `type === groupType`, all parent rows collapse by
  `setExpandedIds(new Set())`;
- for facets this means dragging a `Facet` collapses all facets;
- dragging a `FacetValue` does not collapse all facets;
- `onRowDragEnd` reads current grid visual order through
  `event.api.forEachNodeAfterFilterAndSort`;
- it walks rows top-to-bottom and keeps `currentGroupId`;
- when the row is a facet, it becomes a root row and receives next root
  `sortIndex`;
- when value DnD is enabled and the row is a value, the candidate visual order
  is validated before local rows are committed;
- after row updates, previous expanded state is restored;
- valid reorder writes a `reorderEdit` to zustand.

Facet-specific constraints in `useFacetTreeRows()`:

- `FacetValue` is never a root row. It must always stay under its owning
  `Facet`.
- Phase 1 disables value row dragging completely. Only `Facet` rows get a drag
  handle and only facet `sortIndex` changes are persisted.
- When value DnD is enabled, it is same-facet only: dragging a `FacetValue` can
  only change its `sortIndex` among sibling values of the same `Facet`.
- If the visual order produced by `useTreeTableDragDrop` would place a
  `FacetValue` outside its original `Facet` subtree, before any `Facet`, or under
  another `Facet`, revert the move to the previous row state and show a warning:
  `Facet values can only be reordered inside their facet`.
- `FacetValue` cannot be dropped under `PRICE` or `IN_STOCK`.
- Moving values across facets is not supported by this UI. It would require a
  later explicit flow because current API input does not expose `facetId` on
  `facetValueUpdate`.
- Facet DnD updates `Facet.sortIndex`.
- Value DnD inside same facet updates `FacetValue.sortIndex`.

The generic `useTreeTableDragDrop` configuration is not enough for these rules:
it only accepts `initialRows`, `groupType`, `onRowsChange` and
`initiallyExpandAll`, and it currently allows child rows to become root rows or
move under another parent. Facets therefore must not call it directly from the
page without facet-specific guarding.

Extra page rule:

- DnD is enabled only when search/filter/sort is cleared. Reordering a filtered
  subset would persist incorrect `sortIndex`. If user starts drag with active
  filters, show warning and block drag: `Clear filters before reordering facets`.

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

For facets use attributes grid for tree/DnD and inventory page for pending
persistence:

- grid uses `readOnlyEdit`;
- cell edits are captured in `onCellEditRequest`;
- pending changes live in zustand;
- server rows are merged with pending edits for display;
- bottom `FloatingPanelStack` editing panel appears when edits exist;
- `Save` sends all pending changes;
- `Discard` clears local edits.

DnD is the exception: `useTreeTableDragDrop` still updates `allRows` locally so
the user immediately sees moved rows. Every valid DnD update also writes a
`reorderEdit` into zustand. Discard resets `allRows` from latest server rows and
clears `reorderEdits`.

Do not use `onCellValueChanged` as the only source of pending field edits,
because page-level save/discard needs original/current values like inventory.

### Zustand page state

Zustand store is page-local draft state, not an API cache. Server data remains
owned by Apollo query hooks. The page derives grid rows from:

```text
catalogQuery.facets response
  + pending field edits from zustand
  + pending reorder edits from zustand
  -> FacetGridRow[]
  -> useTreeTableDragDrop visibleRows
```

Store file:

```text
admin/src/domains/inventory/facets/hooks/use-facet-grid-edit-store.ts
```

Responsibilities:

- keep unsaved field edits;
- keep unsaved reorder edits;
- keep row-level API validation errors;
- keep submit-level API errors;
- keep page editing status;
- keep selected value row ids for merge actions;
- expose selectors for bottom save panel and cell renderers;
- reset itself when user discards, save succeeds, or page unmounts.

The store must not keep `ApiFacet[]` or replace Apollo cache. API objects are
read directly from GraphQL hooks, then merged with drafts at the display
boundary.

### Store shape

```ts
type FacetGridRowKind = "facet" | "value";

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

interface FacetGridReorderEdit {
  rowKind: FacetGridRowKind;
  parentId: string | null;
  originalParentId: string | null;
  originalSortIndex: number;
  sortIndex: number;
}

interface FacetGridEditStore {
  fieldEdits: Partial<
    Record<FacetGridRowId, Partial<Record<FacetGridEditableField, FacetGridFieldEdit>>>
  >;
  reorderEdits: Partial<Record<FacetGridRowId, FacetGridReorderEdit>>;
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
  setReorderValue: (rowId: FacetGridRowId, edit: FacetGridReorderEdit) => void;
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
  getAllReorderEdits: () => FacetGridEditStore["reorderEdits"];
}
```

`rowId` for store:

- facet: `facet:${apiId}`;
- value: `value:${apiId}`.

`discardRow(rowId)` removes accepted field/reorder edits and row errors for one
row. It is used by `useSaveFacetGridEdits()` after a row mutation succeeds.

`setFieldValue` follows the inventory edit store behavior:

- if `currentValue` equals `originalValue`, remove that field edit;
- if a row has no more field edits and no reorder edit, remove the row entry;
- clear `rowErrors[rowId]` and `submitErrors` when the user changes that row
  again;
- arrays such as `sourceHandles` compare by normalized content, not by reference.

`setReorderValue` follows the same cleanup rule:

- if `parentId` and `sortIndex` match the original values, remove the reorder
  edit;
- otherwise store the latest pending order for that row;
- for Phase 1, only `rowKind: "facet"` reorder edits are produced;
- for Phase 2, `rowKind: "value"` is allowed only inside the original parent
  facet.

### Page state flow

Page component responsibilities:

1. call `useFacets()` to load server facets;
2. map server facets to base `FacetGridRow[]`;
3. merge base rows with `fieldEdits` and `reorderEdits`;
4. pass merged rows into `useFacetTreeRows()`;
5. render `visibleRows` in AG Grid;
6. render bottom `FloatingPanelStack` when `hasChanges()` is true.

`useFacetTreeRows()` is a thin wrapper around `useTreeTableDragDrop`:

- owns `allRows`, `visibleRows`, `expandedIds`, and expand/collapse handlers;
- receives merged rows from server + zustand drafts;
- calls `setReorderValue` after every valid DnD change;
- exposes `resetRowsFromServer()` for Discard and successful refetch;
- keeps value DnD disabled in Phase 1.

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

### Save flow

Save maps local state to backend mutations:

1. facet field edits -> `facetUpdate`;
2. value field edits -> `facetValueUpdate`;
3. facet reorder -> `facetUpdate({ id, sortIndex })`;
4. value reorder inside same facet -> `facetValueUpdate({ id, sortIndex })`.

For first implementation, sequential mutations are acceptable because API has
no bulk reorder mutation. If a mutation fails:

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

It reads `fieldEdits` and `reorderEdits`, groups them by row kind, maps them to
GraphQL inputs, and calls the generated mutation hooks sequentially.

### Cell editing by column

| Column | Edit handling |
| --- | --- |
| facet label | text editor -> `facet.label` |
| facet slug | text editor -> `facet.slug` |
| facet UI | select editor constrained by `facetType` |
| facet selection | select editor constrained by `uiType` |
| facet order | numeric editor -> `facet.sortIndex` |
| value label | text editor -> `value.label` |
| value slug | text editor -> `value.slug` |
| value enabled | boolean renderer/editor -> `value.enabled` |
| linked sources | opens link source values modal -> `value.sourceHandles` |
| swatch | opens swatch picker/modal -> `value.swatchId` |

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
│ │ Order              [4]                                               │   │
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
│        │ Swatch                                      [Edit swatch] │      │
│        │ ● #D92D20                                                  │      │
│        └────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Link source values modal

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

Behavior:

- left list is built from real source entities when available;
- manual handle entry remains available because backend stores strings;
- already linked handles are disabled and show the public value that owns them;
- save writes `FacetValue.sourceHandles`;
- empty linked handles is invalid for `TAG`, `FEATURE`, `OPTION`.

### Merge selected values

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
grid.

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
- `groupId` is not exposed in UI;
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
- duplicate/ambiguous source handle errors come from backend `userErrors`;
- `swatchId` nullable;
- `enabled` defaults to true;
- value rows cannot be root rows.

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

Hook files:

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
  use-create-facet-swatch.ts
  use-update-facet-swatch.ts
  use-delete-facet-swatch.ts
  use-save-facet-grid-edits.ts
  use-facet-grid-edit-store.ts
  use-facet-tree-rows.ts
  index.ts
```

Mapper files:

```text
admin/src/domains/inventory/facets/mappers/
  facet-grid-row.mapper.ts
  facet-grid-edit.mapper.ts
  facet-input.mapper.ts
  facet-value-input.mapper.ts
  facet-swatch-input.mapper.ts
  facet-errors.mapper.ts
  index.ts
```

`facet-grid-row.mapper.ts` converts generated API objects to UI-local
`FacetGridRow[]`. This is allowed because `FacetGridRow` is editor state, not an
API-output view model for component props.

`facet-grid-edit.mapper.ts` converts zustand `fieldEdits` and `reorderEdits` to
mutation inputs:

- facet row edits -> `ApiFacetUpdateInput`;
- value row edits -> `ApiFacetValueUpdateInput`;
- swatch modal form -> `ApiFacetSwatchCreateInput` or
  `ApiFacetSwatchUpdateInput`;
- create/edit modal forms -> create/update inputs.

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
variables because the reorder table needs the full ordered set:

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

No `facetGroups` query is required for this UI.

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

Swatch mutations:

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
  resetRowsFromServer: () => void;
}
```

Save algorithm:

1. read `fieldEdits` and `reorderEdits` from
   `useFacetGridEditStore.getState()`;
2. build one `ApiFacetUpdateInput` per edited facet row;
3. build one `ApiFacetValueUpdateInput` per edited value row;
4. merge field and reorder updates for the same row into one mutation input;
5. call `startSaving()`;
6. run mutations sequentially: facets first, then facet values;
7. after each successful mutation, remove that row edit from the store;
8. if a mutation returns `userErrors`, map them to `rowErrors[rowId]` when the
   row id is known, otherwise to `submitErrors`;
9. stop on first failing mutation for Phase 1;
10. if all mutations succeed, call `onSubmitAccepted()`, refetch facets, reset
    rows from fresh server data, and show success message;
11. always call `finishSaving()` in `finally`.

Sequential save is acceptable for Phase 1. Do not add a fake bulk operation in
the frontend. If ordering becomes slow, add a backend bulk/reorder mutation in a
later phase.

### Cache and refetch strategy

First implementation uses refetch, not manual `cache.modify`:

- after create facet -> refetch `FACET_GRID_QUERY`;
- after update facet modal save -> refetch `FACET_GRID_QUERY`;
- after delete facet -> refetch `FACET_GRID_QUERY`;
- after create/update/delete facet value -> refetch `FACET_GRID_QUERY`;
- after swatch create/update/delete -> refetch `FACET_GRID_QUERY` if any visible
  value can display the swatch;
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
| `sortIndex` | reorder edit or `Order` cell |
| `sourceHandles` | link source values modal / `value.sourceHandles` |
| `swatchId` | swatch cell / swatch modal |

If the field path is missing or cannot be mapped, place the error in
`submitErrors`.

## Implementation phases

Phase 1:

- main `Facet -> FacetValue` AG Grid;
- `useTreeTableDragDrop` reuse with `groupType: "facet"`;
- no group rows or group UI;
- zustand page/edit store with bottom `FloatingPanelStack` save/discard;
- GraphQL fragments, queries, mutations, hooks and mappers for facets, values
  and swatches;
- `useSaveFacetGridEdits` sequential save integration;
- create facet modal;
- edit facet modal;
- value row editing modal;
- actions column with Delete;
- linked source handles modal with manual handle editing.

Phase 2:

- source picker backed by real tag/feature/option queries;
- merge selected values flow;
- swatch create/edit from value modal;
- value DnD inside same facet.

Phase 3:

- dedicated bulk/reorder backend mutation if sequential updates become too slow;
- optional value move between compatible facets if backend adds safe support;
- storefront listing preview with counts when API exposes configured listing
  facets;
- translations UI for labels;
