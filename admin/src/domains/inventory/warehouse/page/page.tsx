"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Button, Flex, Input, Select, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  ColDef,
  GridStateModule,
  ModuleRegistry,
  RowClickedEvent,
  RowSelectionModule,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import {
  RelayCursorPagination,
  useRelayCursorPagination,
} from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, useGridSort, useGridState } from "@/hooks";
import type { SortModel } from "@/hooks/use-grid-sort";
import type {
  ApiWarehouse,
  ApiWarehouseOrderByInput,
  ApiWarehouseWhereInput,
} from "@/graphql/types";
import {
  SortDirection,
  WarehouseOrderField,
} from "@/graphql/types";
import { WarehouseNameCell } from "../components";
import { useWarehouses } from "../hooks";
import {
  useWarehouseCreateModal,
  useWarehouseModal,
} from "../modals";
import type { WarehousesQueryVariables } from "../graphql";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

type DefaultFilterValue = "all" | "default" | "non-default";

const WAREHOUSE_SORT_FIELDS: Partial<Record<string, WarehouseOrderField>> = {
  name: WarehouseOrderField.Name,
  code: WarehouseOrderField.Code,
  isDefault: WarehouseOrderField.IsDefault,
  updatedAt: WarehouseOrderField.UpdatedAt,
  createdAt: WarehouseOrderField.CreatedAt,
};

const useStyles = createStyles(({ token }) => ({
  gridContainer: {
    height: "100%",
    paddingBottom: token.padding,
    display: "flex",
    flexDirection: "column",
    gap: token.paddingSM,
  },
  gridWrapper: {
    flex: 1,
    minHeight: 0,
  },
  monospace: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  toolbarInput: {
    width: 320,
  },
  toolbarSelect: {
    width: 160,
  },
}));

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function mapSortModelToOrderBy(
  sortModel: SortModel[],
): ApiWarehouseOrderByInput[] | null {
  const orderBy = sortModel
    .map((sort) => {
      const field = WAREHOUSE_SORT_FIELDS[sort.colId];

      if (!field || !sort.sort) {
        return null;
      }

      return {
        field,
        direction:
          sort.sort === "desc" ? SortDirection.Desc : SortDirection.Asc,
      };
    })
    .filter((item): item is ApiWarehouseOrderByInput => item !== null);

  return orderBy.length > 0 ? orderBy : null;
}

const WarehouseCellRenderer = (
  props: CustomCellRendererProps<ApiWarehouse>,
) => {
  if (!props.data) {
    return null;
  }

  return <WarehouseNameCell warehouse={props.data} />;
};

const CodeCellRenderer = (
  props: CustomCellRendererProps<ApiWarehouse, string>,
) => (
  <Typography.Text className={props.context?.styles?.monospace}>
    {props.value ?? ""}
  </Typography.Text>
);

const DateCellRenderer = (
  props: CustomCellRendererProps<ApiWarehouse, string>,
) => <Typography.Text>{props.value ? formatDate(props.value) : ""}</Typography.Text>;

export default function WarehousePage() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiWarehouse>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [defaultFilter, setDefaultFilter] =
    useState<DefaultFilterValue>("all");
  const [sortModel, setSortModel] = useState<SortModel[]>([]);
  const { push: openCreateModal } = useWarehouseCreateModal();
  const { push: openWarehouseModal } = useWarehouseModal();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "warehouse-grid-state",
  });

  const where = useMemo<ApiWarehouseWhereInput | null>(() => {
    const filters: ApiWarehouseWhereInput[] = [];
    const query = searchValue.trim();

    if (query) {
      filters.push({
        _or: [
          { name: { _containsi: query } },
          { code: { _containsi: query } },
        ],
      });
    }

    if (defaultFilter === "default") {
      filters.push({ isDefault: { _eq: true } });
    }

    if (defaultFilter === "non-default") {
      filters.push({ isDefault: { _eq: false } });
    }

    return filters.length > 0 ? { _and: filters } : null;
  }, [defaultFilter, searchValue]);

  const orderBy = useMemo(
    () => mapSortModelToOrderBy(sortModel),
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

  const listQueryVariables = useMemo<WarehousesQueryVariables>(
    () => ({
      ...pagination.variables,
      where,
      orderBy,
    }),
    [orderBy, pagination.variables, where],
  );

  const {
    warehouses,
    totalCount,
    pageInfo,
    loading,
    error,
  } = useWarehouses(listQueryVariables);

  const handleSortChange = useCallback((model: SortModel[]) => {
    setSortModel(model);
  }, []);

  const { onSortChanged } = useGridSort<ApiWarehouse>({
    gridRef,
    sortModel,
    onSortChange: handleSortChange,
  });

  const handleCreate = useCallback(() => {
    openCreateModal({ listQueryVariables });
  }, [listQueryVariables, openCreateModal]);

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<ApiWarehouse>) => {
      if (!event.data) {
        return;
      }

      openWarehouseModal({
        entityId: event.data.id,
        listQueryVariables,
      });
    },
    [listQueryVariables, openWarehouseModal],
  );

  const columnDefs = useMemo<ColDef<ApiWarehouse>[]>(
    () => [
      {
        headerName: "Warehouse",
        field: "name",
        cellRenderer: WarehouseCellRenderer,
        flex: 2,
        minWidth: 260,
      },
      {
        headerName: "Code",
        field: "code",
        cellRenderer: CodeCellRenderer,
        flex: 1,
        minWidth: 150,
      },
      {
        headerName: "Stocked variants",
        field: "variantsCount",
        minWidth: 150,
        sortable: false,
        type: "rightAligned",
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCellRenderer,
        minWidth: 140,
      },
      {
        headerName: "Created",
        field: "createdAt",
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
      name="warehouse"
      title="Warehouse"
      count={totalCount}
      actions={
        <Button
          data-testid="warehouse-create-button"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          New
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <Flex align="center" gap={8} wrap="wrap">
            <Input.Search
              allowClear
              className={styles.toolbarInput}
              placeholder="Search warehouses..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              data-testid="warehouse-search-input"
            />
            <Select<DefaultFilterValue>
              className={styles.toolbarSelect}
              value={defaultFilter}
              onChange={setDefaultFilter}
              options={[
                { value: "all", label: "Default: All" },
                { value: "default", label: "Default only" },
                { value: "non-default", label: "Non-default" },
              ]}
              data-testid="warehouse-default-filter"
            />
          </Flex>
        }
      />

      <div className={styles.gridContainer}>
        {error && <Alert type="error" message={error.message} showIcon />}
        <div className={styles.gridWrapper} data-testid="warehouse-table">
          <AgGridReact<ApiWarehouse>
            ref={gridRef}
            theme={agGridTheme}
            context={{ styles }}
            rowData={warehouses}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={handleRowClicked}
            onSortChanged={onSortChanged}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
          />
        </div>

        <RelayCursorPagination
          name="warehouse"
          pagination={pagination}
          pageInfo={pageInfo}
          totalCount={totalCount}
          loadedRowsCount={warehouses.length}
        />
      </div>
    </DataLayout>
  );
}
