"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  RowSelectionOptions,
  SelectionChangedEvent,
  SortChangedEvent,
} from "ag-grid-community";
import { Alert, Button, Input, Space, Typography } from "antd";
import { createStyles } from "antd-style";
import { SearchOutlined } from "@ant-design/icons";
import {
  FacetType,
  FacetValueCandidateOrderField,
  FacetValueCandidateType,
  SortDirection,
  type ApiFacetValueCandidateOrderByInput,
  type ApiFacetValueCandidateWhereInput,
} from "@/graphql/types";
import { useAgGridTheme } from "@/hooks";
import {
  CursorPagination,
  useRelayCursorPagination,
} from "@/ui-kit/cursor-pagination";
import { useFacetValueCandidates } from "../../hooks";
import type { FacetValueCandidateFields } from "../../graphql/operation-types";

export interface FacetValueCandidateFormValue {
  id: string;
  handle: string;
  label: string;
  sourceHandle: string;
}

export interface FacetValueCandidatesGridProps {
  facetType: FacetType;
  sourceHandle: string | null;
  value: FacetValueCandidateFormValue[];
  onChange: (value: FacetValueCandidateFormValue[]) => void;
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 275;

const SUPPORTED_FACET_TYPES = new Set<FacetType>([
  FacetType.Tag,
  FacetType.Option,
  FacetType.Feature,
]);

const useStyles = createStyles(({ token }) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  state: {
    color: token.colorTextSecondary,
    fontSize: 13,
    padding: "4px 0 8px",
  },
  grid: {
    height: 336,
    minHeight: 336,
  },
  pagination: {
    paddingTop: 0,
  },
}));

function toCandidateType(facetType: FacetType): FacetValueCandidateType | null {
  if (facetType === FacetType.Tag) return FacetValueCandidateType.Tag;
  if (facetType === FacetType.Option) return FacetValueCandidateType.Option;
  if (facetType === FacetType.Feature) return FacetValueCandidateType.Feature;
  return null;
}

function toFormValue(
  candidate: FacetValueCandidateFields,
): FacetValueCandidateFormValue {
  return {
    id: candidate.id,
    handle: candidate.handle,
    label: candidate.label,
    sourceHandle: candidate.sourceHandle,
  };
}

function buildSearchWhere(
  search: string,
): ApiFacetValueCandidateWhereInput | null {
  const value = search.trim();
  if (!value) return null;

  return {
    _or: [
      { label: { _containsi: value } },
      { handle: { _containsi: value } },
    ],
  };
}

function buildOrderBy(
  sortModel: ApiFacetValueCandidateOrderByInput[],
): ApiFacetValueCandidateOrderByInput[] {
  return [
    ...sortModel,
    { field: FacetValueCandidateOrderField.Id, direction: SortDirection.Asc },
  ];
}

