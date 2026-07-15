"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  GridStateModule,
  ModuleRegistry,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type {
  ApiSearchProductBoost,
  ApiSearchProductBoostWhereInput,
} from "@/graphql/types";
import { SearchProductBoostOrderField } from "@/graphql/types";
import { useProductBoosts } from "../hooks";
import { filterSchema } from "./filter-schema";
import {
  buildProductBoostSearchCondition,
  buildProductBoostsQueryVariables,
  productBoostFilterTransformers,
  productBoostSortFieldMapping,
} from "./page-config";
import { useProductBoostModal } from "../../modals";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const NameCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, string>,
) => (
  <Typography.Text
    strong
    ellipsis={{ tooltip: props.value }}
    style={{ maxWidth: "100%" }}
  >
    {props.value}
  </Typography.Text>
);

const PhrasesCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, number>,
) => {
  const phrases = [...(props.data?.phrases ?? [])]
    .sort((left, right) => left.position - right.position)
    .map(({ phrase }) => phrase)
    .join(", ");

  return (
    <Flex align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
      <Tag style={{ marginInlineEnd: 0 }}>{props.value ?? 0}</Tag>
      <Typography.Text
        type={phrases ? undefined : "secondary"}
        ellipsis={{ tooltip: phrases || undefined }}
        style={{ minWidth: 0 }}
      >
        {phrases || "No trigger phrases"}
      </Typography.Text>
    </Flex>
  );
};

const LocaleCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, string>,
) => <Tag style={{ marginInlineEnd: 0 }}>{props.value?.toUpperCase()}</Tag>;

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, boolean>,
) => (
  <Tag color={props.value ? "success" : "default"}>
    {props.value ? "Enabled" : "Disabled"}
  </Tag>
);

const ProductsCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, number>,
) => {
  const count = props.value ?? 0;

  return (
    <Typography.Text>
      {count} {count === 1 ? "product" : "products"}
    </Typography.Text>
  );
};

const DateCellRenderer = (
  props: CustomCellRendererProps<ApiSearchProductBoost, string>,
) => <Typography.Text>{formatDate(props.value)}</Typography.Text>;

export default function ProductBoostsPage() {
  const router = useRouter();
  const { push: openProductBoostModal } = useProductBoostModal();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiSearchProductBoost>>(null);
  const pageConfig = usePageConfig<
    ApiSearchProductBoost,
    ApiSearchProductBoostWhereInput,
    SearchProductBoostOrderField
  >({
    gridRef,
    storageKey: "search-product-boosts-grid-state",
    filterSchema,
    sortFieldMapping: productBoostSortFieldMapping,
    defaultPageSize: 20,
    buildSearchCondition: buildProductBoostSearchCondition,
    filterTransformers: productBoostFilterTransformers,
  });

  const queryVariables = useMemo(
    () => buildProductBoostsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
      pageConfig.filters,
    ],
  );
  const { productBoosts, totalCount, pageInfo, loading, error, refetch } =
    useProductBoosts(queryVariables);

  const handleCreate = useCallback(() => {
    openProductBoostModal({ mode: "create", onSaved: refetch });
  }, [openProductBoostModal, refetch]);

  const handleEdit = useCallback(
    (entityId: string) => {
      openProductBoostModal({ mode: "edit", entityId, onSaved: refetch });
    },
    [openProductBoostModal, refetch],
  );

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      pageConfig.goToNextPage(pageInfo.endCursor);
    }
  }, [pageConfig, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      pageConfig.goToPrevPage(pageInfo.startCursor);
    }
  }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiSearchProductBoost>[]>(
    () => [
      {
        headerName: "Boost",
        field: "name",
        cellRenderer: NameCellRenderer,
        flex: 1,
        minWidth: 240,
      },
      {
        headerName: "Trigger phrases",
        field: "phrasesCount",
        cellRenderer: PhrasesCellRenderer,
        flex: 2,
        minWidth: 320,
      },
      {
        headerName: "Locale",
        field: "locale",
        cellRenderer: LocaleCellRenderer,
        minWidth: 100,
        maxWidth: 130,
      },
      {
        headerName: "Status",
        field: "enabled",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        maxWidth: 140,
      },
      {
        headerName: "Products",
        field: "productsCount",
        cellRenderer: ProductsCellRenderer,
        minWidth: 130,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCellRenderer,
        minWidth: 150,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<ApiSearchProductBoost>>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout
      fullWidth
      name="product-boosts"
      title="Product boosts"
      count={totalCount}
      onBack={() => router.back()}
      actions={
        <Button
          data-testid="product-boosts-create-button"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Create
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search product boosts by name..."
          />
        }
      />

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {error ? <Alert type="error" message={error.message} showIcon /> : null}

        <div
          style={{ flex: 1, minHeight: 0 }}
          data-testid="product-boosts-table"
        >
          <AgGridReact<ApiSearchProductBoost>
            ref={gridRef}
            theme={agGridTheme}
            rowData={productBoosts}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            suppressCellFocus
            suppressMovableColumns
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
            onRowClicked={(event) => event.data && handleEdit(event.data.id)}
            getRowStyle={() => ({ cursor: "pointer" })}
          />
        </div>

        <CursorPagination
          name="product-boosts"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(productBoosts.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(productBoosts.length),
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
    </DataLayout>
  );
}
