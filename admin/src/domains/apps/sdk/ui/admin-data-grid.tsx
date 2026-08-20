"use client";

import { AgGridReact } from "ag-grid-react";
import { useAgGridTheme } from "@/hooks";
import type { AdminDataGridProps } from "../contracts";

export function AdminDataGrid<TRowData>({
  height = 420,
  rowData,
  columnDefs,
  ...props
}: AdminDataGridProps<TRowData>) {
  const theme = useAgGridTheme();

  return (
    <div style={{ height, minHeight: 0 }}>
      <AgGridReact<TRowData>
        {...props}
        theme={theme}
        rowData={[...rowData]}
        columnDefs={[...columnDefs]}
      />
    </div>
  );
}
