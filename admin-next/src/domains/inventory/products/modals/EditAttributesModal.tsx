"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createStyles } from "antd-style";
import { Button, Typography, Flex, Dropdown, Space } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  TagsOutlined,
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
    // Transparent resize handles (visible on hover), full height
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
  toolbar: {
    padding: "8px 12px",
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

type RowType = "group" | "attribute";
type DisplayType = "text" | "dropdown" | "multiselect";

interface IAttributeValue {
  id: string;
  name: string;
  slug: string;
  sortIndex: number;
}

interface IAttributeRow {
  id: string;
  type: RowType;
  name: string;
  displayType?: DisplayType;
  parentId: string | null;
  sortIndex: number;
  level: number; // 0 = group, 1 = attribute
  values?: IAttributeValue[]; // Only for attributes
}

// ============================================================================
// Mock Data
// ============================================================================

const createMockData = (): IAttributeRow[] => {
  return [
    // Root-level attributes (before any group)
    {
      id: "a0",
      type: "attribute",
      name: "SKU",
      displayType: "text",
      parentId: null,
      sortIndex: 0,
      level: 0,
      values: [],
    },
    {
      id: "a00",
      type: "attribute",
      name: "Barcode",
      displayType: "text",
      parentId: null,
      sortIndex: 1,
      level: 0,
      values: [],
    },

    // Group: Physical Properties
    { id: "g1", type: "group", name: "Physical Properties", parentId: null, sortIndex: 2, level: 0 },
    {
      id: "a1",
      type: "attribute",
      name: "Material",
      displayType: "dropdown",
      parentId: "g1",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v1", name: "Cotton", slug: "cotton", sortIndex: 0 },
        { id: "v2", name: "Wool", slug: "wool", sortIndex: 1 },
        { id: "v3", name: "Silk", slug: "silk", sortIndex: 2 },
      ],
    },
    {
      id: "a2",
      type: "attribute",
      name: "Weight",
      displayType: "text",
      parentId: "g1",
      sortIndex: 1,
      level: 1,
      values: [
        { id: "v4", name: "Light", slug: "light", sortIndex: 0 },
        { id: "v5", name: "Medium", slug: "medium", sortIndex: 1 },
        { id: "v6", name: "Heavy", slug: "heavy", sortIndex: 2 },
      ],
    },

    // Group: Brand Info
    { id: "g2", type: "group", name: "Brand Info", parentId: null, sortIndex: 3, level: 0 },
    {
      id: "a3",
      type: "attribute",
      name: "Brand",
      displayType: "dropdown",
      parentId: "g2",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v7", name: "Nike", slug: "nike", sortIndex: 0 },
        { id: "v8", name: "Adidas", slug: "adidas", sortIndex: 1 },
        { id: "v9", name: "Puma", slug: "puma", sortIndex: 2 },
      ],
    },

    // Group: Specifications
    { id: "g3", type: "group", name: "Specifications", parentId: null, sortIndex: 4, level: 0 },
    {
      id: "a4",
      type: "attribute",
      name: "Country of Origin",
      displayType: "dropdown",
      parentId: "g3",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v10", name: "China", slug: "china", sortIndex: 0 },
        { id: "v11", name: "Vietnam", slug: "vietnam", sortIndex: 1 },
        { id: "v12", name: "Italy", slug: "italy", sortIndex: 2 },
      ],
    },
  ];
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
  // Only groups can have children (attributes)
  const hasChildren = data.type === "group" && allRows.some((r) => r.parentId === data.id);
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
  onAdd: (parentId: string) => void;
}

