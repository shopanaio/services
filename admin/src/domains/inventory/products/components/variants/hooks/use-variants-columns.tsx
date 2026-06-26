import { useMemo, useRef, useState } from "react";
import { Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ColDef, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { useVariantsEditorStore } from "./use-variants-editor-store";
import {
  VARIANT_COLUMNS,
  MEDIA_COLUMNS,
  createOptionColumns,
} from "../config";
import type {
  IVariantEditorRow,
  IOptionGroup,
  VariantColumnField,
} from "../config/types";
import type { ApiProductOption, CurrencyCode } from "@/graphql/types";
import { Dash } from "@/shared/components/editor-grid";
import {
  ImageCellRenderer,
  TitleCellRenderer,
  TextCellRenderer,
  NumberCellRenderer,
  PriceCellRenderer,
} from "../components/cell-renderers";
import { formatCurrencySymbol } from "../../../utils/price-formatting";

// ============================================================================
// Types
// ============================================================================

export interface UseVariantsColumnsOptions {
  optionGroups: IOptionGroup[];
  productOptions?: ApiProductOption[];
  currency?: CurrencyCode | null;
  /**
   * When provided, only these columns will be available.
   * If undefined, all columns are available (with user visibility settings).
   */
  availableColumns?: VariantColumnField[];
  /**
   * When provided, controls which available columns can be edited.
   * If undefined, each column uses its own config editability.
   */
  editableColumns?: VariantColumnField[];
  /**
   * When true, column visibility is controlled by availableColumns only,
   * ignoring user settings. Useful for restricted views.
   */
  ignoreUserSettings?: boolean;
  onEditMedia?: (rowId: string, selectedRowIds?: string[]) => void;
  onOptionValueChange?: (
    rowId: string,
    optionId: string,
    optionValueId: string,
  ) => void;
}

interface OptionDropdownCellProps {
  row: IVariantEditorRow;
  option: ApiProductOption;
  onChange?: (rowId: string, optionId: string, optionValueId: string) => void;
}

function OptionDropdownCell({
  row,
  option,
  onChange,
}: OptionDropdownCellProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const selectedValueId = row.selectedOptionValueIds[option.id];
  const selectedValue = option.values.find((value) => value.id === selectedValueId);
  const items: MenuProps["items"] = [...option.values]
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((value) => ({
      key: value.id,
      label: value.name,
    }));

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => {
          onChange?.(row.id, option.id, key);
          setOpen(false);
        },
      }}
      trigger={["contextMenu"]}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) setOpen(false);
      }}
      dropdownRender={(menu) => (
        <div style={{ width: triggerRef.current?.offsetWidth }}>{menu}</div>
      )}
    >
      <div
        ref={triggerRef}
        onDoubleClick={() => setOpen(true)}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 11px",
          gap: 8,
        }}
        data-testid={`variants-editor-cell-option-${option.id}-${row.id}`}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedValue?.name ?? <Dash />}
        </span>
        <DownOutlined style={{ fontSize: 10, color: "rgba(0, 0, 0, 0.25)" }} />
      </div>
    </Dropdown>
  );
}

// ============================================================================
// Price fields
// ============================================================================

const PRICE_FIELDS = new Set(["price", "compareAtPrice"]);

function getColumnHeaderName(
  headerName: string,
  field: string,
  currency: CurrencyCode | null | undefined,
): string {
  if (PRICE_FIELDS.has(field) && currency) {
    return `${headerName} (${formatCurrencySymbol(currency)})`;
  }

  return headerName;
}

// ============================================================================
// Get cell renderer based on column type and field
// ============================================================================

function getCellRenderer(type?: string) {
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
      return { min: 0, precision: 2 };
    case "weight":
    case "length":
    case "width":
    case "height":
      return { min: 1, precision: 0 };
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

function createValueSetter(field: string, editable: boolean) {
  return (params: ValueSetterParams<IVariantEditorRow>): boolean => {
    const { data, newValue } = params;
    if (!data || !editable) return false;

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

  const {
    optionGroups,
    productOptions = [],
    availableColumns,
    editableColumns,
    ignoreUserSettings = false,
    currency,
    onEditMedia,
    onOptionValueChange,
  } = normalizedOptions;

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
        headerName: getColumnHeaderName(
          col.headerName,
          col.field,
          currency,
        ),
        width: col.width,
        minWidth: 80,
        cellRenderer: ImageCellRenderer,
        cellRendererParams: {
          onEditMedia,
        },
      });
    }

    // Option columns (dynamic) - only show when not restricted or when user settings allow
    if (!ignoreUserSettings) {
      const productOptionsByName = new Map(
        productOptions.map((option) => [option.name, option]),
      );
      const optionCols = createOptionColumns(optionGroups);
      for (const col of optionCols) {
        if (!isOptionColumnVisible(col.headerName)) continue;

        const optionName = col.headerName;
        const productOption = productOptionsByName.get(optionName);
        columns.push({
          colId: col.field,
          headerName: col.headerName,
          width: col.width,
          minWidth: col.minWidth,
          cellClass: productOption ? "variant-option-cell-dropdown" : undefined,
          valueGetter: (params) => {
            if (productOption) {
              return params.data?.selectedOptionValueIds[productOption.id] ?? null;
            }

            const option = params.data?.options.find((item) => item.name === optionName);
            return option?.value ?? null;
          },
          cellRenderer: (params: { data?: IVariantEditorRow; value?: unknown }) => {
            if (!params.data) {
              return null;
            }

            if (productOption) {
              return (
                <OptionDropdownCell
                  row={params.data}
                  option={productOption}
                  onChange={onOptionValueChange}
                />
              );
            }

            return (
              <span data-testid={`variants-editor-cell-option-${optionName}-${params.data.id}`}>
                {params.value === null || params.value === undefined || params.value === ""
                  ? <Dash />
                  : String(params.value)}
              </span>
            );
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
        : getCellRenderer(col.type);
      const isEditable =
        col.editable &&
        (!editableColumns ||
          editableColumns.includes(col.field as VariantColumnField));

      columns.push({
        field: col.field as keyof IVariantEditorRow,
        headerName: getColumnHeaderName(
          col.headerName,
          col.field,
          currency,
        ),
        colId: PRICE_FIELDS.has(col.field)
          ? `${col.field}-${currency ?? "none"}`
          : col.field,
        width: col.width,
        minWidth: col.minWidth,
        flex: col.flex,
        type: getColumnType(col.type),
        editable: isEditable,
        cellRenderer,
        cellRendererParams: PRICE_FIELDS.has(col.field)
          ? {
              currency,
            }
          : undefined,
        cellEditor: getCellEditor(col.type),
        cellEditorParams: getCellEditorParams(col.field),
        valueGetter: createValueGetter(col.field),
        valueSetter: createValueSetter(col.field, isEditable),
      });
    }

    return columns;
  }, [
    columnVisibility,
    optionGroups,
    productOptions,
    isOptionColumnVisible,
    availableColumns,
    editableColumns,
    ignoreUserSettings,
    currency,
    onEditMedia,
    onOptionValueChange,
  ]);
}
