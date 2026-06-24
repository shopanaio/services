"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Typography, Flex, Button, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import { useModalStack } from "@/layouts/modals";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { ActionConfig } from "@/ui-kit/floating-panel-stack/core/types";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import {
  useGridState,
  useGridSort,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useBundles } from "../hooks";
import type { IBundleListItem, BundleType } from "@/mocks/products/bundles-list";
import { TableCoverImage } from "@/shared/components/table-cover-image";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const BundleCellRenderer = (
  props: CustomCellRendererProps<IBundleListItem>,
) => {
  const { data } = props;
  if (!data) return null;
  return (
    <Flex align="center" gap="small">
      <TableCoverImage
        src={data.image}
        alt={data.name}
        fallbackIcon={<GiftOutlined />}
      />
      <Typography.Text strong>{data.name}</Typography.Text>
    </Flex>
  );
};

const BUNDLE_TYPE_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  FIXED: { color: "blue", label: "Fixed Kit" },
  MULTIPACK: { color: "cyan", label: "Multipack" },
  MIX_AND_MATCH: { color: "purple", label: "Mix & Match" },
};

const BundleTypeCellRenderer = (
  props: CustomCellRendererProps<IBundleListItem>,
) => {
  const { value } = props;
  const config = value
    ? BUNDLE_TYPE_CONFIG[value as BundleType]
    : { color: "default", label: "Custom" };
  return <Tag color={config.color}>{config.label}</Tag>;
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<IBundleListItem>,
) => {
  const { value } = props;
  const config: Record<string, { color: string; label: string }> = {
    published: { color: "success", label: "Published" },
    draft: { color: "default", label: "Draft" },
  };
  const { color, label } = config[value] || config.draft;
  return <Tag color={color}>{label}</Tag>;
};

export default function BundlesPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<IBundleListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { data: bundles } = useBundles();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "bundles-grid-state",
  });

  const { onSortChanged } = useGridSort({
    gridRef,
    onSortChange: (model) => {
      console.log("Sort changed:", model);
    },
  });

  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<IBundleListItem>({
      onRowAction: (data) => push("bundle", { entityId: data.id, level: 1 }),
    });

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IBundleListItem>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    [],
  );

  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  const handleBulkEdit = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    const ids = selectedRows.map((r) => r.id);
    push("bulk-editor", { productIds: ids });
  }, [push]);

  const handleDeleteSelected = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    console.log(
      "Delete bundles:",
      selectedRows.map((r) => r.id),
    );
    deselectAll();
  }, [deselectAll]);

  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "bulk-edit",
        label: "Bulk Edit",
        icon: <EditOutlined />,
        onClick: handleBulkEdit,
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleDeleteSelected,
      },
    ],
    [handleBulkEdit, handleDeleteSelected],
  );

  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];
    if (selectedCount > 0) {
      result.push({
        type: "selection",
        count: selectedCount,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }
    return result;
  }, [selectedCount, selectionActions, deselectAll]);

  const columnDefs = useMemo<ColDef<IBundleListItem>[]>(
    () => [
      {
        headerName: "Bundle",
        field: "name",
        cellRenderer: BundleCellRenderer,
        minWidth: 280,
      },
      {
        headerName: "Type",
        field: "bundleType",
        cellRenderer: BundleTypeCellRenderer,
        minWidth: 140,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        resizable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  const handleCreate = useCallback(() => {
    push("bundle", { entityId: "", level: 1 });
  }, [push]);

  return (
    <DataLayout
      name="bundles"
      title="Bundles"
      count={bundles.length}
      actions={
        <Button icon={<PlusOutlined />} onClick={handleCreate}>
          Create
        </Button>
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
          <AgGridReact<IBundleListItem>
            ref={gridRef}
            theme={agGridTheme}
            rowData={bundles}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={52}
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressCellFocus
            suppressMovableColumns
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            onSortChanged={onSortChanged}
          />
        </div>

        <CursorPagination
          total={bundles.length}
          rangeStart={1}
          rangeEnd={bundles.length}
          pageSize={20}
          hasNext={false}
          hasPrev={false}
          onNext={() => {}}
          onPrev={() => {}}
          onPageSizeChange={() => {}}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