const ActionsCellRenderer = (params: IActionsCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const menuItems: Array<{ key: string; label: string; icon: React.ReactNode; danger?: boolean }> = [];

  if (data.type === "group") {
    menuItems.push({ key: "add-attribute", label: "Add Attribute", icon: <PlusOutlined /> });
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
              params.onAdd(data.id);
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
    // Initially expand all groups
    const initial = createMockData();
    return new Set(initial.filter((r) => r.type === "group").map((r) => r.id));
  });
  const expandedBeforeDragRef = useRef<Set<string> | null>(null);
  const draggingRowIdRef = useRef<string | null>(null);

  // Refs to avoid stale closures in drag handlers
  const allRowsRef = useRef(allRows);
  const expandedIdsRef = useRef(expandedIds);
  useEffect(() => {
    allRowsRef.current = allRows;
  }, [allRows]);
  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  }, [expandedIds]);

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Filter visible rows based on expanded state (only groups can be collapsed)
  const visibleRows = useMemo(() => {
    const result: IAttributeRow[] = [];

    // Get root-level rows (both groups and attributes with parentId: null)
    const rootRows = allRows
      .filter((r) => r.parentId === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    for (const row of rootRows) {
      result.push(row);

      // If this is a group and it's expanded, add its children (attributes)
      if (row.type === "group" && expandedIds.has(row.id)) {
        const children = allRows
          .filter((r) => r.parentId === row.id)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        result.push(...children);
      }
    }

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

  // Handle row drag enter - collapse all groups when dragging a group
  const handleRowDragEnter = useCallback((event: RowDragEnterEvent<IAttributeRow>) => {
    const movingData = event.node?.data;
    if (!movingData) return;

    if (draggingRowIdRef.current === movingData.id) return;

    draggingRowIdRef.current = movingData.id;
    expandedBeforeDragRef.current = new Set(expandedIdsRef.current);

    // Collapse ALL groups when dragging a group for easier reordering
    if (movingData.type === "group") {
      setExpandedIds(new Set());
    }
  }, []);

  // Handle row drag end
  const handleRowDragEnd = useCallback((event: RowDragEndEvent<IAttributeRow>) => {
    const savedExpandedIds = expandedBeforeDragRef.current;
    draggingRowIdRef.current = null;
    expandedBeforeDragRef.current = null;

    const movingNode = event.node;
    const movingData = movingNode?.data;

    if (!movingData) {
      if (savedExpandedIds) setExpandedIds(savedExpandedIds);
      return;
    }

    // Get the new order from the grid API
    const newOrderedRows: IAttributeRow[] = [];
    event.api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) newOrderedRows.push(node.data);
    });

    // Update sortIndex and parentId based on the new visual order
    // Rule: attributes before the first group stay at root level (parentId: null)
    //       attributes after a group belong to that group
    setAllRows((prev) => {
      const rootSortIndexMap = new Map<string, number>(); // For root-level items (groups + root attrs)
      const attrNewParentMap = new Map<string, string | null>(); // attrId -> new parentId (null = root)
      const attrSortIndexByParent = new Map<string | null, Map<string, number>>(); // parentId -> (attrId -> sortIndex)

      let currentGroupId: string | null = null;
      let rootIndex = 0;

      for (const row of newOrderedRows) {
        if (row.type === "group") {
          currentGroupId = row.id;
          rootSortIndexMap.set(row.id, rootIndex++);
        } else if (row.type === "attribute") {
          if (currentGroupId === null) {
            // Attribute before any group - stays at root level
            attrNewParentMap.set(row.id, null);
            rootSortIndexMap.set(row.id, rootIndex++);
          } else {
            // Attribute after a group - belongs to that group
            attrNewParentMap.set(row.id, currentGroupId);

            if (!attrSortIndexByParent.has(currentGroupId)) {
              attrSortIndexByParent.set(currentGroupId, new Map());
            }
            const parentMap = attrSortIndexByParent.get(currentGroupId)!;
            parentMap.set(row.id, parentMap.size);
          }
        }
      }

      return prev.map((r) => {
        if (r.type === "group" && rootSortIndexMap.has(r.id)) {
          return { ...r, sortIndex: rootSortIndexMap.get(r.id)! };
        }
        if (r.type === "attribute" && attrNewParentMap.has(r.id)) {
          const newParentId = attrNewParentMap.get(r.id)!;
          if (newParentId === null) {
            // Root-level attribute
            const newSortIndex = rootSortIndexMap.get(r.id) ?? r.sortIndex;
            return { ...r, parentId: null, sortIndex: newSortIndex, level: 0 };
          } else {
            // Grouped attribute
            const parentMap = attrSortIndexByParent.get(newParentId);
            const newSortIndex = parentMap?.get(r.id) ?? r.sortIndex;
            return { ...r, parentId: newParentId, sortIndex: newSortIndex, level: 1 };
          }
        }
        return r;
      });
    });

    // Restore expanded state after updating the order
    if (savedExpandedIds) {
      setExpandedIds(savedExpandedIds);
    }

    markDirty();
  }, [markDirty]);

  const handleDelete = useCallback((id: string) => {
    setAllRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (!row) return prev;

      if (row.type === "group") {
        // Delete group and all its attributes
        return prev.filter((r) => r.id !== id && r.parentId !== id);
      }
      // Delete just the attribute
      return prev.filter((r) => r.id !== id);
    });
    markDirty();
  }, [markDirty]);

  const handleAddAttribute = useCallback((parentId: string) => {
    setAllRows((prev) => {
      const parent = prev.find((r) => r.id === parentId);
      if (!parent || parent.type !== "group") return prev;

      const newId = `a-${Date.now()}`;
      const newName = "New Attribute";

      const newRow: IAttributeRow = {
        id: newId,
        type: "attribute",
        name: newName,
        displayType: "text",
        parentId,
        sortIndex: prev.filter((r) => r.parentId === parentId && r.type === "attribute").length,
        level: 1,
        values: [],
      };

      return [...prev, newRow];
    });

    setExpandedIds((prev) => new Set([...prev, parentId]));
    markDirty();
  }, [markDirty]);

  const handleAddGroup = useCallback(() => {
    const newId = `g-${Date.now()}`;

    setAllRows((prev) => {
      // Find the max sortIndex among root-level items
      const maxRootSortIndex = Math.max(
        -1,
        ...prev.filter((r) => r.parentId === null).map((r) => r.sortIndex)
      );

      const newGroup: IAttributeRow = {
        id: newId,
        type: "group",
        name: "New Group",
        parentId: null,
        sortIndex: maxRootSortIndex + 1,
        level: 0,
      };
      return [...prev, newGroup];
    });
    setExpandedIds((prev) => new Set([...prev, newId]));
    markDirty();
  }, [markDirty]);

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
            displayType: "text" as const,
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
        displayType: "text",
        parentId: null,
        sortIndex: newSortIndex,
        level: 0,
        values: [],
      };
      return [...prev, newRow];
    });

    markDirty();
  }, [markDirty]);

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
      default:
        return "";
    }
  }, []);

  const columnDefs = useMemo<ColDef<IAttributeRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 200,
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
          if (params.data?.type !== "attribute" || !params.data?.values) return "";
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
          <div className={styles.toolbar}>
            <Flex justify="space-between" align="center">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Drag to reorder. Attributes before groups stay ungrouped; after a group they belong to it.
              </Typography.Text>
              <Space>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddRootAttribute}
                >
                  Add Attribute
                </Button>
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
        </Paper>

        <div className={`${styles.gridWrapper} ag-theme-quartz`}>
          <AgGridReact<IAttributeRow>
            ref={gridRef}
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
      </div>
    </ModalLayout>
  );
};
