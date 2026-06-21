"use client";

import { useMemo, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ColDef,
  GridStateModule,
  ModuleRegistry,
  RowSelectionModule,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import {
  RelayCursorPagination,
  useRelayCursorPagination,
} from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, useGridState } from "@/hooks";
import type { ApiPageInfo } from "@/graphql/types";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

interface WarehouseRow {
  id: string;
  name: string;
  location: string;
  stockItems: number;
  status: string;
}

const emptyPageInfo: ApiPageInfo = {
  __typename: "PageInfo",
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

const useStyles = createStyles(({ token }) => ({
  gridContainer: {
    height: "100%",
    paddingBottom: token.padding,
    display: "flex",
    flexDirection: "column",
  },
  gridWrapper: {
    flex: 1,
    minHeight: 0,
  },
}));

export default function WarehousePage() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<WarehouseRow>>(null);
  const pagination = useRelayCursorPagination({ defaultPageSize: 20 });
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "warehouse-grid-state",
  });

  const rowData = useMemo<WarehouseRow[]>(() => [], []);

  const columnDefs = useMemo<ColDef<WarehouseRow>[]>(
    () => [
      {
        headerName: "Warehouse",
        field: "name",
        flex: 2,
        minWidth: 240,
      },
      {
        headerName: "Location",
        field: "location",
        flex: 2,
        minWidth: 220,
      },
      {
        headerName: "Stock items",
        field: "stockItems",
        minWidth: 140,
        type: "rightAligned",
      },
      {
        headerName: "Status",
        field: "status",
        minWidth: 140,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout name="warehouse" title="Warehouse" count={0}>
      <div className={styles.gridContainer}>
        <div className={styles.gridWrapper} data-testid="warehouse-table">
          <AgGridReact<WarehouseRow>
            ref={gridRef}
            theme={agGridTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            suppressMovableColumns
            initialState={initialState}
            onStateUpdated={onStateUpdated}
          />
        </div>

        <RelayCursorPagination
          name="warehouse"
          pagination={pagination}
          pageInfo={emptyPageInfo}
          totalCount={0}
          loadedRowsCount={rowData.length}
        />
      </div>
    </DataLayout>
  );
}
