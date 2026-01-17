"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Flex, Button, App } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
  CellEditRequestEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import {
  FloatingPanelStack,
  type PanelConfig,
  type ActionConfig,
} from "@/ui-kit/floating-panel-stack";
import { useGridState, useAgGridTheme, useAgGridRowSelection } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useInventory, useInventoryEditStore } from "../hooks";
import { validateFieldChange } from "@/shared/utils/inventory";
import type { IInventoryListItem } from "@/mocks/inventory/inventory-list";
import {
  CalculatedAvailableCell,
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
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<IInventoryListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { data: serverData, refetch } = useInventory();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "inventory-grid-state",
  });

  const {
    hasChanges,
    getChangesCount,
    discardAll,
    startSaving,
    onSaveSuccess,
    setFieldValue,
    edits,
    status,
  } = useInventoryEditStore();
  const { message } = App.useApp();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IInventoryListItem>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedIds(selectedRows.map((row) => row.id));
    },
    []
  );

  // Deselect all rows
  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedIds([]);
  }, []);

  // Delete selected items
  const handleDeleteSelected = useCallback(() => {
    // TODO: Implement delete mutation
    console.log("Delete items:", selectedIds);
    deselectAll();
  }, [selectedIds, deselectAll]);

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

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<IInventoryListItem>();

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

  // Build selection actions
  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleDeleteSelected,
      },
    ],
    [handleDeleteSelected]
  );

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (hasChanges()) {
      result.push({
        type: "editing",
        changesCount: getChangesCount(),
        hasChanges: true,
        saving: status === "saving",
        onSave: handleSave,
        onCancel: handleDiscard,
      });
    }

    if (selectedIds.length > 0) {
      // eslint-disable-next-line react-hooks/refs -- deselectAll is called on click, not during render
      result.push({
        type: "selection",
        count: selectedIds.length,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }

    return result;
  }, [
    hasChanges,
    getChangesCount,
    status,
    handleSave,
    handleDiscard,
    selectedIds.length,
    selectionActions,
    deselectAll,
  ]);

  // Block pagination when editing
  const canNavigate = !hasChanges() && status !== "saving";

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
            theme={agGridTheme}
            rowData={displayData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressMovableColumns
            readOnlyEdit
            onCellEditRequest={handleCellEditRequest}
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            stopEditingWhenCellsLoseFocus
          />
        </div>

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
          disabled={!canNavigate}
          disabledReason="Save or discard changes to navigate"
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
