"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Flex, Typography } from "antd";
import { PlusOutlined, RetweetOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  CellClickedEvent,
  CellEditRequestEvent,
  ColDef,
  GetRowIdParams,
  GridStateModule,
  ICellRendererParams,
  ModuleRegistry,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget, useFilters } from "@/layouts/filters";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import { useAgGridTheme } from "@/hooks";
import {
  FacetBooleanCell,
  FacetLinkedSourcesCell,
  FacetSelectCell,
  FacetSwatchCell,
  FacetTreeActionsCell,
  FacetTreeNameCell,
} from "../components";
import {
  useDeleteFacet,
  useDeleteFacetValue,
  useFacetGridEditStore,
  useFacets,
  useFacetTreeRows,
  useSaveFacetGridEdits,
  type FacetGridEditableField,
} from "../hooks";
import {
  apiFacetsToFacetGridRows,
  getMaxRootSortIndex,
  getNextValueSortIndex,
  isDiscreteFacetType,
  mergeFacetGridRowsWithEdits,
  normalizeSourceHandles,
  type FacetGridRow,
} from "../mappers";
import {
  useCreateFacetModal,
  useCreateFacetValueModal,
  useEditFacetModal,
  useEditFacetOrderModal,
  useEditFacetValueModal,
  useLinkSourceValuesModal,
} from "../modals";
import { filterSchema } from "./filter-schema";
import { filterFacetGridRows } from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

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
  errorPanel: {
    width: 520,
    maxWidth: "calc(100vw - 48px)",
  },
}));

function shouldIgnoreRowClick(event: CellClickedEvent<FacetGridRow>): boolean {
  const target = event.event?.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "[data-stop-row-click],button,.ant-select,.ant-switch,.ant-dropdown",
    ),
  );
}

