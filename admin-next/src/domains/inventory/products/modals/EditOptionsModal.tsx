"use client";

import { useState, useCallback } from "react";
import { createStyles } from "antd-style";
import {
  Button,
  Typography,
  Flex,
  Select,
  Dropdown,
  Input,
  Popover,
  ColorPicker,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  HolderOutlined,
} from "@ant-design/icons";
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
  verticalListSortingStrategy,
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
  optionGroup: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    background: token.colorBgContainer,
    overflow: "hidden",
  },
  optionGroupDragging: {
    opacity: 0.5,
  },
  optionGroupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgLayout,
  },
  optionGroupDragHandle: {
    cursor: "grab",
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      color: token.colorText,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  optionGroupName: {
    fontWeight: 500,
    fontSize: 14,
  },
  optionGroupNameClickable: {
    flex: 1,
    cursor: "pointer",
    padding: "4px 8px",
    marginLeft: -8,
    borderRadius: 4,
    "&:hover": {
      background: token.colorBgContainer,
    },
  },
  optionGroupSlug: {
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  optionGroupDisplayType: {
    fontSize: 12,
  },
  optionGroupBody: {
    padding: 16,
  },
  valuesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  valueTag: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 6,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    cursor: "grab",
    fontSize: 13,
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorBgLayout,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  valueTagDragging: {
    opacity: 0.5,
  },
  valueTagSelected: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  valueDragHandle: {
    color: token.colorTextSecondary,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
  },
  valueSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: `1px solid ${token.colorBorderSecondary}`,
    flexShrink: 0,
  },
  valueLabel: {
    fontSize: 13,
  },
  addValueInput: {
    width: 100,
    fontSize: 13,
  },
  addGroupButton: {
    width: "100%",
    borderStyle: "dashed",
  },
  // Value edit popover
  valueEditPopover: {
    width: 280,
  },
  valueEditForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  valueEditField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  valueEditLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  valueEditActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  valueUsageText: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  colorPickerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  groupEditForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: 240,
  },
  groupEditActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
}));

// ============================================================================
// Types
// ============================================================================

type DisplayType = "text" | "swatch" | "dropdown";

interface IOptionValue {
  id: string;
  label: string;
  slug: string;
  color?: string;
  sortIndex: number;
}

interface IOptionGroup {
  id: string;
  name: string;
  slug: string;
  displayType: DisplayType;
  values: IOptionValue[];
  sortIndex: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_OPTION_GROUPS: IOptionGroup[] = [
  {
    id: "opt-1",
    name: "Color",
    slug: "color",
    displayType: "swatch",
    sortIndex: 0,
    values: [
      { id: "val-1", label: "Red", slug: "red", color: "#ff4d4f", sortIndex: 0 },
      { id: "val-2", label: "Blue", slug: "blue", color: "#1677ff", sortIndex: 1 },
      { id: "val-3", label: "Green", slug: "green", color: "#52c41a", sortIndex: 2 },
      { id: "val-4", label: "Black", slug: "black", color: "#000000", sortIndex: 3 },
    ],
  },
  {
    id: "opt-2",
    name: "Size",
    slug: "size",
    displayType: "text",
    sortIndex: 1,
    values: [
      { id: "val-5", label: "S", slug: "s", sortIndex: 0 },
      { id: "val-6", label: "M", slug: "m", sortIndex: 1 },
      { id: "val-7", label: "L", slug: "l", sortIndex: 2 },
      { id: "val-8", label: "XL", slug: "xl", sortIndex: 3 },
      { id: "val-9", label: "XXL", slug: "xxl", sortIndex: 4 },
    ],
  },
];

const DISPLAY_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "swatch", label: "Swatch" },
  { value: "dropdown", label: "Dropdown" },
];

// ============================================================================
// Sortable Value Component
// ============================================================================

interface ISortableValueProps {
  value: IOptionValue;
  displayType: DisplayType;
  onEdit: (value: IOptionValue) => void;
  onDelete: (id: string) => void;
}

