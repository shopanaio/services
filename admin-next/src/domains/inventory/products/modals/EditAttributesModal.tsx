"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { createStyles } from "antd-style";
import { Button, Typography, Flex, Dropdown, Space, Input, Tag } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  TagsOutlined,
  RightOutlined,
  DownOutlined,
  HolderOutlined,
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
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  // Value tags styles
  valuesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    padding: "4px 0",
  },
  valueTag: {
    cursor: "grab",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    "&:active": {
      cursor: "grabbing",
    },
  },
  valueTagDragging: {
    opacity: 0.5,
  },
  valueDragHandle: {
    color: token.colorTextSecondary,
    fontSize: 10,
    display: "flex",
    alignItems: "center",
  },
  addValueInput: {
    width: 80,
    fontSize: 12,
  },
  valueEditInput: {
    width: "auto",
    minWidth: 40,
    maxWidth: 120,
    fontSize: 12,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: 0,
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
    // Group: Physical Properties
    { id: "g1", type: "group", name: "Physical Properties", parentId: null, sortIndex: 0, level: 0 },
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
    { id: "g2", type: "group", name: "Brand Info", parentId: null, sortIndex: 1, level: 0 },
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
    { id: "g3", type: "group", name: "Specifications", parentId: null, sortIndex: 2, level: 0 },
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
// Sortable Value Tag Component
// ============================================================================

interface ISortableValueTagProps {
  value: IAttributeValue;
  onEdit: (value: IAttributeValue) => void;
}

const SortableValueTag = ({ value, onEdit }: ISortableValueTagProps) => {
  const { styles, cx } = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(value.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(value.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== value.name) {
      const newSlug = trimmed.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      onEdit({ ...value, name: trimmed, slug: newSlug });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditName(value.name);
      setIsEditing(false);
    } else if (e.key === "Backspace" && editName === "") {
      // Delete value when backspace on empty input
      setIsEditing(false);
      onEdit({ ...value, name: "" }); // Signal deletion with empty name
    }
  };

  return (
    <Tag
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      className={cx(
        styles.valueTag,
        isDragging && styles.valueTagDragging
      )}
      onDoubleClick={handleDoubleClick}
      color={isEditing ? "processing" : undefined}
    >
      <span className={styles.valueDragHandle}>
        <HolderOutlined />
      </span>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.valueEditInput}
          autoFocus
        />
      ) : (
        value.name
      )}
    </Tag>
  );
};

// ============================================================================
// Values Cell Renderer
// ============================================================================

interface IValuesCellRendererParams extends ICellRendererParams<IAttributeRow> {
  onUpdateValues: (attributeId: string, values: IAttributeValue[]) => void;
  onAddValue: (attributeId: string, name: string) => void;
}

