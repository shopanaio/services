"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Flex, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  CellClickedEvent,
  ColDef,
  GetRowIdParams,
  GridStateModule,
  ICellRendererParams,
  ModuleRegistry,
  RowDragEndEvent,
  RowDragModule,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget, useFilters } from "@/layouts/filters";
import { useAgGridTheme } from "@/hooks";
import {
  FacetLinkedSourcesCell,
  FacetNameCell,
  FacetTreeActionsCell,
  FacetValuesCell,
} from "../components";
import {
  useDeleteFacet,
  useDeleteFacetValue,
  useFacets,
  useMoveFacet,
} from "../hooks";
import {
  apiFacetsToFacetGridRows,
  getMaxRootSortIndex,
  getNextValueSortIndex,
  isDiscreteFacetType,
  type FacetGridRow,
} from "../mappers";
import {
  useCreateFacetModal,
  useCreateFacetValueModal,
  useEditFacetModal,
} from "../modals";
import { filterSchema } from "./filter-schema";
import { filterFacetGridRows } from "./page-config";

ModuleRegistry.registerModules([
  AllCommunityModule,
  GridStateModule,
  RowDragModule,
]);

const useStyles = createStyles(({ token }) => ({
  gridContainer: {
    height: "100%",
    paddingBottom: token.padding,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  gridWrapper: {
    flex: 1,
    minHeight: 0,
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
    },
    "& .row-group": {
      fontWeight: 600,
    },
    "& .row-child": {
      background: `${token.colorBgContainer} !important`,
    },
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
  metaTag: {
    marginInlineEnd: 0,
    minHeight: 22,
    paddingInline: 8,
    borderRadius: token.borderRadiusSM,
    background: token.colorFillQuaternary,
    color: token.colorTextSecondary,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "22px",
  },
}));

function shouldIgnoreRowClick(event: CellClickedEvent<FacetGridRow>): boolean {
  const target = event.event?.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "[data-stop-row-click],button,.ant-select,.ant-switch,.ant-dropdown,.ag-drag-handle",
    ),
  );
}

function areRowIdsSame(left: FacetGridRow[], right: FacetGridRow[]): boolean {
  return (
    left.length === right.length &&
    left.every((row, index) => row.id === right[index]?.id)
  );
}