const SortableValue = ({ value, displayType, onEdit, onDelete }: ISortableValueProps) => {
  const { styles, cx } = useStyles();
  const [editOpen, setEditOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(value.label);
  const [editSlug, setEditSlug] = useState(value.slug);
  const [editColor, setEditColor] = useState(value.color || "#1677ff");

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

  const handleSave = () => {
    onEdit({ ...value, label: editLabel, slug: editSlug, color: editColor });
    setEditOpen(false);
  };

  const handleCancel = () => {
    setEditLabel(value.label);
    setEditSlug(value.slug);
    setEditColor(value.color || "#1677ff");
    setEditOpen(false);
  };

  const editContent = (
    <div className={styles.valueEditForm}>
      <div className={styles.valueEditField}>
        <Typography.Text className={styles.valueEditLabel}>Name</Typography.Text>
        <Input
          size="small"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          placeholder="Value name"
        />
      </div>
      <div className={styles.valueEditField}>
        <Typography.Text className={styles.valueEditLabel}>Slug</Typography.Text>
        <Input
          size="small"
          value={editSlug}
          onChange={(e) => setEditSlug(e.target.value)}
          placeholder="value-slug"
        />
      </div>
      {displayType === "swatch" && (
        <div className={styles.valueEditField}>
          <Typography.Text className={styles.valueEditLabel}>Color</Typography.Text>
          <div className={styles.colorPickerRow}>
            <ColorPicker
              size="small"
              value={editColor}
              onChange={(color) => setEditColor(color.toHexString())}
            />
            <Input
              size="small"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      )}
      <div className={styles.valueEditActions}>
        <Typography.Text className={styles.valueUsageText}>
          Used in 3 variants
        </Typography.Text>
        <Flex gap={8}>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              onDelete(value.id);
              setEditOpen(false);
            }}
          >
            Delete
          </Button>
          <Button size="small" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={handleSave}>
            Done
          </Button>
        </Flex>
      </div>
    </div>
  );

  return (
    <Popover
      content={editContent}
      trigger="click"
      open={editOpen}
      onOpenChange={setEditOpen}
      placement="bottom"
      overlayClassName={styles.valueEditPopover}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cx(
          styles.valueTag,
          isDragging && styles.valueTagDragging,
          editOpen && styles.valueTagSelected
        )}
      >
        <span className={styles.valueDragHandle}>
          <HolderOutlined />
        </span>
        {displayType === "swatch" && value.color && (
          <span
            className={styles.valueSwatch}
            style={{ background: value.color }}
          />
        )}
        <span className={styles.valueLabel}>{value.label}</span>
      </div>
    </Popover>
  );
};

// ============================================================================
// Sortable Option Group Component
// ============================================================================

interface ISortableOptionGroupProps {
  group: IOptionGroup;
  onUpdateGroup: (group: IOptionGroup) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateValue: (groupId: string, value: IOptionValue) => void;
  onDeleteValue: (groupId: string, valueId: string) => void;
  onAddValue: (groupId: string, label: string) => void;
  onReorderValues: (groupId: string, values: IOptionValue[]) => void;
}

