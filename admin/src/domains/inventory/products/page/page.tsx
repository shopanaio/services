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
import {
  FilterOperator,
  useFilters,
  FilterWidget,
} from "@/layouts/filters";
import type { IFilterAdapter } from "@/layouts/filters/core/types";
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
import { useDeleteProduct, useProducts } from "../hooks";
import { useBulkEditorStore } from "../modals/bulk-editor-modal";
import { useProductCreateModal } from "../modals";
import type {
  ApiProduct,
  ApiProductOrderByInput,
  ApiProductWhereInput,
  ApiStringFilter,
} from "@/graphql/types";
import {
  ProductOrderField,
  SortDirection,
} from "@/graphql/types";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  getProductBrandName,
  getProductMaxPriceAmount,
  getProductMinPriceAmount,
  getProductPrimaryCategoryName,
  getProductThumbnailFile,
} from "../utils/api-product-display";
import { formatPrice } from "../utils/price-formatting";
import type { ProductsQueryVariables } from "../graphql";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const PRODUCT_SORT_FIELDS: Partial<Record<string, ProductOrderField>> = {
  title: ProductOrderField.Name,
  minPriceMinor: ProductOrderField.MinPriceMinor,
  maxPriceMinor: ProductOrderField.MaxPriceMinor,
  primaryCategoryName: ProductOrderField.PrimaryCategoryName,
};

function isEmptyFilterValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmptyFilterValue);
  }

  return value === null || value === undefined || value === "";
}

function getFirstFilterValue(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.find((item) => !isEmptyFilterValue(item));
}

function buildStringFilter(
  operator: FilterOperator,
  value: unknown,
): ApiStringFilter | null {
  const firstValue = getFirstFilterValue(value);

  if (isEmptyFilterValue(firstValue)) {
    return null;
  }

  const text = String(firstValue);

  switch (operator) {
    case FilterOperator.Eq:
      return { _eq: text };
    case FilterOperator.NotEq:
      return { _neq: text };
    case FilterOperator.ILike:
    case FilterOperator.Like:
      return { _containsi: text };
    default:
      return null;
  }
}

const productFilterAdapter: IFilterAdapter<ApiProductWhereInput> = {
  name: "product-where",
  convert: (filter) => {
    const condition = buildStringFilter(filter.operator, filter.value);

    if (!condition) {
      return null;
    }

    switch (filter.payloadKey) {
      case "name":
        return { name: condition };
      case "handle":
        return { handle: condition };
      case "primaryCategoryName":
        return { primaryCategoryName: condition };
      default:
        return null;
    }
  },
  combine: (filters) => {
    if (filters.length === 1) {
      return filters[0];
    }

    return { _and: filters };
  },
  build: (combined) => combined,
};

function mapProductSortModelToOrderBy(
  sortModel: SortModel[],
): ApiProductOrderByInput[] | null {
  const orderBy = sortModel
    .map((sort) => {
      const field = PRODUCT_SORT_FIELDS[sort.colId];

      if (!field || !sort.sort) {
        return null;
      }

      return {
        field,
        direction:
          sort.sort === "desc" ? SortDirection.Desc : SortDirection.Asc,
      };
    })
    .filter((item): item is ApiProductOrderByInput => item !== null);

  return orderBy.length > 0 ? orderBy : null;
}

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
  props: CustomCellRendererProps<ApiProduct, string | null>,
) => {
  const { value } = props;
  return <Typography.Text>{value ?? "\u2014"}</Typography.Text>;
};

const PriceCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, number | null> & {
    currency?: string | null;
  },
) => {
  const { value, currency } = props;

  return (
    <Typography.Text>
      {value !== null && value !== undefined && currency
        ? formatPrice(value, currency)
        : "\u2014"}
    </Typography.Text>
  );
};

export default function ProductsPage() {
  const agGridTheme = useAgGridTheme();
  const { message } = App.useApp();
  const gridRef = useRef<AgGridReact<ApiProduct>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [sortModel, setSortModel] = useState<SortModel[]>([]);
  const defaultCurrency = useDefaultCurrency();
  const { widgetProps, payload: filterWhere } =
    useFilters<ApiProductWhereInput>({
      schema: filterSchema,
      adapter: productFilterAdapter,
    });
  const { push } = useModalStack();
  const where = useMemo<ApiProductWhereInput | null>(() => {
    const filters: ApiProductWhereInput[] = [];
    const query = searchValue.trim();

    if (query) {
      filters.push({ name: { _containsi: query } });
    }

    if (filterWhere) {
      filters.push(filterWhere);
    }

    if (filters.length === 0) {
      return null;
    }

    return filters.length === 1 ? filters[0] : { _and: filters };
  }, [filterWhere, searchValue]);
  const orderBy = useMemo(
    () => mapProductSortModelToOrderBy(sortModel),
    [sortModel],
  );
  const resetKey = useMemo(
    () => JSON.stringify({ where, orderBy }),
    [orderBy, where],
  );
  const pagination = useRelayCursorPagination({
    defaultPageSize: 20,
    resetKey,
  });
  const listQueryVariables = useMemo<ProductsQueryVariables>(
    () => ({
      ...pagination.variables,
      where,
      orderBy,
    }),
    [orderBy, pagination.variables, where],
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
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "products-grid-state",
  });

  const handleSortChange = useCallback((model: SortModel[]) => {
    setSortModel(model);
  }, []);

  const { onSortChanged } = useGridSort<ApiProduct>({
    gridRef,
    sortModel,
    onSortChange: handleSortChange,
  });

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
        cellRendererParams: { currency: defaultCurrency },
        minWidth: 130,
      },
      {
        headerName: "Max price",
        colId: "maxPriceMinor",
        valueGetter: ({ data }) =>
          data ? getProductMaxPriceAmount(data) : null,
        cellRenderer: PriceCellRenderer,
        cellRendererParams: { currency: defaultCurrency },
        minWidth: 130,
      },
      {
        headerName: "Category",
        colId: "primaryCategoryName",
        valueGetter: ({ data }) =>
          data ? getProductPrimaryCategoryName(data) : null,
        cellRenderer: TextCellRenderer,
        minWidth: 180,
      },
      {
        headerName: "Brand",
        colId: "brand",
        valueGetter: ({ data }) => (data ? getProductBrandName(data) : null),
        cellRenderer: TextCellRenderer,
        minWidth: 160,
        resizable: false,
        sortable: false,
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
            {...widgetProps}
            searchProps={{
              searchValue,
              onChangeSearchValue: setSearchValue,
            }}
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
            onSortChanged={onSortChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
          />
        </div>

        <RelayCursorPagination
          name="products"
          pagination={pagination}
          pageInfo={pageInfo}
          totalCount={totalCount}
          loadedRowsCount={products.length}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
