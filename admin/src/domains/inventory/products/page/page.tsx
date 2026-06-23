"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Alert, App, Image, Typography, Flex, Button } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
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
  createMinorUnitPriceTransformer,
  createRelationInTransformer,
  useAgGridTheme,
  useAgGridRowSelection,
  usePageConfig,
} from "@/hooks";
import type { FilterTransformer, SortFieldMapping } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useDeleteProduct, useProducts } from "../hooks";
import { useBulkEditorStore } from "../modals/bulk-editor-modal";
import { useProductCreateModal } from "../modals";
import type {
  ApiProduct,
  ApiProductOrderByInput,
  ApiProductWhereInput,
} from "@/graphql/types";
import { ProductOrderField } from "@/graphql/types";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  getProductBrandName,
  getProductMaxPriceAmount,
  getProductMinPriceAmount,
  getProductPrimaryCategoryName,
  getProductTotalAvailable,
  getProductThumbnailFile,
} from "../utils/api-product-display";
import { formatPrice } from "../utils/price-formatting";
import type { ProductsQueryVariables } from "../graphql";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const productSortFieldMapping: SortFieldMapping<ProductOrderField> = {
  title: ProductOrderField.Name,
  minPriceMinor: ProductOrderField.MinPriceMinor,
  maxPriceMinor: ProductOrderField.MaxPriceMinor,
  primaryCategoryName: ProductOrderField.PrimaryCategoryName,
  brand: ProductOrderField.BrandName,
};

const buildProductSearchCondition = (
  search: string,
): Partial<ApiProductWhereInput> => ({
  name: { _containsi: search },
});

const productFilterTransformers: Record<
  string,
  FilterTransformer<ApiProductWhereInput>
> = {
  primaryCategoryId:
    createRelationInTransformer<ApiProductWhereInput>("primaryCategoryId"),
  minPriceMinor:
    createMinorUnitPriceTransformer<ApiProductWhereInput>("minPriceMinor"),
  maxPriceMinor:
    createMinorUnitPriceTransformer<ApiProductWhereInput>("maxPriceMinor"),
  vendorId: createRelationInTransformer<ApiProductWhereInput>("vendorId"),
};

// Cell Renderers
const ProductCellRenderer = (
  props: CustomCellRendererProps<ApiProduct>,
) => {
  const { data } = props;
  if (!data) return null;
  const thumbnail = getProductThumbnailFile(data);
  return (
    <Flex
      align="center"
      gap="small"
      data-testid={`products-table-title-cell-${data.handle}`}
    >
      {thumbnail ? (
        <Image
          src={thumbnail.url}
          alt={thumbnail.altText ?? thumbnail.originalName ?? data.title}
          width={40}
          height={40}
          style={{ borderRadius: 4, objectFit: "cover" }}
          preview={false}
        />
      ) : (
        <div style={{ width: 40, height: 40, flex: "0 0 40px" }} />
      )}
      <Typography.Text strong>{data.title}</Typography.Text>
    </Flex>
  );
};

const TextCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, string | null> & {
    testIdSuffix?: string;
  },
) => {
  const { data, value, testIdSuffix } = props;

  return (
    <Typography.Text
      data-testid={
        data && testIdSuffix
          ? `products-table-${testIdSuffix}-cell-${data.handle}`
          : undefined
      }
    >
      {value ?? "\u2014"}
    </Typography.Text>
  );
};

const PriceCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, number | null> & {
    currency?: string | null;
    testIdSuffix?: string;
  },
) => {
  const { data, value, currency, testIdSuffix } = props;

  return (
    <Typography.Text
      data-testid={
        data && testIdSuffix
          ? `products-table-${testIdSuffix}-cell-${data.handle}`
          : undefined
      }
    >
      {value !== null && value !== undefined && currency
        ? formatPrice(value, currency)
        : "\u2014"}
    </Typography.Text>
  );
};

const StockCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, number>,
) => {
  const { data, value } = props;

  return (
    <Typography.Text
      data-testid={
        data ? `products-table-inventory-cell-${data.handle}` : undefined
      }
    >
      {value} in stock
    </Typography.Text>
  );
};

