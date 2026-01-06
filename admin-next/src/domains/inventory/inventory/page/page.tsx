"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Button, Tooltip, App } from "antd";
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
  const { data: serverData, refetch } = useInventory();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "inventory-grid-state",
  });

  const { hasChanges, discardAll, startSaving, onSaveSuccess, setFieldValue, edits } =
    useInventoryEditStore();
  const { message } = App.useApp();

  // Compute display data by merging server data with pending edits
  const displayData = useMemo(() => {
    return serverData.map((item) => {
      const itemEdits = edits[item.id];
      if (!itemEdits) return item;

      const onHand = itemEdits.onHand?.currentValue ?? item.onHand;
      const unavailable = itemEdits.unavailable?.currentValue ?? item.unavailable;
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

      const newVal = Number(newValue);
      if (isNaN(newVal) || newVal < 0) {
        message.error("Value must be a non-negative number");
        return;
      }

      // Find original server data
      const serverItem = serverData.find((item) => item.id === data.id);
      if (!serverItem) return;

      // Get current values (from edits or original server data)
      const currentEdits = edits[data.id];
      const currentOnHand = currentEdits?.onHand?.currentValue ?? serverItem.onHand;
      const currentUnavailable = currentEdits?.unavailable?.currentValue ?? serverItem.unavailable;

      // Calculate what available would be
      const testOnHand = field === "onHand" ? newVal : currentOnHand;
      const testUnavailable = field === "unavailable" ? newVal : currentUnavailable;
      const newAvailable = testOnHand - testUnavailable - serverItem.reserved;

      if (newAvailable < 0) {
        message.error("This change would result in negative availability");
        return;
      }

      // Store edit in Zustand (original value from server, new value from edit)
      const originalValue = serverItem[field];
      setFieldValue(data.id, field, originalValue, newVal);
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
