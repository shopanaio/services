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
import {
  OptionDisplayType,
  type ApiProductOption,
  type ApiProductOptionValue,
  type ApiProductOptionSwatchInput,
} from "@/graphql/types";
import { useStyles } from "../edit-options-modal.styles";
import { DisplayTypeSelector } from "./style-selector";
import { SortableValue } from "./sortable-value";

interface ISortableOptionGroupProps {
  group: ApiProductOption;
  fieldId: string;
  onUpdateName: (name: string) => void;
  onUpdateDisplayType: (displayType: OptionDisplayType) => void;
  onDeleteGroup: () => void;
  onUpdateValueName: (valueIndex: number, name: string) => void;
  onUpdateValueSwatch: (valueIndex: number, swatch: ApiProductOptionSwatchInput) => void;
  onDeleteValue: (valueIndex: number) => void;
  onAddValue: () => void;
  onReorderValues: (values: ApiProductOptionValue[]) => void;
}

export const SortableOptionGroup = ({
  group,
  fieldId,
  onUpdateName,
  onUpdateDisplayType,
  onDeleteGroup,
  onUpdateValueName,
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
      const newValues = arrayMove(group.values, oldIndex, newIndex);
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
              <DisplayTypeSelector value={group.displayType} onChange={onUpdateDisplayType} />
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
                  groupDisplayType={group.displayType}
                  isDeleteDisabled={group.values.length <= 1}
                  onNameChange={(name) =>
                    onUpdateValueName(valueIndex, name)
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
