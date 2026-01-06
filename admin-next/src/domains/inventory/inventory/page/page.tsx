"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Image, Typography, Flex, Button, Tooltip, App } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  CellClickedEvent,
  GridStateModule,
  CellValueChangedEvent,
  ValueSetterParams,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/CursorPagination";
import { useGridState } from "@/hooks";
import { filterSchema } from "./filterSchema";
import { useInventory, useInventoryEditStore } from "../hooks";
import type { IInventoryListItem } from "../mocks/inventory-list";
import {
  EditableNumberCell,
  CalculatedAvailableCell,
  InventoryActionBar,
} from "../components";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const ProductCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { data } = props;
  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      <Image
        src={data.image}
        alt={data.productName}
        width={40}
        height={40}
        style={{ borderRadius: 4, objectFit: "cover" }}
        preview={false}
      />
      <Flex vertical gap={0}>
        <Typography.Text strong style={{ lineHeight: 1.3 }}>
          {data.productName}
        </Typography.Text>
        {data.variantName && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {data.variantName}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
};

const ReservedCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { value } = props;
  return (
    <Flex
      align="center"
      justify="flex-end"
      style={{ width: "100%", paddingRight: 4 }}
    >
      <Tooltip title="Managed by order system">
        <Typography.Text>{value}</Typography.Text>
      </Tooltip>
    </Flex>
  );
};

const OnHandCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => <EditableNumberCell {...props} field="onHand" />;

const UnavailableCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => <EditableNumberCell {...props} field="unavailable" />;

export default function InventoryPage() {
  const gridRef = useRef<AgGridReact<IInventoryListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { data: inventoryData, refetch } = useInventory();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "inventory-grid-state",
  });

  const { hasChanges, discardAll, startSaving, onSaveSuccess, trackChange, originalValues } =
    useInventoryEditStore();
  const { message } = App.useApp();

  const handleDiscard = useCallback(() => {
    // Restore original values from Zustand store
    const api = gridRef.current?.api;
    if (api) {
      Object.entries(originalValues).forEach(([itemId, fields]) => {
        const rowNode = api.getRowNode(itemId);
        if (rowNode && rowNode.data) {
          Object.entries(fields).forEach(([field, change]) => {
            if (change) {
              rowNode.data[field as keyof typeof rowNode.data] = change.originalValue;
            }
          });
          // Recalculate available
          rowNode.data.available =
            rowNode.data.onHand - rowNode.data.unavailable - rowNode.data.reserved;
        }
      });
      api.refreshCells({ force: true });
    }
    discardAll();
  }, [discardAll, originalValues]);

  const handleSave = useCallback(async () => {
    startSaving();

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In a real app, send changes to API here

    onSaveSuccess();
    await refetch();
  }, [startSaving, onSaveSuccess, refetch]);

  const inventoryValueSetter = useCallback(
    (params: ValueSetterParams<IInventoryListItem>) => {
      const { data, colDef, oldValue, newValue } = params;
      if (!data || oldValue === newValue) return false;

      const field = colDef.field as "onHand" | "unavailable";
      const newVal = Number(newValue);

      // Calculate what available would be
      const testOnHand = field === "onHand" ? newVal : data.onHand;
      const testUnavailable = field === "unavailable" ? newVal : data.unavailable;
      const newAvailable = testOnHand - testUnavailable - data.reserved;

      if (newAvailable < 0) {
        message.error("This change would result in negative availability");
        return false;
      }

      // AG Grid requires mutation in valueSetter
      data[field] = newVal;
      data.available = newAvailable;
      return true;
    },
    [message]
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IInventoryListItem>) => {
      const { data, colDef, oldValue, newValue } = event;
      if (!data || oldValue === newValue) return;

      const field = colDef.field as "onHand" | "unavailable";
      if (field === "onHand" || field === "unavailable") {
        trackChange(data.id, field, oldValue);
        // Refresh available cell to show updated value
        gridRef.current?.api?.refreshCells({
          rowNodes: [event.node],
          columns: ["available"],
          force: true,
        });
      }
    },
    [trackChange]
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
        minWidth: 280,
      },
      {
        headerName: "SKU",
        field: "sku",
        width: 130,
      },
      {
        headerName: "On hand",
        field: "onHand",
        cellRenderer: OnHandCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        valueSetter: inventoryValueSetter,
        editable: true,
        width: 130,
        type: "rightAligned",
      },
      {
        headerName: "Unavailable",
        field: "unavailable",
        cellRenderer: UnavailableCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        valueSetter: inventoryValueSetter,
        editable: true,
        width: 130,
        type: "rightAligned",
      },
      {
        headerName: "Reserved",
        field: "reserved",
        cellRenderer: ReservedCellRenderer,
        width: 130,
        type: "rightAligned",
      },
      {
        headerName: "Available",
        field: "available",
        cellRenderer: CalculatedAvailableCell,
        minWidth: 130,
        flex: 1,
        type: "rightAligned",
        resizable: false,
      },
    ],
    [inventoryValueSetter]
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
      count={inventoryData.length}
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

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }}>
          <AgGridReact<IInventoryListItem>
            ref={gridRef}
            rowData={inventoryData}
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
            onCellClicked={handleCellClick}
            onCellValueChanged={handleCellValueChanged}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            stopEditingWhenCellsLoseFocus
          />
        </div>

        {hasChanges() ? (
          <InventoryActionBar onSave={handleSave} onDiscard={handleDiscard} />
        ) : (
          <CursorPagination
            total={inventoryData.length}
            rangeStart={1}
            rangeEnd={Math.min(20, inventoryData.length)}
            pageSize={20}
            hasNext={inventoryData.length > 20}
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
