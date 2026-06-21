"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Alert, App, Flex, Button } from "antd";
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
import {
  RelayCursorPagination,
  useRelayCursorPagination,
} from "@/ui-kit/cursor-pagination";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { ActionConfig } from "@/ui-kit/floating-panel-stack/core/types";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import {
  useGridState,
  useGridSort,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import type { SortModel } from "@/hooks/use-grid-sort";
import { filterSchema } from "./filter-schema";
import {
  useInventoryEditStore,
  useInventoryVariants,
  useSaveInventoryVariantEdits,
  type InventorySubmitError,
} from "../hooks";
import {
  mapInventoryVariantEditsToProductBulkUpdateInput,
  mapInventoryVariantSortModelToOrderBy,
  type InventoryVariantRow,
} from "../mappers";
import { validateFieldChange } from "@/shared/utils/inventory";
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
  errorPanel: {
    width: 520,
    maxWidth: "calc(100vw - 48px)",
  },
}));

function toSubmitError(error: unknown): InventorySubmitError {
  return {
    message:
      error instanceof Error
        ? error.message
        : "Failed to submit inventory changes.",
    code: "INVENTORY_SUBMIT_FAILED",
  };
}

function getFirstStoredError(
  submitErrors: InventorySubmitError[],
  rowErrors: Record<string, InventorySubmitError[]>,
) {
  return submitErrors[0] ?? Object.values(rowErrors).flat()[0] ?? null;
}

