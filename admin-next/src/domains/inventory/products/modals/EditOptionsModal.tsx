"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  defaultDropAnimationSideEffects,
  type DropAnimation,
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
import {
  editOptionsSchema,
  type IEditOptionsFormValues,
  type IOptionGroup,
  type IOptionValue,
  type ISwatch,
  type FeatureStyleType,
} from "./EditOptionsModal.schema";

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
  swatchColorTabs: {},
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

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
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

  const mode: SwatchModeType = type === "image" ? "image" : "color";
  const isDuotone = type === "color_duo";

  const handleModeChange = (nextMode: SwatchModeType) => {
    if (nextMode === "color") {
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
  groupIndex: number;
  valueIndex: number;
  onLabelChange: (label: string) => void;
  onSwatchChange: (swatch: ISwatch) => void;
  onDelete: () => void;
}

const SortableValue = ({
  value,
  groupStyle,
  onLabelChange,
  onSwatchChange,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(styles.valueRow, isDragging && styles.valueRowDragging)}
    >
      <Input
        value={value.label}
        onChange={(e) => onLabelChange(e.target.value)}
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
                <SwatchPicker swatch={swatch} onChange={onSwatchChange} />
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
  groupIndex: number;
  onUpdateName: (name: string) => void;
  onUpdateStyle: (style: FeatureStyleType) => void;
  onDeleteGroup: () => void;
  onUpdateValueLabel: (valueIndex: number, label: string) => void;
  onUpdateValueSwatch: (valueIndex: number, swatch: ISwatch) => void;
  onDeleteValue: (valueIndex: number) => void;
  onAddValue: () => void;
  onReorderValues: (values: IOptionValue[]) => void;
}

const SortableOptionGroup = ({
  group,
  groupIndex,
  onUpdateName,
  onUpdateStyle,
  onDeleteGroup,
  onUpdateValueLabel,
  onUpdateValueSwatch,
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
      onReorderValues(newValues);
    }
  };

  const menuItems = [
    {
      key: "delete",
      label: "Delete option",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDeleteGroup,
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
          onChange={(e) => onUpdateName(e.target.value)}
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
              <StyleSelector value={group.style} onChange={onUpdateStyle} />
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={onAddValue}
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
              {group.values.map((value, valueIndex) => (
                <SortableValue
                  key={value.id}
                  value={value}
                  groupStyle={group.style}
                  groupIndex={groupIndex}
                  valueIndex={valueIndex}
                  onLabelChange={(label) => onUpdateValueLabel(valueIndex, label)}
                  onSwatchChange={(swatch) => onUpdateValueSwatch(valueIndex, swatch)}
                  onDelete={() => onDeleteValue(valueIndex)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={DROP_ANIMATION}>
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
  const { pop } = useModalStackContext();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
  } = useForm<IEditOptionsFormValues>({
    resolver: zodResolver(editOptionsSchema),
    defaultValues: {
      groups: MOCK_OPTION_GROUPS,
    },
  });

  const { remove, append } = useFieldArray({
    control,
    name: "groups",
  });

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGroupId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentGroups = getValues("groups");
      const oldIndex = currentGroups.findIndex((g) => g.id === active.id);
      const newIndex = currentGroups.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(currentGroups, oldIndex, newIndex).map((g, idx) => ({
        ...g,
        sortIndex: idx,
      }));
      setValue("groups", reordered);
    }
  };

  const handleUpdateGroupName = useCallback(
    (groupIndex: number, name: string) => {
      setValue(`groups.${groupIndex}.name`, name);
    },
    [setValue]
  );

  const handleUpdateGroupStyle = useCallback(
    (groupIndex: number, style: FeatureStyleType) => {
      setValue(`groups.${groupIndex}.style`, style);
    },
    [setValue]
  );

  const handleDeleteGroup = useCallback(
    (groupIndex: number) => {
      remove(groupIndex);
    },
    [remove]
  );

  const handleUpdateValueLabel = useCallback(
    (groupIndex: number, valueIndex: number, label: string) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.label`, label);
    },
    [setValue]
  );

  const handleUpdateValueSwatch = useCallback(
    (groupIndex: number, valueIndex: number, swatch: ISwatch) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.swatch`, swatch);
    },
    [setValue]
  );

  const handleDeleteValue = useCallback(
    (groupIndex: number, valueIndex: number) => {
      const currentValues = getValues(`groups.${groupIndex}.values`);
      const newValues = currentValues.filter((_, idx) => idx !== valueIndex);
      setValue(`groups.${groupIndex}.values`, newValues);
    },
    [setValue, getValues]
  );

  const handleAddValue = useCallback(
    (groupIndex: number) => {
      const currentValues = getValues(`groups.${groupIndex}.values`);
      const newValue: IOptionValue = {
        id: `val-${Date.now()}`,
        label: "",
        slug: "",
        sortIndex: currentValues.length,
        swatch: { ...DEFAULT_SWATCH },
      };
      setValue(`groups.${groupIndex}.values`, [...currentValues, newValue]);
    },
    [setValue, getValues]
  );

  const handleReorderValues = useCallback(
    (groupIndex: number, values: IOptionValue[]) => {
      setValue(`groups.${groupIndex}.values`, values);
    },
    [setValue]
  );

  const handleAddGroup = useCallback(() => {
    const currentGroups = getValues("groups");
    const newGroup: IOptionGroup = {
      id: `opt-${Date.now()}`,
      name: "New Option",
      slug: "new-option",
      style: "radio",
      values: [],
      sortIndex: currentGroups.length,
    };
    append(newGroup);
  }, [append, getValues]);

  const onSubmit = useCallback(
    (data: IEditOptionsFormValues) => {
      console.log("Saving options:", data.groups);
      pop();
    },
    [pop]
  );

  const watchedGroups = watch("groups");
  const activeGroup = watchedGroups.find((g) => g.id === activeGroupId);

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
            onClick: handleSubmit(onSubmit),
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
              items={watchedGroups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <Flex vertical gap={16}>
                {watchedGroups.map((group, groupIndex) => (
                  <SortableOptionGroup
                    key={group.id}
                    group={group}
                    groupIndex={groupIndex}
                    onUpdateName={(name) => handleUpdateGroupName(groupIndex, name)}
                    onUpdateStyle={(style) => handleUpdateGroupStyle(groupIndex, style)}
                    onDeleteGroup={() => handleDeleteGroup(groupIndex)}
                    onUpdateValueLabel={(valueIndex, label) =>
                      handleUpdateValueLabel(groupIndex, valueIndex, label)
                    }
                    onUpdateValueSwatch={(valueIndex, swatch) =>
                      handleUpdateValueSwatch(groupIndex, valueIndex, swatch)
                    }
                    onDeleteValue={(valueIndex) =>
                      handleDeleteValue(groupIndex, valueIndex)
                    }
                    onAddValue={() => handleAddValue(groupIndex)}
                    onReorderValues={(values) =>
                      handleReorderValues(groupIndex, values)
                    }
                  />
                ))}
              </Flex>
            </SortableContext>

            <DragOverlay dropAnimation={DROP_ANIMATION}>
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