function getOriginalValue(
  originalRow: FacetGridRow | undefined,
  field: FacetGridEditableField,
) {
  if (!originalRow) {
    return null;
  }

  switch (field) {
    case "facet.label":
    case "value.label":
      return originalRow.name;
    case "facet.slug":
    case "value.slug":
      return originalRow.slug ?? null;
    case "facet.uiType":
      return originalRow.uiType ?? null;
    case "facet.selectionMode":
      return originalRow.selectionMode ?? null;
    case "value.enabled":
      return originalRow.enabled ?? null;
    case "value.sourceHandles":
      return originalRow.sourceHandles ?? [];
    case "value.swatchId":
      return originalRow.swatchId ?? null;
  }
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

  const {
    fieldEdits,
    rowErrors,
    submitErrors,
    status,
    setFieldValue,
    discardAll,
  } = useFacetGridEditStore();
  const hasUnsavedChanges = Object.keys(fieldEdits).length > 0;
  const changesCount = Object.values(fieldEdits).reduce(
    (count, rowEdits) => count + Object.keys(rowEdits ?? {}).length,
    0,
  );
  const firstStoredError =
    submitErrors[0] ?? Object.values(rowErrors).flat()[0] ?? null;
  const rowErrorCount = Object.values(rowErrors).reduce(
    (count, errors) => count + (errors?.length ?? 0),
    0,
  );

  const { facets, loading, error, refetch } = useFacets();
  const { deleteFacet } = useDeleteFacet();
  const { deleteFacetValue } = useDeleteFacetValue();
  const { push: openCreateFacetModal } = useCreateFacetModal();
  const { push: openEditFacetModal } = useEditFacetModal();
  const { push: openEditFacetOrderModal } = useEditFacetOrderModal();
  const { push: openCreateFacetValueModal } = useCreateFacetValueModal();
  const { push: openEditFacetValueModal } = useEditFacetValueModal();
  const { push: openLinkSourceValuesModal } = useLinkSourceValuesModal();

  const baseRows = useMemo(() => apiFacetsToFacetGridRows(facets), [facets]);
  const displayRows = useMemo(
    () => mergeFacetGridRowsWithEdits(baseRows, fieldEdits),
    [baseRows, fieldEdits],
  );
  const filteredRows = useMemo(
    () => filterFacetGridRows(displayRows, { searchValue, filters }),
    [displayRows, filters, searchValue],
  );

  const {
    allRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    resetRowsFromServer: resetTreeRowsFromServer,
    getRowClass,
  } = useFacetTreeRows(filteredRows);

  const resetFilteredRowsFromServer = useCallback(
    (nextRows: FacetGridRow[]) => {
      const nextFilteredRows = filterFacetGridRows(nextRows, {
        searchValue,
        filters,
      });
      resetTreeRowsFromServer(nextFilteredRows);
    },
    [filters, resetTreeRowsFromServer, searchValue],
  );

  const refetchAndReset = useCallback(async () => {
    const freshFacets = await refetch();
    const freshRows = apiFacetsToFacetGridRows(freshFacets);
    resetFilteredRowsFromServer(freshRows);
  }, [refetch, resetFilteredRowsFromServer]);

  const { saveFacetGridEdits, discardFacetGridEdits } =
    useSaveFacetGridEdits({
      refetchFacets: refetch,
      resetRowsFromServer: resetFilteredRowsFromServer,
    });

  useEffect(() => {
    return () => {
      discardAll();
    };
  }, [discardAll]);

  const getRowId = useCallback(
    (params: GetRowIdParams<FacetGridRow>) => params.data.id,
    [],
  );

  const findOriginalRow = useCallback(
    (rowId: string) => baseRows.find((row) => row.id === rowId),
    [baseRows],
  );

  const setRowFieldValue = useCallback(
    (
      row: FacetGridRow,
      field: FacetGridEditableField,
      currentValue: string | number | boolean | string[] | null,
    ) => {
      setFieldValue(
        row.id,
        field,
        getOriginalValue(findOriginalRow(row.id), field),
        currentValue,
      );
    },
    [findOriginalRow, setFieldValue],
  );

  const handleCellEditRequest = useCallback(
    (event: CellEditRequestEvent<FacetGridRow>) => {
      const row = event.data;
      if (!row || !["name", "slug"].includes(String(event.colDef.field))) {
        return;
      }

      const nextValue = String(event.newValue ?? "").trim();
      if (!nextValue) {
        message.error(
          event.colDef.field === "name"
            ? "Label is required."
            : "Slug is required.",
        );
        return;
      }

      setRowFieldValue(
        row,
        row.type === "facet"
          ? event.colDef.field === "name"
            ? "facet.label"
            : "facet.slug"
          : event.colDef.field === "name"
            ? "value.label"
            : "value.slug",
        nextValue,
      );
    },
    [message, setRowFieldValue],
  );

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

  const handleOpenLinkSourceValues = useCallback(
    (row: FacetGridRow) => {
      if (row.type !== "value" || !row.apiId) {
        return;
      }

      openLinkSourceValuesModal({
        valueId: row.apiId,
        valueLabel: row.name,
        sourceHandles: row.sourceHandles ?? [],
        onSave: (sourceHandles: string[]) => {
          setRowFieldValue(
            row,
            "value.sourceHandles",
            normalizeSourceHandles(sourceHandles),
          );
        },
      });
    },
    [openLinkSourceValuesModal, setRowFieldValue],
  );

  const handleRowEdit = useCallback(
    (row: FacetGridRow) => {
      if (!row.apiId) {
        return;
      }
      if (row.type === "facet") {
        openEditFacetModal({ facetId: row.apiId, onSaved: refetchAndReset });
      } else {
        openEditFacetValueModal({
          valueId: row.apiId,
          onSaved: refetchAndReset,
        });
      }
    },
    [openEditFacetModal, openEditFacetValueModal, refetchAndReset],
  );

  const handleDuplicate = useCallback(
    (row: FacetGridRow) => {
      if (row.type === "facet") {
        if (!row.facetType || !row.uiType || !row.selectionMode) {
          return;
        }

        openCreateFacetModal({
          nextSortIndex: getMaxRootSortIndex(baseRows) + 1,
          initialValues: {
            label: `${row.name} copy`,
            slug: `${row.slug ?? row.name}-copy`,
            facetType: row.facetType,
            uiType: row.uiType,
            selectionMode: row.selectionMode,
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

      if (hasUnsavedChanges) {
        message.warning("Save or discard changes before deleting.");
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
      hasUnsavedChanges,
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

  const handleDiscard = useCallback(() => {
    discardFacetGridEdits(
      filterFacetGridRows(baseRows, {
        searchValue,
        filters,
      }),
    );
  }, [baseRows, discardFacetGridEdits, filters, searchValue]);

  const columnDefs = useMemo<ColDef<FacetGridRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Facet / Value",
        flex: 2,
        minWidth: 320,
        editable: true,
        cellRenderer: FacetTreeNameCell,
        cellRendererParams: {
          expandedIds,
          onToggleExpand: handleToggleExpand,
          allRows,
        },
      },
      {
        headerName: "Source",
        minWidth: 120,
        valueGetter: ({ data }) =>
          data?.type === "facet" ? data.facetType : "value",
      },
      {
        field: "slug",
        headerName: "Slug",
        minWidth: 180,
        flex: 1,
        editable: true,
      },
      {
        headerName: "UI / Status",
        minWidth: 230,
        cellRenderer: (params: ICellRendererParams<FacetGridRow>) => {
          if (params.data?.type === "facet") {
            return (
              <FacetSelectCell
                {...params}
                onUiTypeChange={(row, value) => {
                  setRowFieldValue(row, "facet.uiType", value);
                }}
                onSelectionModeChange={(row, value) => {
                  setRowFieldValue(row, "facet.selectionMode", value);
                }}
              />
            );
          }

          return (
            <FacetBooleanCell
              {...params}
              onEnabledChange={(row, value) =>
                setRowFieldValue(row, "value.enabled", value)
              }
            />
          );
        },
      },
      {
        headerName: "Linked sources",
        minWidth: 170,
        flex: 1,
        cellRenderer: FacetLinkedSourcesCell,
        cellRendererParams: {
          onLinkSourceValues: handleOpenLinkSourceValues,
        },
      },
      {
        headerName: "Swatch",
        minWidth: 140,
        cellRenderer: FacetSwatchCell,
      },
      {
        headerName: "",
        width: 72,
        pinned: "right",
        cellRenderer: FacetTreeActionsCell,
        cellRendererParams: {
          hasUnsavedChanges,
          onEdit: handleRowEdit,
          onCreateValue: openCreateValueForFacet,
          onLinkSourceValues: handleOpenLinkSourceValues,
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
          onBlockedDelete: () =>
            message.warning("Save or discard changes before deleting."),
        },
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    [
      allRows,
      expandedIds,
      handleDelete,
      handleDuplicate,
      handleOpenLinkSourceValues,
      handleRowEdit,
      handleToggleExpand,
      hasUnsavedChanges,
      message,
      openCreateValueForFacet,
      setRowFieldValue,
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

  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (firstStoredError && hasUnsavedChanges) {
      result.push({
        type: "custom",
        id: "facet-submit-errors",
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
        onSave: saveFacetGridEdits,
        onCancel: handleDiscard,
      });
    }

    return result;
  }, [
    changesCount,
    firstStoredError,
    handleDiscard,
    hasUnsavedChanges,
    rowErrorCount,
    saveFacetGridEdits,
    status,
    styles.errorPanel,
  ]);

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
            icon={<RetweetOutlined />}
            onClick={() =>
              openEditFacetOrderModal({
                rows: baseRows,
                refetchFacets: refetch,
                resetRowsFromServer: resetFilteredRowsFromServer,
              })
            }
          >
            Edit order
          </Button>
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
            rowData={visibleRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            rowHeight={56}
            loading={loading}
            suppressMovableColumns
            readOnlyEdit
            onCellEditRequest={handleCellEditRequest}
            onCellClicked={handleCellClicked}
            stopEditingWhenCellsLoseFocus
          />
        </div>
        {!loading && visibleRows.length === 0 ? (
          <Typography.Text type="secondary">No facets found</Typography.Text>
        ) : null}
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
