"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Alert, Typography, Flex, Button, Tag } from "antd";
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
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { ActionConfig } from "@/ui-kit/floating-panel-stack/core/types";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import {
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { useInventoryRelayListPage } from "@/domains/inventory/hooks";
import { filterSchema } from "./filter-schema";
import {
  buildBundleSearchCondition,
  buildBundlesQueryVariables,
  bundleFilterTransformers,
  bundleSortFieldMapping,
} from "./page-config";
import { useBundles } from "../hooks";
import { TableCoverImage } from "@/shared/components/table-cover-image";
import {
  BundleOrderField,
  BundleType,
  type ApiBundle,
  type ApiBundleWhereInput,
} from "@/graphql/types";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const BundleCellRenderer = (
  props: CustomCellRendererProps<ApiBundle>,
) => {
  const { data } = props;
  if (!data) return null;
  const thumbnail = data.media[0]?.file;
  return (
    <Flex align="center" gap="small">
      <TableCoverImage
        src={thumbnail?.url ?? null}
        alt={thumbnail?.altText ?? thumbnail?.originalName ?? data.title}
        fallbackIcon={<GiftOutlined />}
      />
      <Typography.Text strong>{data.title}</Typography.Text>
    </Flex>
  );
};

const BUNDLE_TYPE_CONFIG: Record<
  BundleType,
  { color: string; label: string }
> = {
  [BundleType.Fixed]: { color: "blue", label: "Fixed Kit" },
  [BundleType.Multipack]: { color: "cyan", label: "Multipack" },
  [BundleType.MixAndMatch]: { color: "purple", label: "Mix & Match" },
  [BundleType.Custom]: { color: "default", label: "Custom" },
};

const BundleTypeCellRenderer = (
  props: CustomCellRendererProps<ApiBundle>,
) => {
  const { value } = props;
  const config = value
    ? BUNDLE_TYPE_CONFIG[value as BundleType]
    : { color: "default", label: "Custom" };
  return <Tag color={config.color}>{config.label}</Tag>;
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiBundle>,
) => {
  const { value } = props;
  return (
    <Tag color={value ? "success" : "default"}>
      {value ? "Published" : "Draft"}
    </Tag>
  );
};

export default function BundlesPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiBundle>>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const { push } = useModalStack();
  const {
    pageConfig,
    items: bundles,
    totalCount,
    pageInfo,
    loading,
    error,
    handleNextPage,
    handlePrevPage,
  } = useInventoryRelayListPage<
    ApiBundle,
    ApiBundleWhereInput,
    BundleOrderField,
    ReturnType<typeof buildBundlesQueryVariables>,
    ReturnType<typeof useBundles>
  >({
    gridRef,
    storageKey: "bundles-grid-state",
    filterSchema,
    sortFieldMapping: bundleSortFieldMapping,
    defaultPageSize: 20,
    buildSearchCondition: buildBundleSearchCondition,
    filterTransformers: bundleFilterTransformers,
    buildQueryVariables: buildBundlesQueryVariables,
    useListQuery: useBundles,
    getItems: (result) => result.bundles,
  });

  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ApiBundle>({
      onRowAction: (data) => push("bundle", { entityId: data.id, level: 1 }),
    });

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiBundle>) => {
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

  const columnDefs = useMemo<ColDef<ApiBundle>[]>(
    () => [
      {
        headerName: "Bundle",
        field: "title",
        cellRenderer: BundleCellRenderer,
        minWidth: 280,
      },
      {
        headerName: "Type",
        field: "type",
        cellRenderer: BundleTypeCellRenderer,
        minWidth: 140,
      },
      {
        headerName: "Status",
        field: "isPublished",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        resizable: false,
        sortable: false,
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
      count={totalCount}
      actions={
        <Button icon={<PlusOutlined />} onClick={handleCreate}>
          Create
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search bundles..."
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
        {error && (
          <Alert
            type="error"
            message={error.message}
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        <div style={{ flex: 1 }}>
          <AgGridReact<ApiBundle>
            ref={gridRef}
            theme={agGridTheme}
            rowData={bundles}
            loading={loading}
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
            onSortChanged={pageConfig.onSortChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="bundles"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(bundles.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(bundles.length),
            totalCount,
          )}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