export function FacetValueCandidatesGrid({
  facetType,
  sourceHandle,
  value,
  onChange,
}: FacetValueCandidatesGridProps) {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<FacetValueCandidateFields>>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortModel, setSortModel] = useState<ApiFacetValueCandidateOrderByInput[]>([
    { field: FacetValueCandidateOrderField.Label, direction: SortDirection.Asc },
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  const selectionById = useMemo(
    () => new Map(value.map((candidate) => [candidate.id, candidate])),
    [value],
  );
  const candidateType = toCandidateType(facetType);
  const canLoadCandidates =
    Boolean(sourceHandle) && Boolean(candidateType) && SUPPORTED_FACET_TYPES.has(facetType);
  const searchWhere = useMemo(
    () => buildSearchWhere(debouncedSearch),
    [debouncedSearch],
  );
  const orderBy = useMemo(() => buildOrderBy(sortModel), [sortModel]);
  const resetKey = `${facetType}:${sourceHandle ?? ""}:${debouncedSearch}:${JSON.stringify(sortModel)}`;
  const pagination = useRelayCursorPagination({
    defaultPageSize: PAGE_SIZE,
    resetKey,
  });

  const { candidates, totalCount, pageInfo, loading, error, refetch } =
    useFacetValueCandidates({
      ...pagination.variables,
      where: searchWhere,
      orderBy,
      meta:
        canLoadCandidates && candidateType && sourceHandle
          ? {
              candidateType,
              sourceHandles: [sourceHandle],
            }
          : null,
      skip: !canLoadCandidates,
    });

  const columnDefs = useMemo<ColDef<FacetValueCandidateFields>[]>(
    () => [
      {
        field: "label",
        headerName: "Value",
        flex: 1,
        minWidth: 180,
        sort: "asc",
        cellRenderer: ({
          data,
        }: ICellRendererParams<FacetValueCandidateFields>) =>
          data ? (
            <span data-testid={`facet-value-candidate-cell-${data.handle}`}>
              {data.label}
            </span>
          ) : null,
      },
      {
        field: "sourceHandle",
        headerName: "Source",
        width: 140,
      },
      {
        field: "handle",
        headerName: "Handle",
        hide: true,
      },
    ],
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
      enableSelectionWithoutKeys: true,
    }),
    [],
  );

  const syncGridSelection = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (!node.data) return;
      node.setSelected(selectionById.has(node.data.id));
    });
  }, [selectionById]);

  useEffect(() => {
    syncGridSelection();
  }, [candidates, syncGridSelection]);

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<FacetValueCandidateFields>) => {
      const nextSelection = new Map(selectionById);
      const currentPageIds = new Set(candidates.map((candidate) => candidate.id));

      for (const id of currentPageIds) {
        nextSelection.delete(id);
      }

      for (const row of event.api.getSelectedRows()) {
        nextSelection.set(row.id, toFormValue(row));
      }

      onChange([...nextSelection.values()]);
    },
    [candidates, onChange, selectionById],
  );

  const handleSortChanged = useCallback(
    (event: SortChangedEvent<FacetValueCandidateFields>) => {
      const sortedColumns = event.api
        .getColumnState()
        .filter((column) => column.sort != null)
        .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0));
      const labelSort = sortedColumns.find((column) => column.colId === "label");

      setSortModel([
        {
          field: FacetValueCandidateOrderField.Label,
          direction:
            labelSort?.sort === "desc" ? SortDirection.Desc : SortDirection.Asc,
        },
      ]);
    },
    [],
  );

  if (!sourceHandle) {
    return (
      <div className={styles.state}>
        Select a source to load available values.
      </div>
    );
  }

  if (!SUPPORTED_FACET_TYPES.has(facetType)) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search filter values"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          data-testid="facet-value-candidates-search-input"
        />
        <Typography.Text type="secondary">
          {value.length} selected
        </Typography.Text>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Could not load values"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <div className={styles.grid} data-testid="facet-value-candidates-grid">
        <AgGridReact<FacetValueCandidateFields>
          ref={gridRef}
          theme={agGridTheme}
          rowData={candidates}
          columnDefs={columnDefs}
          getRowId={(params: GetRowIdParams<FacetValueCandidateFields>) =>
            params.data.id
          }
          rowHeight={44}
          headerHeight={38}
          rowSelection={rowSelection}
          selectionColumnDef={{
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          suppressCellFocus
          suppressMovableColumns
          loading={loading}
          noRowsOverlayComponent={() => (
            <Space direction="vertical" align="center">
              <Typography.Text type="secondary">No values found</Typography.Text>
            </Space>
          )}
          defaultColDef={{
            sortable: true,
            resizable: false,
            comparator: () => 0,
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          onGridReady={syncGridSelection}
          onSelectionChanged={handleSelectionChanged}
          onSortChanged={handleSortChanged}
        />
      </div>

      <div className={styles.pagination}>
        <CursorPagination
          name="facet-value-candidates"
          total={totalCount}
          rangeStart={pagination.getRangeStart(candidates.length, totalCount)}
          rangeEnd={pagination.getRangeEnd(candidates.length, totalCount)}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          hasNext={Boolean(pageInfo?.hasNextPage)}
          hasPrev={Boolean(pageInfo?.hasPreviousPage)}
          onNext={() => pagination.goToNextPage(pageInfo)}
          onPrev={() => pagination.goToPreviousPage(pageInfo)}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  );
}
