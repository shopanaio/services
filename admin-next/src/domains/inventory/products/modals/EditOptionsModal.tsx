"use client";

import { useState, useCallback } from "react";
import { createStyles } from "antd-style";
import {
  Button,
  Typography,
  Flex,
  Dropdown,
  Input,
  ColorPicker,
  Popover,
  Segmented,
  Upload,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
  HolderOutlined,
  BgColorsOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  ColumnWidthOutlined,
  InboxOutlined,
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";
import { PaperHeader } from "../components/PaperHeader";

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
  optionGroup: {},
  optionGroupDragging: {
    opacity: 0.5,
  },
  optionGroupHeader: {
    display: "flex",
    alignItems: "center",
    padding: "4px 0",
    background: token.colorBgLayout,
    borderRadius: 8,
    marginBottom: 8,
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
  inputPrefix: {
    marginLeft: 4,
    marginRight: 8,
  },
  optionGroupName: {
    fontWeight: 500,
    fontSize: 14,
  },
  optionGroupSlug: {
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  optionGroupDisplayType: {
    fontSize: 12,
  },
  optionGroupBody: {},
  valuesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  valueRow: {
    transition: "all 0.2s",
  },
  valueRowDragging: {
    opacity: 0.5,
  },
  valueDragHandle: {
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
  swatchTrigger: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    cursor: "pointer",
    border: `1px solid ${token.colorBorderSecondary}`,
    overflow: "hidden",
    flexShrink: 0,
    padding: 2,

    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  swatchColor: {
    width: "100%",
    height: "100%",
    borderRadius: "100%",
  },
  swatchImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "100%",
  },
  swatchImagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    color: token.colorTextSecondary,
    borderRadius: "100%",
    fontSize: 12,
  },
  swatchPopoverContent: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: 236,
  },
  swatchColorTabs: {
    // marginBottom: 8,
  },
  swatchColorTab: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  swatchColorTabDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  swatchDropZone: {
    width: "100%",
    "& .ant-upload-drag": {
      padding: 16,
      background: token.colorBgLayout,
      borderRadius: 8,
    },
    "& .ant-upload-drag-icon": {
      marginBottom: 8,
      "& .anticon": {
        fontSize: 32,
        color: token.colorTextSecondary,
      },
    },
    "& .ant-upload-text": {
      fontSize: 13,
      color: token.colorText,
    },
    "& .ant-upload-hint": {
      fontSize: 12,
      color: token.colorTextSecondary,
    },
  },
  swatchImagePreview: {
    position: "relative" as const,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  swatchImagePreviewImg: {
    width: "100%",
    height: 120,
    objectFit: "cover" as const,
    display: "block",
  },
  swatchImageRemove: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    background: "rgba(0,0,0,0.5)",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    "&:hover": {
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
    },
  },
}));

// ============================================================================
// Types
// ============================================================================

type FeatureStyleType = "radio" | "dropdown" | "swatch" | "cover" | "size";
type FeatureSwatchType = "color" | "color_duo" | "image";

interface ISwatch {
  type: FeatureSwatchType;
  color1?: string;
  color2?: string;
  imageUrl?: string;
}

interface IOptionValue {
  id: string;
  label: string;
  slug: string;
  sortIndex: number;
  swatch?: ISwatch;
}

interface IOptionGroup {
  id: string;
  name: string;
  slug: string;
  style: FeatureStyleType;
  values: IOptionValue[];
  sortIndex: number;
}

// ============================================================================
// Constants
// ============================================================================

const STYLE_OPTIONS: {
  key: FeatureStyleType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "swatch", label: "Swatch", icon: <BgColorsOutlined /> },
  { key: "cover", label: "Cover", icon: <PictureOutlined /> },
  { key: "radio", label: "Radio", icon: <CheckCircleOutlined /> },
  { key: "dropdown", label: "Dropdown", icon: <MenuOutlined /> },
  { key: "size", label: "Size", icon: <ColumnWidthOutlined /> },
];

type SwatchModeType = "color" | "image";

const SWATCH_MODE_OPTIONS: { value: SwatchModeType; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "image", label: "Image" },
];

