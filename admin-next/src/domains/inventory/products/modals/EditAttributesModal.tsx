"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { createStyles } from "antd-style";
import { Button, Typography, Flex, Dropdown, Space } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  TagsOutlined,
  TagOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowDragModule,
  GetRowIdParams,
  ICellRendererParams,
  CellValueChangedEvent,
  RowDragEndEvent,
  RowDragEnterEvent,
} from "ag-grid-community";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";

ModuleRegistry.registerModules([AllCommunityModule, RowDragModule]);

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  gridWrapper: {
    width: "100%",
    "& .ag-header-cell": {
      fontSize: 12,
      fontWeight: 500,
    },
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
    },
    "& .row-group": {
      fontWeight: 600,
    },
    "& .row-attribute": {
      background: `${token.colorBgContainer} !important`,
    },
    "& .row-value": {
      background: `${token.colorBgContainer} !important`,
    },
  },
  toolbar: {
    padding: "8px 12px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    borderRadius: "8px 8px 0 0",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  expandIcon: {
    cursor: "pointer",
    fontSize: 10,
    color: token.colorTextSecondary,
    width: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      color: token.colorText,
    },
  },
  expandIconPlaceholder: {
    width: 16,
  },
  groupIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  attributeIcon: {
    color: token.colorSuccess,
    fontSize: 14,
  },
  valueIcon: {
    color: token.colorTextSecondary,
    fontSize: 12,
  },
  actionsCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  indent: {
    display: "inline-block",
  },
}));

// ============================================================================
// Types
// ============================================================================

type RowType = "group" | "attribute" | "value";
type DisplayType = "text" | "dropdown" | "multiselect";

interface IAttributeRow {
  id: string;
  type: RowType;
  name: string;
  slug: string;
  displayType?: DisplayType;
  parentId: string | null;
  sortIndex: number;
  level: number; // 0 = group, 1 = attribute, 2 = value
}

// ============================================================================
// Mock Data
// ============================================================================

const createMockData = (): IAttributeRow[] => {
  return [
    // Group: Physical Properties
    { id: "g1", type: "group", name: "Physical Properties", slug: "", parentId: null, sortIndex: 0, level: 0 },
    { id: "a1", type: "attribute", name: "Material", slug: "material", displayType: "dropdown", parentId: "g1", sortIndex: 0, level: 1 },
    { id: "v1", type: "value", name: "Cotton", slug: "cotton", parentId: "a1", sortIndex: 0, level: 2 },
    { id: "v2", type: "value", name: "Wool", slug: "wool", parentId: "a1", sortIndex: 1, level: 2 },
    { id: "v3", type: "value", name: "Silk", slug: "silk", parentId: "a1", sortIndex: 2, level: 2 },

    { id: "a2", type: "attribute", name: "Weight", slug: "weight", displayType: "text", parentId: "g1", sortIndex: 1, level: 1 },
    { id: "v4", type: "value", name: "Light", slug: "light", parentId: "a2", sortIndex: 0, level: 2 },
    { id: "v5", type: "value", name: "Medium", slug: "medium", parentId: "a2", sortIndex: 1, level: 2 },
    { id: "v6", type: "value", name: "Heavy", slug: "heavy", parentId: "a2", sortIndex: 2, level: 2 },

    // Group: Brand Info
    { id: "g2", type: "group", name: "Brand Info", slug: "", parentId: null, sortIndex: 1, level: 0 },
    { id: "a3", type: "attribute", name: "Brand", slug: "brand", displayType: "dropdown", parentId: "g2", sortIndex: 0, level: 1 },
    { id: "v7", type: "value", name: "Nike", slug: "nike", parentId: "a3", sortIndex: 0, level: 2 },
    { id: "v8", type: "value", name: "Adidas", slug: "adidas", parentId: "a3", sortIndex: 1, level: 2 },
    { id: "v9", type: "value", name: "Puma", slug: "puma", parentId: "a3", sortIndex: 2, level: 2 },

    // Group: Specifications
    { id: "g3", type: "group", name: "Specifications", slug: "", parentId: null, sortIndex: 2, level: 0 },
    { id: "a4", type: "attribute", name: "Country of Origin", slug: "country-of-origin", displayType: "dropdown", parentId: "g3", sortIndex: 0, level: 1 },
    { id: "v10", type: "value", name: "China", slug: "china", parentId: "a4", sortIndex: 0, level: 2 },
    { id: "v11", type: "value", name: "Vietnam", slug: "vietnam", parentId: "a4", sortIndex: 1, level: 2 },
    { id: "v12", type: "value", name: "Italy", slug: "italy", parentId: "a4", sortIndex: 2, level: 2 },
  ];
};


