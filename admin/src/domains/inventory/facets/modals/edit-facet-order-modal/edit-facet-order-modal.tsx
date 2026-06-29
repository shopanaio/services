"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, App, Flex } from "antd";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ColDef,
  GetRowIdParams,
  ModuleRegistry,
  RowDragModule,
} from "ag-grid-community";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { useAgGridTheme } from "@/hooks";
import { FacetTreeNameCell } from "../../components";
import { useFacetOrderTreeRows, useSaveFacetOrder } from "../../hooks";
import type { IEditFacetOrderModalPayload } from "../../modals";
import type {
  FacetGridRow,
  FacetOrderEdit,
  FacetOrderRowId,
} from "../../mappers";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    padding: token.padding,
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
  },
  error: {
    margin: token.margin,
    marginBottom: 0,
  },
}));

export function EditFacetOrderModal() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditFacetOrderModalPayload;
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<
    Partial<Record<FacetOrderRowId, unknown[]>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderEdits, setOrderEdits] = useState<
    Partial<Record<FacetOrderRowId, FacetOrderEdit>>
  >({});

  const handleFacetOrderEdit = useCallback(
    (rowId: string, edit: FacetOrderEdit) => {
      const typedRowId = rowId as FacetOrderRowId;
      setOrderEdits((current) => {
        const next = { ...current };
        if (
          edit.parentId === edit.originalParentId &&
          edit.sortIndex === edit.originalSortIndex
        ) {
          delete next[typedRowId];
        } else {
          next[typedRowId] = edit;
        }
        return next;
      });
      setRowErrors((current) => {
        const { [typedRowId]: _removed, ...rest } = current;
        return rest;
      });
      setSubmitError(null);
    },
    [],
  );

  const {
    allRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    handleRowDragEnter,
    handleRowDragEnd,
    getRowClass,
  } = useFacetOrderTreeRows({
    initialRows: typedPayload.rows,
    onFacetOrderEdit: handleFacetOrderEdit,
    onInvalidMove: (warning) => message.warning(warning),
    valueDragMode: "disabled",
  });

  const { saveFacetOrder } = useSaveFacetOrder({
    refetchFacets: typedPayload.refetchFacets,
    resetRowsFromServer: typedPayload.resetRowsFromServer,
    onSaved: pop,
  });

  const getRowId = useCallback(
    (params: GetRowIdParams<FacetGridRow>) => params.data.id,
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSubmitError(null);
    setRowErrors({});

    const result = await saveFacetOrder(orderEdits);
    setSaving(false);

    if (!result.ok) {
      setRowErrors(result.rowErrors);
      setSubmitError(result.submitErrors[0]?.message ?? null);
    }
  }, [orderEdits, saveFacetOrder]);

  const columnDefs = useMemo<ColDef<FacetGridRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Facet / Value",
        flex: 1,
        minWidth: 340,
        rowDrag: (params) => params.data?.type === "facet",
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
        field: "sortIndex",
        headerName: "Order",
        minWidth: 100,
      },
    ],
    [allRows, expandedIds, handleToggleExpand],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
    }),
    [],
  );

  const firstRowError = Object.values(rowErrors).flat()[0] as
    | { message?: string }
    | undefined;
  const errorMessage = submitError ?? firstRowError?.message ?? null;

  return (
    <ModalLayout
      name="edit-facet-order"
      fullWidth
      header={
        <ModalHeader
          name="edit-facet-order"
          title="Edit facet order"
          onClose={pop}
          submitButtonProps={{
            loading: saving,
            disabled: saving,
            onClick: handleSave,
          }}
        />
      }
    >
      {errorMessage && (
        <Alert
          className={styles.error}
          type="error"
          showIcon
          message={errorMessage}
        />
      )}
      <Flex vertical style={{ flex: 1, minHeight: 0 }}>
        <div className={styles.gridWrapper}>
          <AgGridReact<FacetGridRow>
            theme={agGridTheme}
            rowData={visibleRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            rowHeight={56}
            rowDragManaged
            animateRows
            suppressMovableColumns
            onRowDragEnter={handleRowDragEnter}
            onRowDragEnd={handleRowDragEnd}
          />
        </div>
      </Flex>
    </ModalLayout>
  );
}