const DEFAULT_SWATCH: ISwatch = {
  type: "color",
  color1: "#1677ff",
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_OPTION_GROUPS: IOptionGroup[] = [
  {
    id: "opt-1",
    name: "Color",
    slug: "color",
    style: "swatch",
    sortIndex: 0,
    values: [
      {
        id: "val-1",
        label: "Red",
        slug: "red",
        sortIndex: 0,
        swatch: { type: "color", color1: "#ff4d4f" },
      },
      {
        id: "val-2",
        label: "Blue",
        slug: "blue",
        sortIndex: 1,
        swatch: { type: "color", color1: "#1677ff" },
      },
      {
        id: "val-3",
        label: "Green",
        slug: "green",
        sortIndex: 2,
        swatch: { type: "color", color1: "#52c41a" },
      },
      {
        id: "val-4",
        label: "Black",
        slug: "black",
        sortIndex: 3,
        swatch: { type: "color_duo", color1: "#000000", color2: "#333333" },
      },
    ],
  },
  {
    id: "opt-2",
    name: "Size",
    slug: "size",
    style: "size",
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

// ============================================================================
// Style Selector Component
// ============================================================================

interface IStyleSelectorProps {
  value: FeatureStyleType;
  onChange: (style: FeatureStyleType) => void;
}

const StyleSelector = ({ value, onChange }: IStyleSelectorProps) => {
  const current = STYLE_OPTIONS.find((o) => o.key === value);

  const menuItems = STYLE_OPTIONS.map((option) => ({
    key: option.key,
    label: (
      <Flex gap={8} align="center">
        {option.icon}
        <span>{option.label}</span>
      </Flex>
    ),
    onClick: () => onChange(option.key),
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
      <Button size="small" type="text">
        <Flex gap={4} align="center">
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
};

// ============================================================================
// Swatch Picker Component
// ============================================================================

interface ISwatchPickerProps {
  swatch: ISwatch;
  onChange: (swatch: ISwatch) => void;
}

const SwatchPicker = ({ swatch, onChange }: ISwatchPickerProps) => {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<"1" | "2">("1");
  const { type, color1, color2, imageUrl } = swatch;

  // Determine mode from swatch type
  const mode: SwatchModeType = type === "image" ? "image" : "color";
  const isDuotone = type === "color_duo";

  const handleModeChange = (nextMode: SwatchModeType) => {
    if (nextMode === "color") {
      // Preserve existing colors when switching back to color mode
      if (isDuotone) {
        onChange({
          type: "color_duo",
          color1: color1 || "#1677ff",
          color2: color2 || "#333333",
        });
      } else {
        onChange({ type: "color", color1: color1 || "#1677ff" });
      }
    } else {
      onChange({ type: "image", imageUrl: imageUrl || "" });
    }
  };

  const handleAddSecondColor = () => {
    onChange({
      type: "color_duo",
      color1: color1 || "#1677ff",
      color2: "#333333",
    });
    setActiveColorTab("2");
  };

  const handleRemoveSecondColor = () => {
    onChange({ type: "color", color1: color1 || "#1677ff" });
    setActiveColorTab("1");
  };

  const handleColorChange = (colorKey: "color1" | "color2", value: string) => {
    onChange({ ...swatch, [colorKey]: value });
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({ type: "image", imageUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    onChange({ type: "image", imageUrl: "" });
  };

  const renderTrigger = () => {
    if (type === "color") {
      return (
        <div className={styles.swatchTrigger}>
          <div className={styles.swatchColor} style={{ background: color1 }} />
        </div>
      );
    }
    if (type === "color_duo") {
      return (
        <div className={styles.swatchTrigger}>
          <div
            className={styles.swatchColor}
            style={{
              background: `linear-gradient(90deg, ${color1} 49.9%, ${color2} 50%, ${color2} 100%)`,
            }}
          />
        </div>
      );
    }
    return (
      <div className={styles.swatchTrigger}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className={styles.swatchImage} />
        ) : (
          <div className={styles.swatchImagePlaceholder}>
            <PictureOutlined />
          </div>
        )}
      </div>
    );
  };

  const renderColorContent = () => {
    const currentColor = activeColorTab === "1" ? color1 : color2;
    const colorKey = activeColorTab === "1" ? "color1" : "color2";

    const tabItems = [
      {
        key: "1",
        label: "Color 1",
        closable: false,
      },
      ...(isDuotone
        ? [
            {
              key: "2",
              label: "Color 2",
              closable: true,
            },
          ]
        : []),
    ];

    return (
      <>
        <Tabs
          type="editable-card"
          activeKey={activeColorTab}
          onChange={(key) => setActiveColorTab(key as "1" | "2")}
          onEdit={(targetKey, action) => {
            if (action === "add") {
              handleAddSecondColor();
            } else if (action === "remove" && targetKey === "2") {
              handleRemoveSecondColor();
            }
          }}
          items={tabItems}
          size="small"
          className={styles.swatchColorTabs}
          hideAdd={isDuotone}
          styles={{
            header: {
              margin: 0,
            },
          }}
        />
        <ColorPicker
          arrow={false}
          mode="single"
          value={currentColor}
          defaultFormat="hex"
          disabledFormat
          onChange={(c) => handleColorChange(colorKey, c.toHexString())}
          getPopupContainer={(trigger) => trigger.parentElement}
          disabledAlpha
          styles={{
            popup: {
              root: {
                position: "static",
                marginTop: -12,
              },
            },
            popupOverlayInner: {
              boxShadow: "none",
              padding: 0,
            },
          }}
          format="hex"
          open
        >
          <div />
        </ColorPicker>
      </>
    );
  };

  const renderImageContent = () => {
    if (imageUrl) {
      return (
        <div className={styles.swatchImagePreview}>
          <img src={imageUrl} alt="" className={styles.swatchImagePreviewImg} />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            className={styles.swatchImageRemove}
            onClick={handleImageRemove}
          />
        </div>
      );
    }

    return (
      <div className={styles.swatchDropZone}>
        <Upload.Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleImageUpload(file);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Drop image here</p>
          <p className="ant-upload-hint">or click to browse</p>
        </Upload.Dragger>
      </div>
    );
  };

  const popoverContent = (
    <div className={styles.swatchPopoverContent}>
      <Segmented
        block
        size="small"
        options={SWATCH_MODE_OPTIONS}
        value={mode}
        onChange={(val) => handleModeChange(val as SwatchModeType)}
      />
      {mode === "color" ? renderColorContent() : renderImageContent()}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
    >
      {renderTrigger()}
    </Popover>
  );
};

// ============================================================================
// Sortable Value Component
// ============================================================================

interface ISortableValueProps {
  value: IOptionValue;
  groupStyle: FeatureStyleType;
  onChange: (value: IOptionValue) => void;
  onDelete: () => void;
}

const SortableValue = ({
  value,
  groupStyle,
  onChange,
  onDelete,
}: ISortableValueProps) => {
  const { styles, cx } = useStyles();

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

  const swatch = value.swatch || DEFAULT_SWATCH;
  const showSwatchControls = groupStyle === "swatch";

  const handleSwatchChange = (nextSwatch: ISwatch) => {
    onChange({
      ...value,
      swatch: nextSwatch,
    });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      label: e.target.value,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(styles.valueRow, isDragging && styles.valueRowDragging)}
    >
      <Input
        value={value.label}
        onChange={handleLabelChange}
        placeholder="Value name"
        prefix={
          <Flex gap={8} align="center" className={styles.inputPrefix}>
            <span
              className={styles.valueDragHandle}
              {...attributes}
              {...listeners}
            >
              <HolderOutlined />
            </span>
            {showSwatchControls && (
              <span onPointerDown={(e) => e.stopPropagation()}>
                <SwatchPicker swatch={swatch} onChange={handleSwatchChange} />
              </span>
            )}
          </Flex>
        }
        suffix={
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            onClick={onDelete}
          />
        }
      />
    </div>
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
  onAddValue: (groupId: string) => void;
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
  const [activeValueId, setActiveValueId] = useState<string | null>(null);

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
      const newValues = arrayMove(group.values, oldIndex, newIndex).map(
        (v, idx) => ({
          ...v,
          sortIndex: idx,
        })
      );
      onReorderValues(group.id, newValues);
    }
  };

  const handleStyleChange = (nextStyle: FeatureStyleType) => {
    onUpdateGroup({ ...group, style: nextStyle });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateGroup({ ...group, name: e.target.value });
  };

  const menuItems = [
    {
      key: "delete",
      label: "Delete option",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDeleteGroup(group.id),
    },
  ];

  const activeValue = group.values.find((v) => v.id === activeValueId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        styles.optionGroup,
        isDragging && styles.optionGroupDragging
      )}
    >
      <div className={styles.optionGroupHeader}>
        <Input
          value={group.name}
          onChange={handleNameChange}
          placeholder="Option name"
          variant="borderless"
          style={{ flex: 1, fontWeight: 500 }}
          prefix={
            <Flex gap={4} align="center" className={styles.inputPrefix}>
              <span
                className={styles.optionGroupDragHandle}
                {...attributes}
                {...listeners}
              >
                <HolderOutlined />
              </span>
            </Flex>
          }
          suffix={
            <Flex
              gap={4}
              align="center"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <StyleSelector value={group.style} onChange={handleStyleChange} />
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={() => onAddValue(group.id)}
              />
              <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <Button size="small" type="text" icon={<DeleteOutlined />} />
              </Dropdown>
            </Flex>
          }
        />
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
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.valuesContainer}>
              {group.values.map((value) => (
                <SortableValue
                  key={value.id}
                  value={value}
                  groupStyle={group.style}
                  onChange={(updated) => onUpdateValue(group.id, updated)}
                  onDelete={() => onDeleteValue(group.id, value.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeValue && (
              <Input
                value={activeValue.label}
                readOnly
                style={{
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  cursor: "grabbing",
                }}
                prefix={
                  <span className={styles.valueDragHandle}>
                    <HolderOutlined />
                  </span>
                }
              />
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
      setGroups(
        arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({
          ...g,
          sortIndex: idx,
        }))
      );
      markDirty();
    }
  };

  const handleUpdateGroup = useCallback(
    (updated: IOptionGroup) => {
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      markDirty();
    },
    [markDirty]
  );

  const handleDeleteGroup = useCallback(
    (id: string) => {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      markDirty();
    },
    [markDirty]
  );

  const handleUpdateValue = useCallback(
    (groupId: string, value: IOptionValue) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                values: g.values.map((v) => (v.id === value.id ? value : v)),
              }
            : g
        )
      );
      markDirty();
    },
    [markDirty]
  );

  const handleDeleteValue = useCallback(
    (groupId: string, valueId: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, values: g.values.filter((v) => v.id !== valueId) }
            : g
        )
      );
      markDirty();
    },
    [markDirty]
  );

  const handleAddValue = useCallback(
    (groupId: string) => {
      const newValue: IOptionValue = {
        id: `val-${Date.now()}`,
        label: "",
        slug: "",
        sortIndex: 0,
        swatch: { ...DEFAULT_SWATCH },
      };
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                values: [
                  ...g.values,
                  { ...newValue, sortIndex: g.values.length },
                ],
              }
            : g
        )
      );
      markDirty();
    },
    [markDirty]
  );

  const handleReorderValues = useCallback(
    (groupId: string, values: IOptionValue[]) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, values } : g))
      );
      markDirty();
    },
    [markDirty]
  );

  const handleAddGroup = useCallback(() => {
    const newGroup: IOptionGroup = {
      id: `opt-${Date.now()}`,
      name: "New Option",
      slug: "new-option",
      style: "radio",
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
          <PaperHeader
            title="Options"
            actions={
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddGroup}
              >
                Add
              </Button>
            }
          />

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
              <Flex vertical gap={16}>
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
                  className={styles.optionGroupHeader}
                  style={{
                    width: 150,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    cursor: "grabbing",
                  }}
                >
                  <span className={styles.optionGroupDragHandle}>
                    <HolderOutlined />
                  </span>
                  <Typography.Text className={styles.optionGroupName}>
                    {activeGroup.name}
                  </Typography.Text>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </Paper>
      </div>
    </ModalLayout>
  );
};
