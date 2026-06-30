"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, App, Button, Dropdown, Flex, Typography } from "antd";
import { PlusOutlined, FolderOutlined, TagsOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowDragModule,
  GetRowIdParams,
  CellValueChangedEvent,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useAgGridTheme, useTreeTableDragDrop } from "@/hooks";
import { useSyncProductFeatures } from "../../hooks";
import {
  apiProductFeaturesToAttributeEditorRows,
  buildProductFeaturesSyncDraft,
  createTemporaryFeatureId,
  getProductFeatureEditorLoadErrors,
  parseAttributeValuesText,
  validateAttributeEditorRows,
  formatProductFeatureUserErrors,
} from "../../mappers";
import type { IEditAttributesModalPayload } from "../../modals";

import { useStyles } from "./edit-attributes-modal.styles";
import type { AttributeEditorRow } from "./types";
import { NameCellRenderer, ActionsCellRenderer } from "./components";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

function getMaxRootSortIndex(rows: AttributeEditorRow[]): number {
  return Math.max(
    -1,
    ...rows.filter((row) => row.parentId === null).map((row) => row.sortIndex),
  );
}

export const EditAttributesModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const agGridTheme = useAgGridTheme();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditAttributesModalPayload;
  const productId = typedPayload.productId ?? "";
  const payloadFeatures = typedPayload.features ?? [];
  const onSaved = typedPayload.onSaved;
  const initialRows = useMemo(
    () => apiProductFeaturesToAttributeEditorRows(payloadFeatures),
    [payloadFeatures],
  );
  const loadErrors = useMemo(
    () => getProductFeatureEditorLoadErrors(payloadFeatures),
    [payloadFeatures],
  );
  const [userErrors, setUserErrors] = useState(loadErrors);
  const {
    syncProductFeatures,
    loading: saving,
    error: syncError,
  } = useSyncProductFeatures();

  const markDirty = useCallback(() => {
    setDirty(true);

    if (loadErrors.length === 0) {
      setUserErrors([]);
    }
  }, [loadErrors.length, setDirty]);

  const {
    allRows,
    visibleRows,
    expandedIds,
    handleToggleExpand,
    handleRowDragEnter,
    handleRowDragEnd,
    getRowClass,
    addGroup,
    addChild,
    deleteRow,
    updateRow,
    setAllRows,
  } = useTreeTableDragDrop<AttributeEditorRow>({
    initialRows,
    groupType: "group",
    onRowsChange: markDirty,
  });

  // ========================================
  // Handlers
  // ========================================

  const getRowId = useCallback(
    (params: GetRowIdParams<AttributeEditorRow>) => params.data.id,
    [],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRow(id);
    },
    [deleteRow],
  );

  const handleAddAttribute = useCallback(
    (parentId: string) => {
      const parent = allRows.find((row) => row.id === parentId);
      if (!parent || parent.type !== "group") return;

      const newRow: AttributeEditorRow = {
        id: createTemporaryFeatureId(),
        type: "attribute",
        name: "New Attribute",
        slug: "",
        parentId,
        sortIndex: allRows.filter(
          (row) => row.parentId === parentId && row.type === "attribute",
        ).length,
        level: 1,
        values: [],
      };

      addChild(newRow);
    },
    [allRows, addChild],
  );

  const handleAddGroup = useCallback(() => {
    const newGroup: AttributeEditorRow = {
      id: createTemporaryFeatureId(),
      type: "group",
      name: "New Group",
      slug: "",
      parentId: null,
      sortIndex: getMaxRootSortIndex(allRows) + 1,
      level: 0,
      values: [],
    };

    addGroup(newGroup);
  }, [allRows, addGroup]);

  const handleAddRootAttribute = useCallback(() => {
    const newId = createTemporaryFeatureId();

    setAllRows((prev) => {
      const rootRows = prev
        .filter((row) => row.parentId === null)
        .sort((left, right) => left.sortIndex - right.sortIndex);
      const firstGroup = rootRows.find((row) => row.type === "group");
      const newSortIndex = firstGroup?.sortIndex ?? getMaxRootSortIndex(prev) + 1;
      const shiftedRows = firstGroup
        ? prev.map((row) =>
            row.parentId === null && row.sortIndex >= newSortIndex
              ? { ...row, sortIndex: row.sortIndex + 1 }
              : row,
          )
        : prev;
      const newRow: AttributeEditorRow = {
        id: newId,
        type: "attribute",
        name: "New Attribute",
        slug: "",
        parentId: null,
        sortIndex: newSortIndex,
        level: 0,
        values: [],
      };

      return [...shiftedRows, newRow];
    });

    markDirty();
  }, [setAllRows, markDirty]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<AttributeEditorRow>) => {
      const { data, colDef, newValue } = event;
      if (!data || colDef.field !== "name") return;

      updateRow(data.id, {
        name: typeof newValue === "string" ? newValue : String(newValue ?? ""),
      });
    },
    [updateRow],
  );

  const handleSave = useCallback(async () => {
    if (loadErrors.length > 0) {
      setUserErrors(loadErrors);
      return;
    }

    const validationErrors = validateAttributeEditorRows({
      productId,
      rows: allRows,
    });

    if (validationErrors.length > 0) {
      setUserErrors(validationErrors);
      return;
    }

    const draft = buildProductFeaturesSyncDraft({ productId, rows: allRows });
    const result = await syncProductFeatures(draft.input);

    if (result.userErrors.length > 0) {
      setUserErrors(result.userErrors);
      return;
    }

    await onSaved?.();
    setDirty(false);
    message.success("Product attributes updated");
    forcePop();
  }, [
    allRows,
    forcePop,
    loadErrors,
    message,
    onSaved,
    productId,
    setDirty,
    syncProductFeatures,
  ]);

  // ========================================
  // Column Definitions
  // ========================================

  const columnDefs = useMemo<ColDef<AttributeEditorRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 300,
        editable: true,
        resizable: true,
        rowDrag: true,
        cellRenderer: NameCellRenderer,
        cellRendererParams: {
          expandedIds,
          onToggleExpand: handleToggleExpand,
          allRows,
        },
      },
      {
        colId: "valuesText",
        headerName: "Values",
        flex: 2,
        minWidth: 300,
        editable: (params) => params.data?.type === "attribute",
        valueGetter: (params) => {
          if (params.data?.type !== "attribute") return "";
          return params.data.values.map((value) => value.name).join(", ");
        },
        valueSetter: (params) => {
          const row = params.data;
          if (!row || row.type !== "attribute") return false;

          updateRow(row.id, {
            values: parseAttributeValuesText({
              text:
                typeof params.newValue === "string"
                  ? params.newValue
                  : String(params.newValue ?? ""),
              existingValues: row.values,
            }),
          });

          return false;
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: "",
        width: 60,
        cellRenderer: ActionsCellRenderer,
        cellRendererParams: {
          onDelete: handleDelete,
          onAdd: handleAddAttribute,
        },
        sortable: false,
        filter: false,
      },
    ],
    [
      allRows,
      expandedIds,
      handleAddAttribute,
      handleDelete,
      handleToggleExpand,
      updateRow,
    ],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: false,
      filter: false,
    }),
    [],
  );

  const errorMessages =
    userErrors.length > 0
      ? formatProductFeatureUserErrors(userErrors)
      : syncError
        ? [syncError.message]
        : [];

  return (
    <ModalLayout
      name="edit-attributes"
      header={
        <ModalHeader
          name="edit-attributes"
          title="Edit Product Attributes"
          onClose={pop}
          submitButtonProps={{
            children: "Save Changes",
            onClick: handleSave,
            loading: saving,
            disabled: saving,
          }}
        />
      }
    >
      <div className={styles.container}>
        {errorMessages.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Could not save attributes"
            data-testid="edit-attributes-error-alert"
            description={
              <Flex vertical gap={4}>
                {errorMessages.map((error, index) => (
                  <Typography.Text key={`${error}-${index}`}>
                    {error}
                  </Typography.Text>
                ))}
              </Flex>
            }
          />
        )}

        <Paper>
          <PaperHeader
            bordered={false}
            icon={<TagsOutlined />}
            title="Attributes"
            actions={
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "attribute",
                      label: (
                        <span data-testid="edit-attributes-add-attribute-item">
                          Add Attribute
                        </span>
                      ),
                      icon: <TagsOutlined />,
                      onClick: handleAddRootAttribute,
                    },
                    {
                      key: "group",
                      label: (
                        <span data-testid="edit-attributes-add-group-item">
                          Add Group
                        </span>
                      ),
                      icon: <FolderOutlined />,
                      onClick: handleAddGroup,
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  data-testid="edit-attributes-add-button"
                >
                  Add
                </Button>
              </Dropdown>
            }
          />
        </Paper>

        <div
          className={`${styles.gridWrapper} ag-theme-quartz`}
          data-testid="edit-attributes-grid"
        >
          <AgGridReact<AttributeEditorRow>
            theme={agGridTheme}
            rowData={visibleRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            domLayout="autoHeight"
            animateRows
            suppressMovableColumns
            rowDragManaged
            onCellValueChanged={handleCellValueChanged}
            onRowDragEnter={handleRowDragEnter}
            onRowDragEnd={handleRowDragEnd}
            rowSelection="single"
          />
        </div>
        <Paper>
          <Typography.Text type="secondary">
            Define product characteristics. Organize attributes into logical
            groups for structured display.
          </Typography.Text>
        </Paper>
      </div>
    </ModalLayout>
  );
};