function formatFacetMetaValue(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function FacetsPage() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<FacetGridRow>>(null);
  const { message, modal } = App.useApp();
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps, filters, reset: resetFilters } = useFilters({
    schema: filterSchema,
  });

  const { facets, loading, error, refetch } = useFacets();
  const { deleteFacet } = useDeleteFacet();
  const { deleteFacetValue } = useDeleteFacetValue();
  const { moveFacet } = useMoveFacet();
  const { push: openCreateFacetModal } = useCreateFacetModal();
  const { push: openEditFacetModal } = useEditFacetModal();
  const { push: openCreateFacetValueModal } = useCreateFacetValueModal();
  const [optimisticRows, setOptimisticRows] = useState<FacetGridRow[] | null>(
    null,
  );

  const baseRows = useMemo(() => apiFacetsToFacetGridRows(facets), [facets]);
  const filteredRows = useMemo(
    () => filterFacetGridRows(baseRows, { searchValue, filters }),
    [baseRows, filters, searchValue],
  );
  const tableRows = useMemo(
    () => filteredRows.filter((row) => row.type === "facet"),
    [filteredRows],
  );
  const displayRows = optimisticRows ?? tableRows;

  useEffect(() => {
    setOptimisticRows(null);
  }, [tableRows]);

  const refetchAndReset = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const getRowId = useCallback(
    (params: GetRowIdParams<FacetGridRow>) => params.data.id,
    [],
  );
  const getRowClass = useCallback(() => "row-group", []);

  const openCreateValueForFacet = useCallback(
    (row: FacetGridRow) => {
      if (row.type !== "facet" || !row.apiId || !row.facetType) {
        return;
      }

      if (!isDiscreteFacetType(row.facetType)) {
        message.warning("Computed facets do not have manual values.");
        return;
      }

      openCreateFacetValueModal({
        facetId: row.apiId,
        facetLabel: row.name,
        facetType: row.facetType,
        nextSortIndex: getNextValueSortIndex(baseRows, row.id),
        onSaved: refetchAndReset,
      });
    },
    [baseRows, message, openCreateFacetValueModal, refetchAndReset],
  );

  const handleRowEdit = useCallback(
    (row: FacetGridRow) => {
      if (!row.apiId) {
        return;
      }
      if (row.type === "facet") {
        openEditFacetModal({ facetId: row.apiId, onSaved: refetchAndReset });
      }
    },
    [openEditFacetModal, refetchAndReset],
  );

  const handleDuplicate = useCallback(
    (row: FacetGridRow) => {
      if (row.type === "facet") {
        if (!row.facetType || !row.uiType) {
          return;
        }

        openCreateFacetModal({
          nextSortIndex: getMaxRootSortIndex(baseRows) + 1,
          initialValues: {
            label: `${row.name} copy`,
            slug: `${row.slug ?? row.name}-copy`,
            facetType: row.facetType,
            uiType: row.uiType,
          },
          onSaved: refetchAndReset,
        });
        return;
      }

      if (!row.parentId) {
        return;
      }

      const parent = baseRows.find((candidate) => candidate.id === row.parentId);
      if (!parent?.apiId || !parent.facetType) {
        return;
      }

      openCreateFacetValueModal({
        facetId: parent.apiId,
        facetLabel: parent.name,
        facetType: parent.facetType,
        nextSortIndex: getNextValueSortIndex(baseRows, parent.id),
        initialValues: {
          label: `${row.name} copy`,
          slug: `${row.slug ?? row.name}-copy`,
          enabled: row.enabled ?? true,
          sourceHandles: row.sourceHandles ?? [],
          swatchId: row.swatchId ?? null,
        },
        onSaved: refetchAndReset,
      });
    },
    [baseRows, openCreateFacetModal, openCreateFacetValueModal, refetchAndReset],
  );

  const handleDelete = useCallback(
    (row: FacetGridRow) => {
      if (!row.apiId) {
        return;
      }

      modal.confirm({
        title: `Delete ${row.type === "facet" ? "facet" : "facet value"}?`,
        content: row.name,
        okText: "Delete",
        okButtonProps: { danger: true },
        async onOk() {
          if (row.type === "facet") {
            const result = await deleteFacet({ id: row.apiId! });
            if (result.userErrors.length > 0) {
              message.error(result.userErrors[0].message);
              return;
            }
            message.success("Facet deleted.");
          } else {
            const result = await deleteFacetValue({ id: row.apiId! });
            if (result.userErrors.length > 0) {
              message.error(result.userErrors[0].message);
              return;
            }
            message.success("Facet value deleted.");
          }

          await refetchAndReset();
        },
      });
    },
    [
      deleteFacet,
      deleteFacetValue,
      message,
      modal,
      refetchAndReset,
    ],
  );

  const handleCellClicked = useCallback(
    (event: CellClickedEvent<FacetGridRow>) => {
      if (!event.data || shouldIgnoreRowClick(event)) {
        return;
      }
      handleRowEdit(event.data);
    },
    [handleRowEdit],
  );

  const handleRowDragEnd = useCallback(
    async (event: RowDragEndEvent<FacetGridRow>) => {
      const movedRow = event.node.data;
      if (!movedRow?.apiId) {
        return;
      }

      const orderedRows: FacetGridRow[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) {
          orderedRows.push(node.data);
        }
      });

      if (orderedRows.length === 0 || areRowIdsSame(orderedRows, displayRows)) {
        return;
      }

      const movedIndex = orderedRows.findIndex((row) => row.id === movedRow.id);
      if (movedIndex === -1) {
        return;
      }

      setOptimisticRows(orderedRows);

      const result = await moveFacet({
        id: movedRow.apiId,
        afterFacetId: orderedRows[movedIndex - 1]?.apiId ?? null,
        beforeFacetId: orderedRows[movedIndex + 1]?.apiId ?? null,
      });

      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        setOptimisticRows(null);
        return;
      }

      await refetchAndReset();
      message.success("Facet order updated.");
      setOptimisticRows(null);
    },
    [displayRows, message, moveFacet, refetchAndReset],
  );

  const columnDefs = useMemo<ColDef<FacetGridRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Facet",
        flex: 2,
        minWidth: 320,
        rowDrag: ({ data }) => Boolean(data?.apiId),
        cellRenderer: FacetNameCell,
      },
      {
        headerName: "Display type",
        minWidth: 150,
        valueGetter: ({ data }) => data?.uiType ?? "",
        cellRenderer: ({ value }: ICellRendererParams<FacetGridRow, string>) =>
          value ? (
            <Tag bordered={false} className={styles.metaTag}>
              {formatFacetMetaValue(value)}
            </Tag>
          ) : null,
      },
      {
        headerName: "Selection mode",
        minWidth: 150,
        valueGetter: ({ data }) => data?.selectionMode ?? "",
        cellRenderer: ({ value }: ICellRendererParams<FacetGridRow, string>) =>
          value ? (
            <Tag bordered={false} className={styles.metaTag}>
              {formatFacetMetaValue(value)}
            </Tag>
          ) : null,
      },
      {
        headerName: "Values",
        minWidth: 240,
        flex: 2,
        cellRenderer: FacetValuesCell,
        cellRendererParams: {
          allRows: baseRows,
        },
      },
      {
        headerName: "Linked sources",
        minWidth: 170,
        flex: 1,
        cellRenderer: FacetLinkedSourcesCell,
      },
      {
        headerName: "",
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        cellRenderer: FacetTreeActionsCell,
        cellRendererParams: {
          onEdit: handleRowEdit,
          onCreateValue: openCreateValueForFacet,
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
        },
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    [
      baseRows,
      handleDelete,
      handleDuplicate,
      handleRowEdit,
      openCreateValueForFacet,
      styles.metaTag,
    ],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  const filterWidgetProps = useMemo(
    () => ({
      ...widgetProps,
      searchProps: {
        searchValue,
        onChangeSearchValue: setSearchValue,
      },
    }),
    [searchValue, widgetProps],
  );
  const hasActiveFilters = searchValue.trim() !== "" || filters.length > 0;

  return (
    <DataLayout
      name="facets"
      title="Facets"
      count={baseRows.filter((row) => row.type === "facet").length}
      actions={
        <>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              openCreateFacetModal({
                nextSortIndex: getMaxRootSortIndex(baseRows) + 1,
                onSaved: refetchAndReset,
              })
            }
          >
            Create
          </Button>
        </>
      }
    >
      <DataLayout.Toolbar
        left={
          <Flex align="center" gap="small" style={{ width: "100%" }}>
            <FilterWidget
              {...filterWidgetProps}
              searchPlaceholder="Search facets and values..."
            />
            <Button
              disabled={!hasActiveFilters}
              onClick={() => {
                setSearchValue("");
                resetFilters();
              }}
            >
              Reset
            </Button>
          </Flex>
        }
      />

      <div className={styles.gridContainer}>
        {error ? <Alert type="error" showIcon message={error.message} /> : null}
        <div className={styles.gridWrapper} data-testid="facets-table">
          <AgGridReact<FacetGridRow>
            ref={gridRef}
            theme={agGridTheme}
            rowData={displayRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            rowHeight={56}
            loading={loading}
            suppressMovableColumns
            suppressCellFocus
            rowDragManaged
            animateRows
            onCellClicked={handleCellClicked}
            onRowDragEnd={handleRowDragEnd}
          />
        </div>
        {!loading && displayRows.length === 0 ? (
          <Typography.Text type="secondary">No facets found</Typography.Text>
        ) : null}
      </div>
    </DataLayout>
  );
}
