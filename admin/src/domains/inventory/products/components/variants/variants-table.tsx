"use client";

import { useMemo, useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  CellValueChangedEvent,
  GetRowIdParams,
} from "ag-grid-community";
import { useAgGridTheme } from "@/hooks";
import { Dash } from "@/shared/components/editor-grid";

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// Types
// ============================================================================

export interface IVariantOption {
  title: string;
  group: {
    slug: string;
    title: string;
  };
}

export interface IVariantRowBase {
  id: string;
  title: string;
  options: Record<string, string>; // groupSlug -> optionTitle
}

export interface IOptionGroup {
  slug: string;
  title: string;
}

export interface IVariantsTableProps<T extends IVariantRowBase> {
  rowData: T[];
  additionalColumns: ColDef<T>[];
  optionGroups: IOptionGroup[];
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  domLayout?: "normal" | "autoHeight" | "print";
  pinnedTitle?: boolean;
  showOptions?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    width: "100%",
    minHeight: 300,
    "& .ag-header-cell": {
      fontSize: 12,
    },
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
    },
    // Transparent resize handles (visible on hover), full height
    "& .ag-header-cell-resize": {
      opacity: 0,
      transition: "opacity 0.2s",
      height: "100%",
      top: 0,
      "&:hover": {
        opacity: 1,
      },
    },
    "& .ec-dash": {
      display: "inline-block",
      width: 24,
      height: 4,
      backgroundColor: token.colorBorder,
      borderRadius: 2,
      verticalAlign: "middle",
    },
  },
}));

// ============================================================================
// Component
// ============================================================================

export function VariantsTable<T extends IVariantRowBase>({
  rowData,
  additionalColumns,
  optionGroups,
  onCellValueChanged,
  domLayout = "autoHeight",
  pinnedTitle = true,
  showOptions = false,
}: IVariantsTableProps<T>) {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<T>>(null);

  // Build column definitions
  const columnDefs = useMemo<ColDef<T>[]>(() => {
    const cols: ColDef<T>[] = [
      {
        headerName: "Title",
        field: "title",
        flex: 1.5,
        minWidth: 250,
        pinned: pinnedTitle ? "left" : undefined,
      } as ColDef<T>,
    ];

    // Add dynamic option columns only when showOptions is true
    if (showOptions) {
      optionGroups.forEach((group) => {
        cols.push({
          headerName: group.title,
          valueGetter: (params) =>
            (params.data as IVariantRowBase)?.options[group.slug] || null,
          cellRenderer: ({ value }: { value?: unknown }) =>
            value == null ? <Dash /> : <span>{String(value)}</span>,
          flex: 1,
          minWidth: 120,
        });
      });
    }

    // Add additional columns such as pricing or shipping attributes.
    cols.push(...additionalColumns);

    // Make the last column non-resizable
    if (cols.length > 0) {
      cols[cols.length - 1] = { ...cols[cols.length - 1], resizable: false };
    }

    return cols;
  }, [optionGroups, additionalColumns, pinnedTitle, showOptions]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
    }),
    []
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<T>) => params.data.id,
    []
  );

  return (
    <div className={styles.gridWrapper}>
      <AgGridReact<T>
        ref={gridRef}
        theme={agGridTheme}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        onCellValueChanged={onCellValueChanged}
        animateRows
        suppressMovableColumns
        domLayout={domLayout}
      />
    </div>
  );
}

// ============================================================================
// Utility: Extract option groups from variants
// ============================================================================

export function extractOptionGroups<T extends { options?: IVariantOption[] }>(
  variants: T[]
): IOptionGroup[] {
  const groupsMap = new Map<string, string>();

  variants.forEach((variant) => {
    variant.options?.forEach((opt) => {
      if (!groupsMap.has(opt.group.slug)) {
        groupsMap.set(opt.group.slug, opt.group.title);
      }
    });
  });

  return Array.from(groupsMap.entries()).map(([slug, title]) => ({
    slug,
    title,
  }));
}

// ============================================================================
// Utility: Transform variants to row data
// ============================================================================

export function variantsToRowData<
  TVariant extends { id: string; title: string; options?: IVariantOption[] },
  TExtra extends Record<string, unknown>
>(
  variants: TVariant[],
  extraFields: (variant: TVariant) => TExtra
): (IVariantRowBase & TExtra)[] {
  return variants.map((variant) => {
    const options: Record<string, string> = {};
    variant.options?.forEach((opt) => {
      options[opt.group.slug] = opt.title;
    });

    return {
      id: variant.id,
      title: variant.title,
      options,
      ...extraFields(variant),
    };
  });
}