export default function InventoryPage() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<InventoryVariantRow>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [sortModel, setSortModel] = useState<SortModel[]>([]);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "inventory-grid-state",
  });

  const {
    discardAll,
    startSaving,
    finishSaving,
    onSubmitAccepted,
    setFieldValue,
    setRowErrors,
    clearRowErrors,
    setSubmitErrors,
    clearSubmitErrors,
    edits,
    rowErrors,
    submitErrors,
    status,
  } = useInventoryEditStore();
  const { message } = App.useApp();

  const hasUnsavedChanges = Object.keys(edits).length > 0;
  const canNavigate = !hasUnsavedChanges && status !== "saving";

  const orderBy = useMemo(
    () => mapInventoryVariantSortModelToOrderBy(sortModel),
    [sortModel],
  );
  const orderByResetKey = useMemo(() => JSON.stringify(orderBy), [orderBy]);
  const pagination = useRelayCursorPagination({
    defaultPageSize: 20,
    resetKey: orderByResetKey,
  });

  const {
    rows: serverData,
    defaultWarehouse,
    pageInfo,
    totalCount,
    loading,
    error,
    canEdit,
    refetch,
  } = useInventoryVariants({
    ...pagination.variables,
    orderBy,
  });
  const { saveInventoryVariantEdits } = useSaveInventoryVariantEdits();

  const handleSortChange = useCallback(
    (model: SortModel[]) => {
      if (!canNavigate) {
        message.warning("Save or discard changes to sort inventory.");
        return;
      }

      setSortModel(model);
    },
    [canNavigate, message],
  );

  const { onSortChanged } = useGridSort<InventoryVariantRow>({
    gridRef,
    sortModel,
    onSortChange: handleSortChange,
  });

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

  const clearStoredErrors = useCallback(() => {
    clearSubmitErrors();
    Object.keys(rowErrors).forEach((rowId) => clearRowErrors(rowId));
  }, [clearRowErrors, clearSubmitErrors, rowErrors]);

  const handleSave = useCallback(async () => {
    startSaving();
    clearStoredErrors();

    const mapping = mapInventoryVariantEditsToProductBulkUpdateInput(
      serverData,
      edits,
      defaultWarehouse?.id ?? null,
    );
    const hasRowErrors = Object.keys(mapping.rowErrors).length > 0;
    const hasSubmitErrors = mapping.submitErrors.length > 0;

    for (const [rowId, errors] of Object.entries(mapping.rowErrors)) {
      setRowErrors(rowId, errors);
    }

    if (hasRowErrors || hasSubmitErrors) {
      setSubmitErrors(mapping.submitErrors);
      finishSaving();

      const firstError =
        mapping.submitErrors[0] ??
        Object.values(mapping.rowErrors).flat()[0] ??
        null;
      message.error(firstError?.message ?? "Fix inventory errors before saving.");
      return;
    }

    try {
      const result = await saveInventoryVariantEdits(mapping.input);
      const apiErrors = result.userErrors.map((userError) => ({
        message: userError.message,
        code: userError.code,
        field: userError.field,
      }));

      if (!result.jobId && apiErrors.length > 0) {
        setSubmitErrors(apiErrors);
        finishSaving();
        message.error(apiErrors[0].message);
        return;
      }

      if (!result.jobId) {
        setSubmitErrors([
          {
            message: "Inventory update was not accepted.",
            code: "PRODUCT_BULK_UPDATE_NOT_ACCEPTED",
          },
        ]);
        finishSaving();
        message.error("Inventory update was not accepted.");
        return;
      }

      onSubmitAccepted();
      message.success(`Inventory update accepted. Job ${result.jobId}`);
      await refetch();
    } catch (submitError) {
      const normalizedError = toSubmitError(submitError);
      setSubmitErrors([normalizedError]);
      finishSaving();
      message.error(normalizedError.message);
    }
  }, [
    clearStoredErrors,
    defaultWarehouse?.id,
    edits,
    finishSaving,
    message,
    onSubmitAccepted,
    refetch,
    saveInventoryVariantEdits,
    serverData,
    setRowErrors,
    setSubmitErrors,
    startSaving,
  ]);

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<InventoryVariantRow>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedIds(selectedRows.map((row) => row.id));
    },
    [],
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
    (event: CellEditRequestEvent<InventoryVariantRow>) => {
      const { data, colDef, newValue } = event;
      if (!data) return;

      if (data.readOnly || !canEdit) {
        message.error(data.readOnlyReason ?? "This inventory row is read-only.");
        return;
      }

      const field = colDef.field as "onHand" | "unavailable";
      if (field !== "onHand" && field !== "unavailable") return;

      const parsedValue =
        typeof newValue === "number"
          ? newValue
          : Number.parseInt(String(newValue), 10);

      if (!Number.isInteger(parsedValue)) {
        message.error("Inventory quantity must be an integer.");
        return;
      }

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
      const result = validateFieldChange(field, parsedValue, {
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
      setFieldValue(data.id, field, originalValue, parsedValue);
    },
    [canEdit, message, setFieldValue, edits, serverData],
  );

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<InventoryVariantRow>();

  const columnDefs = useMemo<ColDef<InventoryVariantRow>[]>(
    () => [
      {
        headerName: "Product",
        field: "productTitle",
        cellRenderer: ProductCellRenderer,
        flex: 2,
        minWidth: 300,
        sortable: false,
      },
      {
        headerName: "SKU",
        field: "sku",
        minWidth: 120,
        sortable: false,
        valueFormatter: ({ value }) => value ?? "-",
      },
      {
        headerName: "On hand",
        field: "onHand",
        cellRenderer: OnHandCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        editable: ({ data }) => canEdit && !data?.readOnly,
        minWidth: 120,
        type: "rightAligned",
        sortable: false,
      },
      {
        headerName: "Unavailable",
        field: "unavailable",
        cellRenderer: UnavailableCellRenderer,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        editable: ({ data }) => canEdit && !data?.readOnly,
        minWidth: 120,
        type: "rightAligned",
        sortable: false,
      },
      {
        headerName: "Reserved",
        field: "reserved",
        cellRenderer: ReservedCellRenderer,
        minWidth: 120,
        type: "rightAligned",
        sortable: false,
      },
      {
        headerName: "Available",
        field: "available",
        cellRenderer: CalculatedAvailableCell,
        minWidth: 120,
        flex: 1,
        type: "rightAligned",
        resizable: false,
        sortable: false,
      },
    ],
    [canEdit],
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
    [handleDeleteSelected],
  );

  // Derive reactive values from edits
  const changesCount = Object.values(edits).reduce(
    (count, fields) => count + Object.keys(fields || {}).length,
    0,
  );
  const rowErrorCount = Object.values(rowErrors).reduce(
    (count, errors) => count + errors.length,
    0,
  );
  const firstStoredError = getFirstStoredError(submitErrors, rowErrors);

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (firstStoredError && hasUnsavedChanges) {
      result.push({
        type: "custom",
        id: "inventory-submit-errors",
        render: () => (
          <Alert
            className={styles.errorPanel}
            type="error"
            showIcon
            message={firstStoredError.message}
            description={
              rowErrorCount > 0 ? `${rowErrorCount} row error(s)` : undefined
            }
          />
        ),
      });
    }

    if (hasUnsavedChanges) {
      result.push({
        type: "editing",
        changesCount,
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
    changesCount,
    deselectAll,
    firstStoredError,
    handleDiscard,
    handleSave,
    hasUnsavedChanges,
    rowErrorCount,
    selectedIds.length,
    selectionActions,
    status,
    styles.errorPanel,
  ]);

  return (
    <DataLayout
      name="inventory"
      title="Inventory"
      count={totalCount}
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
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error.message}
            style={{ marginBottom: 8 }}
          />
        ) : null}

        <div className={styles.gridWrapper}>
          <AgGridReact<InventoryVariantRow>
            ref={gridRef}
            theme={agGridTheme}
            rowData={displayData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            loading={loading}
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressMovableColumns
            readOnlyEdit
            onCellEditRequest={handleCellEditRequest}
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            onSortChanged={onSortChanged}
            stopEditingWhenCellsLoseFocus
          />
        </div>

        <RelayCursorPagination
          name="inventory"
          pagination={pagination}
          pageInfo={pageInfo}
          totalCount={totalCount}
          loadedRowsCount={displayData.length}
          disabled={!canNavigate}
          disabledReason="Save or discard changes to navigate"
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