// ============================================================================
// Utility: Get all descendants of a row
// ============================================================================

const getDescendantIds = (rowId: string, allRows: IAttributeRow[]): string[] => {
  const directChildren = allRows.filter((r) => r.parentId === rowId);
  const allDescendants: string[] = [];

  for (const child of directChildren) {
    allDescendants.push(child.id);
    allDescendants.push(...getDescendantIds(child.id, allRows));
  }

  return allDescendants;
};

// ============================================================================
// Cell Renderers
// ============================================================================

interface INameCellRendererParams extends ICellRendererParams<IAttributeRow> {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  allRows: IAttributeRow[];
}

const NameCellRenderer = (params: INameCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const { expandedIds, onToggleExpand, allRows } = params;
  const hasChildren = allRows.some((r) => r.parentId === data.id);
  const isExpanded = expandedIds.has(data.id);

  const getIcon = () => {
    switch (data.type) {
      case "group":
        return isExpanded ? (
          <FolderOpenOutlined className={styles.groupIcon} />
        ) : (
          <FolderOutlined className={styles.groupIcon} />
        );
      case "attribute":
        return <TagsOutlined className={styles.attributeIcon} />;
      case "value":
        return <TagOutlined className={styles.valueIcon} />;
      default:
        return null;
    }
  };

  const indent = data.level * 24;

  return (
    <div className={styles.nameCell}>
      <span className={styles.indent} style={{ width: indent }} />

      {hasChildren ? (
        <span
          className={styles.expandIcon}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(data.id);
          }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      ) : (
        <span className={styles.expandIconPlaceholder} />
      )}

      {getIcon()}
      <span>{data.name}</span>
    </div>
  );
};

interface IActionsCellRendererParams extends ICellRendererParams<IAttributeRow> {
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: RowType) => void;
}

