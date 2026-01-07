"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Flex, Button, App } from "antd";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  CellClickedEvent,
  GridStateModule,
  CellEditRequestEvent,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/CursorPagination";
import { useGridState } from "@/hooks";
import { filterSchema } from "./filterSchema";
import { useInventory, useInventoryEditStore } from "../hooks";
import { validateFieldChange } from "@/shared/utils/inventory";
import type { IInventoryListItem } from "../mocks/inventory-list";
import {
  CalculatedAvailableCell,
  InventoryActionBar,
  ProductCellRenderer,
  ReservedCellRenderer,
  OnHandCellRenderer,
  UnavailableCellRenderer,
} from "../components";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    flex: 1,
    "& .ag-cell-editor input": {
      textAlign: "right",
      paddingRight: token.padding,
    },
  },
  gridContainer: {
    height: "100%",
    paddingBottom: token.padding,
    display: "flex",
    flexDirection: "column",
  },
}));

export default function InventoryPage() {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<IInventoryListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { data: serverData, refetch } = useInventory();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "inventory-grid-state",
  });

  const {
    hasChanges,
    discardAll,
    startSaving,
    onSaveSuccess,
    setFieldValue,
    edits,
  } = useInventoryEditStore();
  const { message } = App.useApp();

  // Compute display data by merging server data with pending edits
  const displayData = useMemo(() => {
    return serverData.map((item) => {
      const itemEdits = edits[item.id];
      if (!itemEdits) return item;

      const onHand = itemEdits.onHand?.currentValue ?? item.onHand;
      const unavailable =
        itemEdits.unavailable?.currentValue ?? item.unavailable;
      const available = onHand - unavailable - item.reserved;

      return {
        ...item,
        onHand,
        unavailable,
        available,
      };
    });
  }, [serverData, edits]);

  const handleDiscard = useCallback(() => {
    discardAll();
  }, [discardAll]);

  const handleSave = useCallback(async () => {
    startSaving();

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In a real app, send edits to API here

    onSaveSuccess();
    await refetch();
  }, [startSaving, onSaveSuccess, refetch]);

  const handleCellEditRequest = useCallback(
    (event: CellEditRequestEvent<IInventoryListItem>) => {
      const { data, colDef, newValue } = event;
      if (!data) return;

      const field = colDef.field as "onHand" | "unavailable";
      if (field !== "onHand" && field !== "unavailable") return;

      // Find original server data
      const serverItem = serverData.find((item) => item.id === data.id);
      if (!serverItem) return;

      // Get current values (from edits or original server data)
      const currentEdits = edits[data.id];
      const currentOnHand =
        currentEdits?.onHand?.currentValue ?? serverItem.onHand;
      const currentUnavailable =
        currentEdits?.unavailable?.currentValue ?? serverItem.unavailable;

      // Validate using shared validator
      const result = validateFieldChange(field, Number(newValue), {
        onHand: currentOnHand,
        unavailable: currentUnavailable,
        reserved: serverItem.reserved,
        available: currentOnHand - currentUnavailable - serverItem.reserved,
      });

      if (!result.isValid) {
        message.error(result.errors[0]?.message || "Invalid value");
        return;
      }

      // Store edit in Zustand (original value from server, new value from edit)
      const originalValue = serverItem[field];
      setFieldValue(data.id, field, originalValue, Number(newValue));
    },
    [message, setFieldValue, edits, serverData]
  );

  const handleCellClick = (event: CellClickedEvent<IInventoryListItem>) => {
    if (event.column.getColId() === "ag-Grid-SelectionColumn") {
      event.node.setSelected(!event.node.isSelected());
    }
  };

  const columnDefs = useMemo<ColDef<IInventoryListItem>[]>(
    () => [
      {
        headerName: "Product",
        field: "productName",
        cellRenderer: ProductCellRenderer,
        flex: 2,
        minWidth: 300,
      },
      {
        headerName: "SKU",
        field: "sku",
        minWidth: 120,
      },
      {
        headerName: "On hand",
        field: "onHand",
        cellRenderer: OnHandCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        editable: true,
        minWidth: 120,
        type: "rightAligned",
      },
      {
        headerName: "Unavailable",
        field: "unavailable",
        cellRenderer: UnavailableCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        editable: true,
        minWidth: 120,
        type: "rightAligned",
      },
      {
        headerName: "Reserved",
        field: "reserved",
        cellRenderer: ReservedCellRenderer,
        minWidth: 120,
        type: "rightAligned",
      },
      {
        headerName: "Available",
        field: "available",
        cellRenderer: CalculatedAvailableCell,
        minWidth: 120,
        flex: 1,
        type: "rightAligned",
        resizable: false,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  return (
    <DataLayout
      name="inventory"
      title="Inventory"
      count={displayData.length}
      actions={
        <Flex gap="small">
          <Button>Export</Button>
          <Button>Import</Button>
        </Flex>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...widgetProps}
            searchProps={{
              searchValue,
              onChangeSearchValue: setSearchValue,
            }}
          />
        }
      />

      <div className={styles.gridContainer}>
        <div className={styles.gridWrapper}>
          <AgGridReact<IInventoryListItem>
            ref={gridRef}
            rowData={displayData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            rowSelection={{
              mode: "multiRow",
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: false,
            }}
            selectionColumnDef={{
              cellStyle: { display: "flex", alignItems: "center" },
            }}
            suppressMovableColumns
            readOnlyEdit
            onCellEditRequest={handleCellEditRequest}
            onCellClicked={handleCellClick}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            stopEditingWhenCellsLoseFocus
          />
        </div>

        {hasChanges() ? (
          <InventoryActionBar onSave={handleSave} onDiscard={handleDiscard} />
        ) : (
          <CursorPagination
            total={displayData.length}
            rangeStart={1}
            rangeEnd={Math.min(20, displayData.length)}
            pageSize={20}
            hasNext={displayData.length > 20}
            hasPrev={false}
            onNext={() => {}}
            onPrev={() => {}}
            onPageSizeChange={() => {}}
          />
        )}
      </div>
    </DataLayout>
  );
}
