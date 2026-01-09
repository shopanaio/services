"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import { createStyles } from "antd-style";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import type { IEntityPickerContentProps, IPickableEntity } from "./types";

ModuleRegistry.registerModules([AllCommunityModule, RowSelectionModule]);

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    minHeight: 0,
    flex: 1,
  },
  toolbar: {
    padding: `0 ${token.padding}px`,
    paddingTop: token.paddingSM,
    flexShrink: 0,
  },
  gridContainer: {
    flex: 1,
    minHeight: 400,
    width: "100%",
    padding: `${token.paddingSM}px ${token.padding}px`,
  },
  pagination: {
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    padding: `0 ${token.padding}px`,
    flexShrink: 0,
  },
}));

export function EntityPickerContent<T extends IPickableEntity>({
  config,
  selectionMode,
  initialSelection,
  excludeIds,
  onSelectionChange,
}: IEntityPickerContentProps<T>) {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<T>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [isGridReady, setIsGridReady] = useState(false);

  // Filter state
  const { widgetProps, filters } = useFilters({
    schema: config.filterSchema,
  });

  // Data fetching via config hook
  const { data, isLoading, pagination, onNext, onPrev, onPageSizeChange } =
    config.useData({
      filters,
      search: searchValue,
      pageSize,
    });

  // Filter out excluded IDs
  const filteredData = useMemo(() => {
    if (!excludeIds.length) return data;
    return data.filter((item) => !excludeIds.includes(config.getRowId(item)));
  }, [data, excludeIds, config]);

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<T>) => {
      const selectedRows = event.api.getSelectedRows();
      const selectedIds = selectedRows.map((row) => config.getRowId(row));
      onSelectionChange(selectedIds, selectedRows);
    },
    [config, onSelectionChange]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      onPageSizeChange(size);
    },
    [onPageSizeChange]
  );

  // Set initial selection when grid is ready
  useEffect(() => {
    if (!isGridReady || !initialSelection.length) return;

    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (node.data && initialSelection.includes(config.getRowId(node.data))) {
        node.setSelected(true);
      }
    });
  }, [isGridReady, initialSelection, config]);

  const handleGridReady = useCallback(() => {
    setIsGridReady(true);
  }, []);

  return (
    <div className={styles.container}>
      {/* Toolbar with filters */}
      <div className={styles.toolbar}>
        <FilterWidget
          {...widgetProps}
          searchProps={{
            searchValue,
            onChangeSearchValue: setSearchValue,
          }}
          searchPlaceholder={`Search ${config.entityNamePlural.toLowerCase()}...`}
        />
      </div>

      {/* AG Grid */}
      <div className={styles.gridContainer}>
        <AgGridReact<T>
          ref={gridRef}
          rowData={filteredData}
          columnDefs={config.columns}
          getRowId={(params) => config.getRowId(params.data)}
          rowHeight={52}
          headerHeight={40}
          rowSelection={{
            mode: selectionMode === "single" ? "singleRow" : "multiRow",
            checkboxes: true,
            headerCheckbox: selectionMode === "multi",
            enableClickSelection: false,
          }}
          selectionColumnDef={{
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          suppressCellFocus
          suppressMovableColumns
          onSelectionChanged={handleSelectionChanged}
          onGridReady={handleGridReady}
          rowStyle={{ cursor: "pointer" }}
          loading={isLoading}
          defaultColDef={{
            resizable: true,
            sortable: false,
            cellStyle: { display: "flex", alignItems: "center" },
          }}
        />
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <CursorPagination
          total={pagination.total}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          pageSize={pagination.pageSize}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onNext={onNext}
          onPrev={onPrev}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