const ValuesCellRenderer = (params: IValuesCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  const [newValueName, setNewValueName] = useState("");
  const [activeValueId, setActiveValueId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!data || data.type !== "attribute" || !data.values) {
    return null;
  }

  const handleAddValue = () => {
    const trimmed = newValueName.trim();
    if (trimmed) {
      params.onAddValue(data.id, trimmed);
      setNewValueName("");
    }
  };

  const handleEditValue = (updated: IAttributeValue) => {
    // Empty name signals deletion
    if (updated.name === "") {
      const newValues = data.values!.filter((v) => v.id !== updated.id);
      params.onUpdateValues(data.id, newValues);
    } else {
      const newValues = data.values!.map((v) => (v.id === updated.id ? updated : v));
      params.onUpdateValues(data.id, newValues);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveValueId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveValueId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = data.values!.findIndex((v) => v.id === active.id);
      const newIndex = data.values!.findIndex((v) => v.id === over.id);
      const newValues = arrayMove(data.values!, oldIndex, newIndex).map((v, idx) => ({
        ...v,
        sortIndex: idx,
      }));
      params.onUpdateValues(data.id, newValues);
    }
  };

  const activeValue = data.values.find((v) => v.id === activeValueId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={data.values.map((v) => v.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className={styles.valuesContainer}>
          {data.values.map((value) => (
            <SortableValueTag
              key={value.id}
              value={value}
              onEdit={handleEditValue}
            />
          ))}
          <Input
            size="small"
            placeholder="Add..."
            value={newValueName}
            onChange={(e) => setNewValueName(e.target.value)}
            onBlur={handleAddValue}
            onPressEnter={handleAddValue}
            className={styles.addValueInput}
          />
        </div>
      </SortableContext>

      <DragOverlay>
        {activeValue && (
          <Tag className={styles.valueTag} style={{ cursor: "grabbing", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <span className={styles.valueDragHandle}>
              <HolderOutlined />
            </span>
            {activeValue.name}
          </Tag>
        )}
      </DragOverlay>
    </DndContext>
  );
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

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  // Filter visible rows based on expanded state (only groups can be collapsed)
  const visibleRows = useMemo(() => {
    const result: IAttributeRow[] = [];

    const addRowAndChildren = (parentId: string | null) => {
      const children = allRows
        .filter((r) => r.parentId === parentId)
        .sort((a, b) => a.sortIndex - b.sortIndex);

      for (const child of children) {
        result.push(child);

        // If this is a group and it's expanded, add its attributes
        if (child.type === "group" && expandedIds.has(child.id)) {
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

  // Handle row drag enter - collapse groups for easier reordering
  const handleRowDragEnter = useCallback((event: RowDragEnterEvent<IAttributeRow>) => {
    const movingData = event.node?.data;
    if (!movingData) return;

    if (draggingRowIdRef.current === movingData.id) return;

    draggingRowIdRef.current = movingData.id;
    expandedBeforeDragRef.current = new Set(expandedIds);

    if (movingData.type === "group") {
      // When dragging a group - collapse ALL groups
      const allGroups = allRows.filter((r) => r.type === "group");
      setExpandedIds((prev) => {
        const next = new Set(prev);
        allGroups.forEach((r) => next.delete(r.id));
        return next;
      });
    }
  }, [expandedIds, allRows]);

  // Handle row drag end
  const handleRowDragEnd = useCallback((event: RowDragEndEvent<IAttributeRow>) => {
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

    // Handle moving attribute before/after another attribute
    if (movingData.type === "attribute" && overData.type === "attribute") {
      const newParentId = overData.parentId;
      const oldParentId = movingData.parentId;
      const isSameParent = oldParentId === newParentId;

      setAllRows((prev) => {
        if (isSameParent) {
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
          const targetSiblings = prev
            .filter((r) => r.parentId === newParentId && r.type === "attribute")
            .sort((a, b) => a.sortIndex - b.sortIndex);

          const overIndex = targetSiblings.findIndex((r) => r.id === overData.id);
          const newSortIndex = overIndex >= 0 ? overIndex : targetSiblings.length;

          return prev.map((r) => {
            if (r.id === movingData.id) {
              return { ...r, parentId: newParentId, sortIndex: newSortIndex };
            }
            if (r.parentId === newParentId && r.type === "attribute" && r.sortIndex >= newSortIndex) {
              return { ...r, sortIndex: r.sortIndex + 1 };
            }
            return r;
          });
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
    }
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
    const newName = "New Group";

    const newGroup: IAttributeRow = {
      id: newId,
      type: "group",
      name: newName,
      parentId: null,
      sortIndex: allRows.filter((r) => r.type === "group").length,
      level: 0,
    };

    setAllRows((prev) => [...prev, newGroup]);
    setExpandedIds((prev) => new Set([...prev, newId]));
    markDirty();
  }, [allRows, markDirty]);

  const handleUpdateValues = useCallback((attributeId: string, values: IAttributeValue[]) => {
    setAllRows((prev) =>
      prev.map((r) => {
        if (r.id === attributeId) {
          return { ...r, values };
        }
        return r;
      })
    );
    markDirty();
  }, [markDirty]);

  const handleAddValue = useCallback((attributeId: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setAllRows((prev) =>
      prev.map((r) => {
        if (r.id === attributeId) {
          const newValue: IAttributeValue = {
            id: `v-${Date.now()}`,
            name,
            slug,
            sortIndex: (r.values || []).length,
          };
          return { ...r, values: [...(r.values || []), newValue] };
        }
        return r;
      })
    );
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
        cellRenderer: ValuesCellRenderer,
        cellRendererParams: {
          onUpdateValues: handleUpdateValues,
          onAddValue: handleAddValue,
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
    [handleDelete, handleAddAttribute, handleToggleExpand, handleUpdateValues, handleAddValue, expandedIds, allRows]
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
            animateRows={false}
            rowDragManaged
            suppressMoveWhenRowDragging
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