export default function ProductsPage() {
  const agGridTheme = useAgGridTheme();
  const { message } = App.useApp();
  const gridRef = useRef<AgGridReact<ApiProduct>>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const defaultCurrency = useDefaultCurrency();
  const { push } = useModalStack();
  const pageConfig = usePageConfig<
    ApiProduct,
    ApiProductWhereInput,
    ProductOrderField
  >({
    gridRef,
    storageKey: "products-grid-state",
    filterSchema,
    sortFieldMapping: productSortFieldMapping,
    defaultPageSize: 20,
    buildSearchCondition: buildProductSearchCondition,
    filterTransformers: productFilterTransformers,
  });
  const listQueryVariables = useMemo<ProductsQueryVariables>(
    () => ({
      first: pageConfig.first,
      after: pageConfig.after,
      last: pageConfig.last,
      before: pageConfig.before,
      where: pageConfig.where ?? null,
      orderBy: (pageConfig.orderBy ?? null) as
        | ApiProductOrderByInput[]
        | null,
    }),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const {
    products,
    totalCount,
    pageInfo,
    loading,
    error,
    refetch,
  } = useProducts(listQueryVariables);
  const { deleteProduct, loading: deletingProducts } = useDeleteProduct();
  const { goToNextPage, goToPrevPage } = pageConfig;

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      goToNextPage(pageInfo.endCursor);
    }
  }, [goToNextPage, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      goToPrevPage(pageInfo.startCursor);
    }
  }, [goToPrevPage, pageInfo?.startCursor]);

  // Bulk editor store
  const setSelectedProducts = useBulkEditorStore((s) => s.setSelectedProducts);

  // Create product modal
  const { push: pushCreateModal } = useProductCreateModal();

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ApiProduct>({
      onRowAction: (product) =>
        push("product", { entityId: product.id, mode: "view" }),
    });

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiProduct>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    [],
  );

  // Deselect all
  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  // Open bulk editor with selected products
  const handleBulkEdit = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    const productIds = selectedRows.map((product) => product.id);
    setSelectedProducts(productIds);
    push("bulk-editor", { productIds });
  }, [setSelectedProducts, push]);

  // Delete selected products
  const handleDeleteSelected = useCallback(async () => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];

    if (selectedRows.length === 0) {
      return;
    }

    const results = await Promise.all(
      selectedRows.map((product) => deleteProduct({ id: product.id })),
    );
    const firstError = results.flatMap((result) => result.userErrors)[0];

    if (firstError) {
      message.error(firstError.message);
      return;
    }

    message.success(
      selectedRows.length === 1 ? "Product deleted" : "Products deleted",
    );
    deselectAll();
    await refetch();
  }, [deleteProduct, deselectAll, message, refetch]);

  // Build selection actions
  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "bulk-edit",
        label: "Bulk Edit",
        icon: <EditOutlined />,
        disabled: true,
        tooltip: "Bulk editor is still a mock-only flow",
        onClick: handleBulkEdit,
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        loading: deletingProducts,
        onClick: handleDeleteSelected,
      },
    ],
    [deletingProducts, handleBulkEdit, handleDeleteSelected],
  );

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (selectedCount > 0) {
      // eslint-disable-next-line react-hooks/refs -- deselectAll is called on click, not during render
      result.push({
        type: "selection",
        count: selectedCount,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }

    return result;
  }, [selectedCount, selectionActions, deselectAll]);

  const columnDefs = useMemo<ColDef<ApiProduct>[]>(
    () => [
      {
        headerName: "Product",
        field: "title",
        cellRenderer: ProductCellRenderer,
        flex: 2,
        minWidth: 300,
      },
      {
        headerName: "Min price",
        colId: "minPriceMinor",
        valueGetter: ({ data }) =>
          data ? getProductMinPriceAmount(data) : null,
        cellRenderer: PriceCellRenderer,
        cellRendererParams: {
          currency: defaultCurrency,
          testIdSuffix: "min-price",
        },
        minWidth: 130,
      },
      {
        headerName: "Max price",
        colId: "maxPriceMinor",
        valueGetter: ({ data }) =>
          data ? getProductMaxPriceAmount(data) : null,
        cellRenderer: PriceCellRenderer,
        cellRendererParams: {
          currency: defaultCurrency,
          testIdSuffix: "max-price",
        },
        minWidth: 130,
      },
      {
        headerName: "Stock",
        colId: "stock",
        valueGetter: ({ data }) => (data ? getProductTotalAvailable(data) : 0),
        cellRenderer: StockCellRenderer,
        minWidth: 120,
        sortable: false,
      },
      {
        headerName: "Category",
        colId: "primaryCategoryName",
        valueGetter: ({ data }) =>
          data ? getProductPrimaryCategoryName(data) : null,
        cellRenderer: TextCellRenderer,
        cellRendererParams: { testIdSuffix: "category" },
        minWidth: 180,
      },
      {
        headerName: "Brand",
        colId: "brand",
        valueGetter: ({ data }) => (data ? getProductBrandName(data) : null),
        cellRenderer: TextCellRenderer,
        cellRendererParams: { testIdSuffix: "brand" },
        minWidth: 160,
        resizable: false,
      },
    ],
    [defaultCurrency],
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
    pushCreateModal({});
  }, [pushCreateModal]);

  return (
    <DataLayout
      name="products"
      title="Products"
      count={totalCount}
      actions={
        <Button
          data-testid="products-create-button"
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
            searchPlaceholder="Search products..."
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

        <div style={{ flex: 1 }} data-testid="products-table">
          <AgGridReact<ApiProduct>
            ref={gridRef}
            theme={agGridTheme}
            rowData={products}
            loading={loading || deletingProducts}
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
          name="products"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(products.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(products.length),
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
