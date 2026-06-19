"use client";

import { useCallback, useMemo } from "react";
import { Button, Typography, Dropdown, message } from "antd";
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

import { useStyles } from "./edit-attributes-modal.styles";
import type { IAttributeRow } from "./types";
import { createMockData } from "@/mocks/products/attributes";
import { NameCellRenderer, ActionsCellRenderer } from "./components";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

export const EditAttributesModal = () => {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { pop, setDirty } = useModalStackContext();

  // Use shared drag-drop hook
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
  } = useTreeTableDragDrop<IAttributeRow>({
    initialRows: createMockData(),
    groupType: "group",
    onRowsChange: () => setDirty(true),
  });

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // ========================================
  // Handlers
  // ========================================

  const getRowId = useCallback(
    (params: GetRowIdParams<IAttributeRow>) => params.data.id,
    []
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRow(id);
    },
    [deleteRow]
  );

  const handleAddAttribute = useCallback(
    (parentId: string) => {
      const parent = allRows.find((r) => r.id === parentId);
      if (!parent || parent.type !== "group") return;

      const newRow: IAttributeRow = {
        id: `a-${Date.now()}`,
        type: "attribute",
        name: "New Attribute",
        parentId,
        sortIndex: allRows.filter(
          (r) => r.parentId === parentId && r.type === "attribute"
        ).length,
        level: 1,
        values: [],
      };

      addChild(newRow);
    },
    [allRows, addChild]
  );

  const handleAddGroup = useCallback(() => {
    const maxRootSortIndex = Math.max(
      -1,
      ...allRows.filter((r) => r.parentId === null).map((r) => r.sortIndex)
    );

    const newGroup: IAttributeRow = {
      id: `g-${Date.now()}`,
      type: "group",
      name: "New Group",
      parentId: null,
      sortIndex: maxRootSortIndex + 1,
      level: 0,
    };

    addGroup(newGroup);
  }, [allRows, addGroup]);

  const handleAddRootAttribute = useCallback(() => {
    const newId = `a-${Date.now()}`;

    setAllRows((prev) => {
      // Find if there are any groups
      const firstGroupIndex = prev
        .filter((r) => r.parentId === null)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .findIndex((r) => r.type === "group");

      let newSortIndex: number;
      if (firstGroupIndex === -1) {
        // No groups - add at the end
        const maxRootSortIndex = Math.max(
          -1,
          ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
        );
        newSortIndex = maxRootSortIndex + 1;
      } else {
        // Insert before the first group by shifting group sortIndexes
        const rootRows = prev
          .filter((r) => r.parentId === null)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        const firstGroup = rootRows.find((r) => r.type === "group");
        newSortIndex = firstGroup?.sortIndex ?? 0;

        // Shift all groups and their positions
        return [
          ...prev.map((r) => {
            if (r.parentId === null && r.sortIndex >= newSortIndex) {
              return { ...r, sortIndex: r.sortIndex + 1 };
            }
            return r;
          }),
          {
            id: newId,
            type: "attribute" as const,
            name: "New Attribute",
            parentId: null,
            sortIndex: newSortIndex,
            level: 0,
            values: [],
          },
        ];
      }

      const newRow: IAttributeRow = {
        id: newId,
        type: "attribute",
        name: "New Attribute",
        parentId: null,
        sortIndex: newSortIndex,
        level: 0,
        values: [],
      };
      return [...prev, newRow];
    });

    markDirty();
  }, [setAllRows, markDirty]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IAttributeRow>) => {
      const { data, colDef, newValue } = event;
      if (!data) return;

      updateRow(data.id, { [colDef.field as string]: newValue } as Partial<IAttributeRow>);
    },
    [updateRow]
  );

  // ========================================
  // Column Definitions
  // ========================================

  const columnDefs = useMemo<ColDef<IAttributeRow>[]>(
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
        headerName: "Values",
        flex: 2,
        minWidth: 300,
        editable: (params) => params.data?.type === "attribute",
        valueGetter: (params) => {
          if (params.data?.type !== "attribute" || !params.data?.values)
            return "";
          return params.data.values.map((v) => v.name).join(", ");
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
    [handleDelete, handleAddAttribute, handleToggleExpand, expandedIds, allRows]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: false,
      sortable: false,
      filter: false,
    }),
    []
  );

  const handleSave = useCallback(() => {
    message.info("Product attribute updates are not API-backed yet");
  }, []);

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
          }}
        />
      }
    >
      <div className={styles.container}>
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
                      label: "Add Attribute",
                      icon: <TagsOutlined />,
                      onClick: handleAddRootAttribute,
                    },
                    {
                      key: "group",
                      label: "Add Group",
                      icon: <FolderOutlined />,
                      onClick: handleAddGroup,
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button size="small" icon={<PlusOutlined />}>
                  Add
                </Button>
              </Dropdown>
            }
          />
        </Paper>

        <div className={`${styles.gridWrapper} ag-theme-quartz`}>
          <AgGridReact<IAttributeRow>
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
