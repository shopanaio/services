"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Alert,
  Button,
  Flex,
  Tag,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
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
import type {
  ApiCategory,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
  ApiDateTimeFilter,
  ApiFile,
  ApiIntFilter,
  ApiStringFilter,
} from "@/graphql/types";
import {
  CategoryOrderField,
  SortDirection,
} from "@/graphql/types";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { filterSchema } from "./filter-schema";
import { useCategories } from "../hooks";
import { useCategoryModal, useCreateCategoryModal } from "../modals";
import type { CategoriesQueryVariables } from "../graphql";
import { TableCoverImage } from "@/shared/components/table-cover-image";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

const CATEGORY_SORT_FIELDS: Partial<Record<string, CategoryOrderField>> = {
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
  updatedAt: CategoryOrderField.UpdatedAt,
  createdAt: CategoryOrderField.CreatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
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

function buildIntFilter(
  operator: FilterOperator,
  value: unknown,
): ApiIntFilter | null {
  const firstValue = getFirstFilterValue(value);

  if (isEmptyFilterValue(firstValue)) {
    return null;
  }

  const numberValue = Number(firstValue);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  switch (operator) {
    case FilterOperator.Eq:
      return { _eq: numberValue };
    case FilterOperator.NotEq:
      return { _neq: numberValue };
    case FilterOperator.Gt:
      return { _gt: numberValue };
    case FilterOperator.Gte:
      return { _gte: numberValue };
    case FilterOperator.Lt:
      return { _lt: numberValue };
    case FilterOperator.Lte:
      return { _lte: numberValue };
    default:
      return null;
  }
}

function toDateTimeInput(value: unknown): string | null {
  if (isEmptyFilterValue(value)) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value !== null) {
    const maybeDate = value as { toISOString?: () => string };

    if (typeof maybeDate.toISOString === "function") {
      return maybeDate.toISOString();
    }
  }

  return null;
}

function buildDateTimeFilter(
  operator: FilterOperator,
  value: unknown,
): ApiDateTimeFilter | null {
  if (operator === FilterOperator.Between) {
    const values = Array.isArray(value) ? value : [];
    const [startValue, endValue] = values;
    const start = toDateTimeInput(startValue);
    const end = toDateTimeInput(endValue);
    const filter: ApiDateTimeFilter = {};

    if (start) {
      filter._gte = start;
    }

    if (end) {
      filter._lte = end;
    }

    return Object.keys(filter).length > 0 ? filter : null;
  }

  const dateValue = toDateTimeInput(getFirstFilterValue(value));

  if (!dateValue) {
    return null;
  }

  switch (operator) {
    case FilterOperator.Eq:
      return { _eq: dateValue };
    case FilterOperator.NotEq:
      return { _neq: dateValue };
    case FilterOperator.Gt:
      return { _gt: dateValue };
    case FilterOperator.Gte:
      return { _gte: dateValue };
    case FilterOperator.Lt:
      return { _lt: dateValue };
    case FilterOperator.Lte:
      return { _lte: dateValue };
    default:
      return null;
  }
}