const SortableOptionGroup = ({
  group,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateValue,
  onDeleteValue,
  onAddValue,
  onReorderValues,
}: ISortableOptionGroupProps) => {
  const { styles, cx } = useStyles();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editSlug, setEditSlug] = useState(group.slug);
  const [editDisplayType, setEditDisplayType] = useState(group.displayType);
  const [activeValueId, setActiveValueId] = useState<string | null>(null);
  const [newValueName, setNewValueName] = useState("");

  const handleAddValue = () => {
    const trimmed = newValueName.trim();
    if (trimmed) {
      onAddValue(group.id, trimmed);
      setNewValueName("");
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveValueId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveValueId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = group.values.findIndex((v) => v.id === active.id);
      const newIndex = group.values.findIndex((v) => v.id === over.id);
      const newValues = arrayMove(group.values, oldIndex, newIndex).map((v, idx) => ({
        ...v,
        sortIndex: idx,
      }));
      onReorderValues(group.id, newValues);
    }
  };

  const handleSave = () => {
    onUpdateGroup({ ...group, name: editName, slug: editSlug, displayType: editDisplayType });
    setEditOpen(false);
  };

  const handleCancel = () => {
    setEditName(group.name);
    setEditSlug(group.slug);
    setEditDisplayType(group.displayType);
    setEditOpen(false);
  };

  const activeValue = group.values.find((v) => v.id === activeValueId);

  const menuItems = [
    {
      key: "delete",
      label: "Delete group",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDeleteGroup(group.id),
    },
  ];

  const editContent = (
    <div className={styles.groupEditForm}>
      <div className={styles.valueEditField}>
        <Typography.Text className={styles.valueEditLabel}>Name</Typography.Text>
        <Input
          size="small"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Option name"
        />
      </div>
      <div className={styles.valueEditField}>
        <Typography.Text className={styles.valueEditLabel}>Slug</Typography.Text>
        <Input
          size="small"
          value={editSlug}
          onChange={(e) => setEditSlug(e.target.value)}
          placeholder="option-slug"
        />
      </div>
      <div className={styles.valueEditField}>
        <Typography.Text className={styles.valueEditLabel}>Display type</Typography.Text>
        <Select
          size="small"
          value={editDisplayType}
          onChange={(value) => setEditDisplayType(value)}
          options={DISPLAY_TYPE_OPTIONS}
          style={{ width: "100%" }}
        />
      </div>
      <div className={styles.groupEditActions}>
        <Button size="small" onClick={handleCancel}>
          Cancel
        </Button>
        <Button size="small" type="primary" onClick={handleSave}>
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(styles.optionGroup, isDragging && styles.optionGroupDragging)}
    >
      <div className={styles.optionGroupHeader}>
        <span
          className={styles.optionGroupDragHandle}
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </span>

        <Popover
          content={editContent}
          trigger="click"
          open={editOpen}
          onOpenChange={setEditOpen}
          placement="bottomLeft"
        >
          <Flex gap={8} align="center" className={styles.optionGroupNameClickable}>
            <Typography.Text className={styles.optionGroupName}>
              {group.name}
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.optionGroupSlug}>
              {group.slug}
            </Typography.Text>
          </Flex>
        </Popover>

        <Typography.Text type="secondary" className={styles.optionGroupDisplayType}>
          {DISPLAY_TYPE_OPTIONS.find((o) => o.value === group.displayType)?.label}
        </Typography.Text>

        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>

      <div className={styles.optionGroupBody}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={group.values.map((v) => v.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className={styles.valuesContainer}>
              {group.values.map((value) => (
                <SortableValue
                  key={value.id}
                  value={value}
                  displayType={group.displayType}
                  onEdit={(updated) => onUpdateValue(group.id, updated)}
                  onDelete={(id) => onDeleteValue(group.id, id)}
                />
              ))}
              <Input
                size="small"
                placeholder="Add value..."
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
              <div className={styles.valueTag} style={{ cursor: "grabbing", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                <span className={styles.valueDragHandle}>
                  <HolderOutlined />
                </span>
                {group.displayType === "swatch" && activeValue.color && (
                  <span
                    className={styles.valueSwatch}
                    style={{ background: activeValue.color }}
                  />
                )}
                <span className={styles.valueLabel}>{activeValue.label}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EditOptionsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty } = useModalStackContext();

  const [groups, setGroups] = useState<IOptionGroup[]>(MOCK_OPTION_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGroupId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      setGroups(arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({
        ...g,
        sortIndex: idx,
      })));
      markDirty();
    }
  };

  const handleUpdateGroup = useCallback((updated: IOptionGroup) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    markDirty();
  }, [markDirty]);

  const handleDeleteGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    markDirty();
  }, [markDirty]);

  const handleUpdateValue = useCallback((groupId: string, value: IOptionValue) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.map((v) => (v.id === value.id ? value : v)) }
          : g
      )
    );
    markDirty();
  }, [markDirty]);

  const handleDeleteValue = useCallback((groupId: string, valueId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.filter((v) => v.id !== valueId) }
          : g
      )
    );
    markDirty();
  }, [markDirty]);

  const handleAddValue = useCallback((groupId: string, label: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const newValue: IOptionValue = {
      id: `val-${Date.now()}`,
      label,
      slug,
      color: "#1677ff",
      sortIndex: 0,
    };
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, values: [...g.values, { ...newValue, sortIndex: g.values.length }] }
          : g
      )
    );
    markDirty();
  }, [markDirty]);

  const handleReorderValues = useCallback((groupId: string, values: IOptionValue[]) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, values } : g))
    );
    markDirty();
  }, [markDirty]);

  const handleAddGroup = useCallback(() => {
    const newGroup: IOptionGroup = {
      id: `opt-${Date.now()}`,
      name: "New Option",
      slug: "new-option",
      displayType: "text",
      values: [],
      sortIndex: groups.length,
    };
    setGroups((prev) => [...prev, newGroup]);
    markDirty();
  }, [groups.length, markDirty]);

  const handleSave = useCallback(() => {
    console.log("Saving options:", groups);
    pop();
  }, [groups, pop]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <ModalLayout
      name="edit-options"
      header={
        <ModalHeader
          name="edit-options"
          title="Edit Product Options"
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <Flex vertical gap={12}>
                {groups.map((group) => (
                  <SortableOptionGroup
                    key={group.id}
                    group={group}
                    onUpdateGroup={handleUpdateGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onUpdateValue={handleUpdateValue}
                    onDeleteValue={handleDeleteValue}
                    onAddValue={handleAddValue}
                    onReorderValues={handleReorderValues}
                  />
                ))}
              </Flex>
            </SortableContext>

            <DragOverlay>
              {activeGroup && (
                <div
                  className={styles.optionGroup}
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "grabbing" }}
                >
                  <div className={styles.optionGroupHeader}>
                    <span className={styles.optionGroupDragHandle}>
                      <HolderOutlined />
                    </span>
                    <Typography.Text className={styles.optionGroupName}>
                      {activeGroup.name}
                    </Typography.Text>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          <Button
            icon={<PlusOutlined />}
            className={styles.addGroupButton}
            onClick={handleAddGroup}
            style={{ marginTop: 12 }}
          >
            Add option group
          </Button>
        </Paper>
      </div>
    </ModalLayout>
  );
};
