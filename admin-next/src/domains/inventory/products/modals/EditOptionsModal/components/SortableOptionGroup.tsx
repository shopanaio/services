import { Button, Dropdown, Flex, Input } from "antd";
import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
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
import { useStyles } from "../EditOptionsModal.styles";
import type { IOptionGroup, IOptionValue, ISwatch, FeatureStyleType } from "../EditOptionsModal.schema";
import { StyleSelector } from "./StyleSelector";
import { SortableValue } from "./SortableValue";

interface ISortableOptionGroupProps {
  group: IOptionGroup;
  fieldId: string;
  onUpdateName: (name: string) => void;
  onUpdateStyle: (style: FeatureStyleType) => void;
  onDeleteGroup: () => void;
  onUpdateValueLabel: (valueIndex: number, label: string) => void;
  onUpdateValueSwatch: (valueIndex: number, swatch: ISwatch) => void;
  onDeleteValue: (valueIndex: number) => void;
  onAddValue: () => void;
  onReorderValues: (values: IOptionValue[]) => void;
}

export const SortableOptionGroup = ({
  group,
  fieldId,
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (_event: DragStartEvent) => {
    // Drag start - no action needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
                  isDeleteDisabled={group.values.length <= 1}
                  onLabelChange={(label) =>
                    onUpdateValueLabel(valueIndex, label)
                  }
                  onSwatchChange={(swatch) =>
                    onUpdateValueSwatch(valueIndex, swatch)
                  }
                  onDelete={() => onDeleteValue(valueIndex)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null} />
        </DndContext>
      </div>
    </div>
  );
};