const categoryFilterAdapter: IFilterAdapter<ApiCategoryWhereInput> = {
  name: "category-where",
  convert: (filter) => {
    switch (filter.payloadKey) {
      case "handle": {
        const condition = buildStringFilter(filter.operator, filter.value);
        return condition ? { handle: condition } : null;
      }
      case "path": {
        const condition = buildStringFilter(filter.operator, filter.value);
        return condition ? { path: condition } : null;
      }
      case "depth": {
        const condition = buildIntFilter(filter.operator, filter.value);
        return condition ? { depth: condition } : null;
      }
      case "publishedAt": {
        const condition = buildDateTimeFilter(filter.operator, filter.value);
        return condition ? { publishedAt: condition } : null;
      }
      case "createdAt": {
        const condition = buildDateTimeFilter(filter.operator, filter.value);
        return condition ? { createdAt: condition } : null;
      }
      case "updatedAt": {
        const condition = buildDateTimeFilter(filter.operator, filter.value);
        return condition ? { updatedAt: condition } : null;
      }
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

function mapCategorySortModelToOrderBy(
  sortModel: SortModel[],
): ApiCategoryOrderByInput[] | null {
  const orderBy = sortModel
    .map((sort) => {
      const field = CATEGORY_SORT_FIELDS[sort.colId];

      if (!field || !sort.sort) {
        return null;
      }

      return {
        field,
        direction:
          sort.sort === "desc" ? SortDirection.Desc : SortDirection.Asc,
      };
    })
    .filter((item): item is ApiCategoryOrderByInput => item !== null);

  return orderBy.length > 0 ? orderBy : null;
}

function getCategoryThumbnailFile(category: ApiCategory): ApiFile | null {
  const [thumbnail] = [...category.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  );

  return thumbnail?.file ?? null;
}

const CategoryCellRenderer = (
  props: CustomCellRendererProps<ApiCategory>,
) => {
  const { data } = props;
  if (!data) return null;

  const thumbnail = getCategoryThumbnailFile(data);

  return (
    <Flex
      align="center"
      gap="small"
      data-testid={`categories-table-category-cell-${data.handle}`}
    >
      <TableCoverImage
        src={thumbnail?.url ?? null}
        alt={thumbnail?.altText ?? thumbnail?.originalName ?? data.name}
        fallbackIcon={<FolderOutlined />}
      />
      <Flex vertical gap={0}>
        <Typography.Text
          strong
          data-testid={`categories-table-name-cell-${data.handle}`}
        >
          {data.name}
        </Typography.Text>
        <Typography.Text
          type="secondary"
          data-testid={`categories-table-handle-cell-${data.handle}`}
        >
          {data.handle}
        </Typography.Text>
      </Flex>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, boolean>,
) => {
  const isPublished = props.value ?? props.data?.isPublished ?? false;
  const color = isPublished ? "success" : "default";
  const label = isPublished ? "Published" : "Draft";

  return (
    <Tag
      color={color}
      data-testid={
        props.data
          ? `categories-table-status-cell-${props.data.handle}`
          : undefined
      }
    >
      {label}
    </Tag>
  );
};

const ProductsCountCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, number>,
) => {
  const value = props.value ?? 0;

  if (value === 0) {
    return (
      <Typography.Text
        type="secondary"
        data-testid={
          props.data
            ? `categories-table-products-cell-${props.data.handle}`
            : undefined
        }
      >
        0 products
      </Typography.Text>
    );
  }
  return (
    <Typography.Text
      data-testid={
        props.data
          ? `categories-table-products-cell-${props.data.handle}`
          : undefined
      }
    >
      {value} products
    </Typography.Text>
  );
};

const TextCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, string>,
) => <Typography.Text>{props.value ?? ""}</Typography.Text>;

const DateCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, string>,
) => <Typography.Text>{formatDetailDate(props.value)}</Typography.Text>;

export default function CategoriesPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiCategory>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [sortModel, setSortModel] = useState<SortModel[]>([]);
  const { widgetProps, payload: filtersWhere } =
    useFilters<ApiCategoryWhereInput>({
      schema: filterSchema,
      adapter: categoryFilterAdapter,
    });
  const { push: openCategoryModal } = useCategoryModal();
  const { push: openCreateCategoryModal } = useCreateCategoryModal();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "categories-grid-state",
  });

  const where = useMemo<ApiCategoryWhereInput | null>(() => {
    const conditions: ApiCategoryWhereInput[] = [];
    const query = searchValue.trim();

    if (query) {
      conditions.push({ handle: { _containsi: query } });
    }

    if (filtersWhere) {
      conditions.push(filtersWhere);
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { _and: conditions };
  }, [filtersWhere, searchValue]);

  const orderBy = useMemo(
    () => mapCategorySortModelToOrderBy(sortModel),
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

  const listQueryVariables = useMemo<CategoriesQueryVariables>(
    () => ({
      ...pagination.variables,
      where,
      orderBy,
    }),
    [orderBy, pagination.variables, where],
  );

  const {
    categories,
    totalCount,
    pageInfo,
    loading,
    error,
    refetch,
  } = useCategories(listQueryVariables);

  const handleOpenCreateCategoryModal = useCallback(() => {
    openCreateCategoryModal({
      onCreated: () => {
        void refetch();
      },
    });
  }, [openCreateCategoryModal, refetch]);

  const handleSortChange = useCallback((model: SortModel[]) => {
    setSortModel(model);
  }, []);

  const { onSortChanged } = useGridSort<ApiCategory>({
    gridRef,
    sortModel,
    onSortChange: handleSortChange,
  });

  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ApiCategory>({
      onRowAction: (category) =>
        openCategoryModal({ entityId: category.id }),
    });

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiCategory>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    [],
  );

  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        disabled: true,
        tooltip: "Category delete is not connected yet",
        onClick: () => undefined,
      },
    ],
    [],
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

  const columnDefs = useMemo<ColDef<ApiCategory>[]>(
    () => [
      {
        headerName: "Category",
        field: "name",
        cellRenderer: CategoryCellRenderer,
        minWidth: 300,
        sortable: false,
      },
      {
        headerName: "Status",
        field: "isPublished",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        sortable: false,
      },
      {
        headerName: "Products",
        field: "productsCount",
        cellRenderer: ProductsCountCellRenderer,
        minWidth: 120,
        resizable: false,
        sortable: false,
      },
      {
        headerName: "Parent",
        colId: "parent.name",
        valueGetter: ({ data }) => data?.parent?.name ?? "Root",
        cellRenderer: TextCellRenderer,
        minWidth: 160,
        sortable: false,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCellRenderer,
        minWidth: 140,
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

  return (
    <DataLayout
      name="categories"
      title="Categories"
      count={totalCount}
      actions={
        <Button
          data-testid="categories-create-button"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateCategoryModal}
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
            searchPlaceholder="Search handles..."
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
        {error && <Alert type="error" message={error.message} showIcon />}
        <div style={{ flex: 1, minHeight: 0 }} data-testid="categories-table">
          <AgGridReact<ApiCategory>
            ref={gridRef}
            theme={agGridTheme}
            rowData={categories}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
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

        <RelayCursorPagination
          name="categories"
          pagination={pagination}
          pageInfo={pageInfo}
          totalCount={totalCount}
          loadedRowsCount={categories.length}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