const ActionsCellRenderer = (params: IActionsCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const menuItems: Array<{ key: string; label: string; icon: React.ReactNode; danger?: boolean }> = [];

  if (data.type === "group") {
    menuItems.push({ key: "add-attribute", label: "Add Attribute", icon: <PlusOutlined /> });
  }

  if (data.type === "attribute") {
    menuItems.push({ key: "add-value", label: "Add Value", icon: <PlusOutlined /> });
  }

  menuItems.push({ key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true });

  return (
    <div className={styles.actionsCell}>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === "delete") {
              params.onDelete(data.id);
            } else if (key === "add-attribute") {
              params.onAdd(data.id, "attribute");
            } else if (key === "add-value") {
              params.onAdd(data.id, "value");
            }
          },
        }}
        trigger={["click"]}
      >
        <Button size="small" type="text" icon={<MoreOutlined />} />
      </Dropdown>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EditAttributesModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty } = useModalStackContext();
  const gridRef = useRef<AgGridReact<IAttributeRow>>(null);

  const [allRows, setAllRows] = useState<IAttributeRow[]>(createMockData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand all groups and attributes
    const initial = createMockData();
    return new Set(initial.filter((r) => r.type === "group" || r.type === "attribute").map((r) => r.id));
  });
  const expandedBeforeDragRef = useRef<Set<string> | null>(null);
  const draggingRowIdRef = useRef<string | null>(null);

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Filter visible rows based on expanded state
  const visibleRows = useMemo(() => {
    const result: IAttributeRow[] = [];

    const addRowAndChildren = (parentId: string | null) => {
      const children = allRows
        .filter((r) => r.parentId === parentId)
        .sort((a, b) => a.sortIndex - b.sortIndex);

      for (const child of children) {
        result.push(child);

        // If this row is expanded, add its children
        if (expandedIds.has(child.id)) {
          addRowAndChildren(child.id);
        }
      }
    };

    addRowAndChildren(null);
    return result;
  }, [allRows, expandedIds]);

  const getRowId = useCallback((params: GetRowIdParams<IAttributeRow>) => params.data.id, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle row drag enter - collapse groups/attributes for easier reordering
  const handleRowDragEnter = useCallback((event: RowDragEnterEvent<IAttributeRow>) => {
    const movingData = event.node?.data;
    if (!movingData) return;

    // Skip if we're already tracking this drag (use ref for sync check)
    if (draggingRowIdRef.current === movingData.id) return;

    draggingRowIdRef.current = movingData.id;

    // Save current expanded state before collapsing
    expandedBeforeDragRef.current = new Set(expandedIds);

    if (movingData.type === "group") {
      // When dragging a group - collapse ALL groups (including the one being dragged)
      const allGroups = allRows.filter((r) => r.type === "group");

      setExpandedIds((prev) => {
        const next = new Set(prev);
        allGroups.forEach((r) => next.delete(r.id));
        return next;
      });
    } else if (movingData.type === "attribute") {
      // When dragging an attribute - collapse ALL attributes in ALL groups
      const allAttributes = allRows.filter((r) => r.type === "attribute");

      setExpandedIds((prev) => {
        const next = new Set(prev);
        allAttributes.forEach((r) => next.delete(r.id));
        return next;
      });
    }
  }, [expandedIds, allRows]);

  // Handle row drag end - reorder or move to different parent
  const handleRowDragEnd = useCallback((event: RowDragEndEvent<IAttributeRow>) => {
    // Restore expanded state
    if (expandedBeforeDragRef.current) {
      setExpandedIds(expandedBeforeDragRef.current);
      expandedBeforeDragRef.current = null;
    }
    draggingRowIdRef.current = null;

    const movingNode = event.node;
    const overNode = event.overNode;

    if (!movingNode?.data || !overNode?.data) return;

    const movingData = movingNode.data;
    const overData = overNode.data;


    // Handle moving attribute to a different group
    if (movingData.type === "attribute" && overData.type === "group") {
      // Move attribute to the target group
      setAllRows((prev) => {
        const newParentId = overData.id;
        const attributesInNewParent = prev.filter(
          (r) => r.parentId === newParentId && r.type === "attribute"
        );
        const newSortIndex = attributesInNewParent.length;

        return prev.map((r) => {
          if (r.id === movingData.id) {
            return { ...r, parentId: newParentId, sortIndex: newSortIndex };
          }
          return r;
        });
      });
      markDirty();
      return;
    }

    // Handle moving attribute before/after another attribute (possibly in different group)
    if (movingData.type === "attribute" && overData.type === "attribute") {
      const newParentId = overData.parentId;
      const isSameParent = movingData.parentId === newParentId;

      setAllRows((prev) => {
        if (isSameParent) {
          // Reorder within same group
          const siblings = prev
            .filter((r) => r.parentId === newParentId && r.type === "attribute")
            .sort((a, b) => a.sortIndex - b.sortIndex);

          const movingIndex = siblings.findIndex((r) => r.id === movingData.id);
          const overIndex = siblings.findIndex((r) => r.id === overData.id);

          if (movingIndex === -1 || overIndex === -1 || movingIndex === overIndex) return prev;

          const reordered = [...siblings];
          const [removed] = reordered.splice(movingIndex, 1);
          reordered.splice(overIndex, 0, removed);

          const updatedIds = new Map<string, number>();
          reordered.forEach((r, idx) => updatedIds.set(r.id, idx));

          return prev.map((r) => {
            if (updatedIds.has(r.id)) {
              return { ...r, sortIndex: updatedIds.get(r.id)! };
            }
            return r;
          });
        } else {
          // Move to different group
          const targetSiblings = prev
            .filter((r) => r.parentId === newParentId && r.type === "attribute")
            .sort((a, b) => a.sortIndex - b.sortIndex);

          const overIndex = targetSiblings.findIndex((r) => r.id === overData.id);
          const newSortIndex = overIndex >= 0 ? overIndex : targetSiblings.length;

          // Update moved attribute and recalculate sort indices
          const updatedRows = prev.map((r) => {
            if (r.id === movingData.id) {
              return { ...r, parentId: newParentId, sortIndex: newSortIndex };
            }
            // Shift existing attributes in target group
            if (r.parentId === newParentId && r.type === "attribute" && r.sortIndex >= newSortIndex) {
              return { ...r, sortIndex: r.sortIndex + 1 };
            }
            return r;
          });

          return updatedRows;
        }
      });
      markDirty();
      return;
    }

    // Groups can only reorder among groups
    if (movingData.type === "group" && overData.type === "group") {
      setAllRows((prev) => {
        const groups = prev
          .filter((r) => r.type === "group")
          .sort((a, b) => a.sortIndex - b.sortIndex);

        const movingIndex = groups.findIndex((r) => r.id === movingData.id);
        const overIndex = groups.findIndex((r) => r.id === overData.id);

        if (movingIndex === -1 || overIndex === -1 || movingIndex === overIndex) return prev;

        const reordered = [...groups];
        const [removed] = reordered.splice(movingIndex, 1);
        reordered.splice(overIndex, 0, removed);

        const updatedIds = new Map<string, number>();
        reordered.forEach((r, idx) => updatedIds.set(r.id, idx));

        return prev.map((r) => {
          if (updatedIds.has(r.id)) {
            return { ...r, sortIndex: updatedIds.get(r.id)! };
          }
          return r;
        });
      });
      markDirty();
      return;
    }

    // Handle moving value to a different attribute
    if (movingData.type === "value" && overData.type === "attribute") {
      setAllRows((prev) => {
        const newParentId = overData.id;
        const valuesInNewParent = prev.filter(
          (r) => r.parentId === newParentId && r.type === "value"
        );
        const newSortIndex = valuesInNewParent.length;

        return prev.map((r) => {
          if (r.id === movingData.id) {
            return { ...r, parentId: newParentId, sortIndex: newSortIndex };
          }
          return r;
        });
      });
      markDirty();
      return;
    }

    // Handle moving value before/after another value (possibly in different attribute)
    if (movingData.type === "value" && overData.type === "value") {
      const newParentId = overData.parentId;
      const isSameParent = movingData.parentId === newParentId;

      setAllRows((prev) => {
        if (isSameParent) {
          // Reorder within same attribute
          const siblings = prev
            .filter((r) => r.parentId === newParentId && r.type === "value")
            .sort((a, b) => a.sortIndex - b.sortIndex);

          const movingIndex = siblings.findIndex((r) => r.id === movingData.id);
          const overIndex = siblings.findIndex((r) => r.id === overData.id);

          if (movingIndex === -1 || overIndex === -1 || movingIndex === overIndex) return prev;

          const reordered = [...siblings];
          const [removed] = reordered.splice(movingIndex, 1);
          reordered.splice(overIndex, 0, removed);

          const updatedIds = new Map<string, number>();
          reordered.forEach((r, idx) => updatedIds.set(r.id, idx));

          return prev.map((r) => {
            if (updatedIds.has(r.id)) {
              return { ...r, sortIndex: updatedIds.get(r.id)! };
            }
            return r;
          });
        } else {
          // Move to different attribute
          const targetSiblings = prev
            .filter((r) => r.parentId === newParentId && r.type === "value")
            .sort((a, b) => a.sortIndex - b.sortIndex);

          const overIndex = targetSiblings.findIndex((r) => r.id === overData.id);
          const newSortIndex = overIndex >= 0 ? overIndex : targetSiblings.length;

          const updatedRows = prev.map((r) => {
            if (r.id === movingData.id) {
              return { ...r, parentId: newParentId, sortIndex: newSortIndex };
            }
            if (r.parentId === newParentId && r.type === "value" && r.sortIndex >= newSortIndex) {
              return { ...r, sortIndex: r.sortIndex + 1 };
            }
            return r;
          });

          return updatedRows;
        }
      });
      markDirty();
    }
  }, [markDirty]);


  const handleDelete = useCallback((id: string) => {
    setAllRows((prev) => {
      const descendantIds = getDescendantIds(id, prev);
      const idsToDelete = new Set([id, ...descendantIds]);
      return prev.filter((r) => !idsToDelete.has(r.id));
    });
    markDirty();
  }, [markDirty]);

  const handleAdd = useCallback((parentId: string, type: RowType) => {
    setAllRows((prev) => {
      const parent = prev.find((r) => r.id === parentId);
      if (!parent) return prev;

      const newId = `${type[0]}-${Date.now()}`;
      const newName = type === "attribute" ? "New Attribute" : "New Value";
      const newSlug = newName.toLowerCase().replace(/\s+/g, "-");
      const level = parent.level + 1;

      const newRow: IAttributeRow = {
        id: newId,
        type,
        name: newName,
        slug: newSlug,
        displayType: type === "attribute" ? "text" : undefined,
        parentId,
        sortIndex: prev.filter((r) => r.parentId === parentId && r.type === type).length,
        level,
      };

      return [...prev, newRow];
    });

    // Expand parent to show new item
    setExpandedIds((prev) => new Set([...prev, parentId]));
    markDirty();
  }, [markDirty]);

  const handleAddGroup = useCallback(() => {
    const newId = `g-${Date.now()}`;
    const newName = "New Group";

    const newGroup: IAttributeRow = {
      id: newId,
      type: "group",
      name: newName,
      slug: "",
      parentId: null,
      sortIndex: allRows.filter((r) => r.type === "group").length,
      level: 0,
    };

    setAllRows((prev) => [...prev, newGroup]);
    setExpandedIds((prev) => new Set([...prev, newId]));
    markDirty();
  }, [allRows, markDirty]);

  const handleCellValueChanged = useCallback((event: CellValueChangedEvent<IAttributeRow>) => {
    const { data, colDef, newValue } = event;
    if (!data) return;

    setAllRows((prev) =>
      prev.map((r) => {
        if (r.id === data.id) {
          return { ...r, [colDef.field as string]: newValue };
        }
        return r;
      })
    );

    markDirty();
  }, [markDirty]);


  const getRowClass = useCallback((params: { data: IAttributeRow | undefined }) => {
    const data = params.data;
    if (!data) return "";

    switch (data.type) {
      case "group":
        return "row-group";
      case "attribute":
        return "row-attribute";
      case "value":
        return "row-value";
      default:
        return "";
    }
  }, []);

  const isSlugEditable = useCallback((params: { data: IAttributeRow | undefined }) => {
    return params.data?.type !== "group";
  }, []);

  const columnDefs = useMemo<ColDef<IAttributeRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 2,
        minWidth: 300,
        editable: true,
        rowDrag: true,
        cellRenderer: NameCellRenderer,
        cellRendererParams: {
          expandedIds,
          onToggleExpand: handleToggleExpand,
          allRows,
        },
      },
      {
        field: "slug",
        headerName: "Slug",
        flex: 1,
        minWidth: 150,
        editable: isSlugEditable,
        cellStyle: { fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 },
        valueGetter: (params) => params.data?.slug ?? "",
      },
      {
        headerName: "",
        width: 60,
        cellRenderer: ActionsCellRenderer,
        cellRendererParams: {
          onDelete: handleDelete,
          onAdd: handleAdd,
        },
        sortable: false,
        filter: false,
      },
    ],
    [handleDelete, handleAdd, handleToggleExpand, isSlugEditable, expandedIds, allRows]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const handleSave = useCallback(() => {
    console.log("Saving attributes:", allRows);
    pop();
  }, [allRows, pop]);

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
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <Flex justify="space-between" align="center">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Organize attributes into groups. Click arrows to expand/collapse.
              </Typography.Text>
              <Space>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddGroup}
                >
                  Add Group
                </Button>
              </Space>
            </Flex>
          </div>

          {/* AG Grid */}
          <div className={`${styles.gridWrapper} ag-theme-quartz`}>
            <AgGridReact<IAttributeRow>
              ref={gridRef}
              rowData={visibleRows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={getRowId}
              getRowClass={getRowClass}
              domLayout="autoHeight"
              animateRows={false}
              rowDragManaged
              suppressMoveWhenRowDragging
              onCellValueChanged={handleCellValueChanged}
              onRowDragEnter={handleRowDragEnter}
              onRowDragEnd={handleRowDragEnd}
              rowSelection="single"
            />
          </div>
        </Paper>
      </div>
    </ModalLayout>
  );
};
