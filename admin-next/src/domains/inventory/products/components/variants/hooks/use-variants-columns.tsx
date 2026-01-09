import { useMemo } from "react";
import type { ColDef, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { useVariantsEditorStore } from "./use-variants-editor-store";
import {
  VARIANT_COLUMNS,
  MEDIA_COLUMNS,
  createOptionColumns,
  type IVariantEditorRow,
  type IOptionGroup,
  type VariantColumnField,
} from "../config";
import {
  ImageCellRenderer,
  TitleCellRenderer,
  TextCellRenderer,
  NumberCellRenderer,
  PriceCellRenderer,
  ReservedCellRenderer,
  AvailableCellRenderer,
} from "../components/cell-renderers";

// ============================================================================
// Types
// ============================================================================

export interface UseVariantsColumnsOptions {
  optionGroups: IOptionGroup[];
  /**
   * When provided, only these columns will be available.
   * If undefined, all columns are available (with user visibility settings).
   */
  availableColumns?: VariantColumnField[];
  /**
   * When true, column visibility is controlled by availableColumns only,
   * ignoring user settings. Useful for restricted views.
   */
  ignoreUserSettings?: boolean;
}

// ============================================================================
// Price fields
// ============================================================================

const PRICE_FIELDS = new Set(["price", "compareAtPrice", "costPrice"]);

// ============================================================================
// Get cell renderer based on column type and field
// ============================================================================

function getCellRenderer(type?: string, field?: string) {
  // Special renderers for inventory fields
  if (field === "reserved") return ReservedCellRenderer;
  if (field === "available") return AvailableCellRenderer;

  switch (type) {
    case "number":
      return NumberCellRenderer;
    case "text":
      return TextCellRenderer;
    default:
      return undefined;
  }
}

// ============================================================================
// Get cell editor based on column type
// ============================================================================

function getCellEditor(type?: string) {
  switch (type) {
    case "number":
      return "agNumberCellEditor";
    case "text":
      return "agTextCellEditor";
    default:
      return "agTextCellEditor";
  }
}

// ============================================================================
// Get column alignment type
// ============================================================================

function getColumnType(type?: string): string | undefined {
  switch (type) {
    case "number":
      return "rightAligned";
    default:
      return undefined;
  }
}

// ============================================================================
// Get cell editor params
// ============================================================================

function getCellEditorParams(field: string) {
  switch (field) {
    case "price":
    case "compareAtPrice":
    case "costPrice":
      return { min: 0, precision: 2 };
    case "onHand":
    case "unavailable":
      return { min: 0, precision: 0 };
    case "weight":
    case "length":
    case "width":
    case "height":
      return { min: 0, precision: 2 };
    default:
      return undefined;
  }
}

// ============================================================================
// Value getter - get value from store (edited) or data (original)
// ============================================================================

function createValueGetter(field: string) {
  return (params: ValueGetterParams<IVariantEditorRow>) => {
    const { data } = params;
    if (!data) return null;

    // Get edited value from store, or fall back to original
    const edit = useVariantsEditorStore
      .getState()
      .getFieldEdit(data.id, field);

    return edit ? edit.currentValue : (data as unknown as Record<string, unknown>)[field];
  };
}

// ============================================================================
// Value setter - save to store
// Validation is done in handleSetFieldValue in VariantsEditorGrid
// ============================================================================

function createValueSetter(field: string) {
  return (params: ValueSetterParams<IVariantEditorRow>): boolean => {
    const { data, newValue } = params;
    if (!data) return false;

    const originalValue = (data as unknown as Record<string, unknown>)[field];

    useVariantsEditorStore
      .getState()
      .setFieldValue(data.id, field, originalValue, newValue);

    return true;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useVariantsColumns(
  options: UseVariantsColumnsOptions
): ColDef<IVariantEditorRow>[];
export function useVariantsColumns(
  optionGroups: IOptionGroup[]
): ColDef<IVariantEditorRow>[];
export function useVariantsColumns(
  optionsOrOptionGroups: UseVariantsColumnsOptions | IOptionGroup[]
): ColDef<IVariantEditorRow>[] {
  // Normalize arguments
  const normalizedOptions: UseVariantsColumnsOptions = Array.isArray(optionsOrOptionGroups)
    ? { optionGroups: optionsOrOptionGroups }
    : optionsOrOptionGroups;

  const { optionGroups, availableColumns, ignoreUserSettings = false } = normalizedOptions;

  const columnVisibility = useVariantsEditorStore((s) => s.columnVisibility);
  const isOptionColumnVisible = useVariantsEditorStore(
    (s) => s.isOptionColumnVisible
  );

  return useMemo(() => {
    const columns: ColDef<IVariantEditorRow>[] = [];

    // Fixed: Title column (always pinned left)
    columns.push({
      field: "title",
      headerName: "Title",
      flex: 1,
      minWidth: 250,
      cellRenderer: TitleCellRenderer,
      pinned: "left",
    });

    // Variant Media column (toggleable like other columns)
    for (const col of MEDIA_COLUMNS) {
      // Check if column is available (if restricted)
      if (availableColumns && !availableColumns.includes(col.field as VariantColumnField)) {
        continue;
      }

      // Check visibility: either use user settings or availableColumns as the source of truth
      if (!ignoreUserSettings && !columnVisibility[col.field]) {
        continue;
      }

      columns.push({
        field: col.field as keyof IVariantEditorRow,
        headerName: col.headerName,
        width: col.width,
        cellRenderer: ImageCellRenderer,
        sortable: false,
        resizable: false,
      });
    }

    // Option columns (dynamic) - only show when not restricted or when user settings allow
    if (!ignoreUserSettings) {
      const optionCols = createOptionColumns(optionGroups);
      for (const col of optionCols) {
        if (!isOptionColumnVisible(col.headerName)) continue;

        const optionName = col.headerName;
        columns.push({
          colId: col.field,
          headerName: col.headerName,
          width: col.width,
          minWidth: col.minWidth,
          valueGetter: (params) => {
            const option = params.data?.options.find((o) => o.name === optionName);
            return option?.value ?? "";
          },
        });
      }
    }

    // Variant columns
    for (const col of VARIANT_COLUMNS) {
      // Check if column is available (if restricted)
      if (availableColumns && !availableColumns.includes(col.field as VariantColumnField)) {
        continue;
      }

      // Check visibility: either use user settings or availableColumns as the source of truth
      if (!ignoreUserSettings && !columnVisibility[col.field]) {
        continue;
      }

      // Use appropriate renderer based on field type
      const cellRenderer = PRICE_FIELDS.has(col.field)
        ? PriceCellRenderer
        : getCellRenderer(col.type, col.field);

      columns.push({
        field: col.field as keyof IVariantEditorRow,
        headerName: col.headerName,
        width: col.width,
        minWidth: col.minWidth,
        flex: col.flex,
        type: getColumnType(col.type),
        editable: col.editable,
        cellRenderer,
        cellEditor: getCellEditor(col.type),
        cellEditorParams: getCellEditorParams(col.field),
        valueGetter: createValueGetter(col.field),
        valueSetter: createValueSetter(col.field),
      });
    }

    return columns;
  }, [columnVisibility, optionGroups, isOptionColumnVisible, availableColumns, ignoreUserSettings]);
}
