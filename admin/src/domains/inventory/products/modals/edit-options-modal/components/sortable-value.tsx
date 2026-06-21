import { Button, Flex, Input } from "antd";
import { CloseOutlined, HolderOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OptionDisplayType } from "@/graphql/types";
import { useStyles } from "../edit-options-modal.styles";
import { DEFAULT_SWATCH } from "../edit-options-modal.constants";
import type { OptionEditorSwatch, OptionEditorValue } from "../types";
import { SwatchPicker } from "./swatch-picker";

interface ISortableValueProps {
  value: OptionEditorValue;
  groupDisplayType: OptionDisplayType;
  isDeleteDisabled?: boolean;
  onNameChange: (name: string) => void;
  onSwatchChange: (swatch: OptionEditorSwatch) => void;
  onDelete: () => void;
}

export const SortableValue = ({
  value,
  groupDisplayType,
  isDeleteDisabled,
  onNameChange,
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
  const showSwatchControls = groupDisplayType === OptionDisplayType.Swatch;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="edit-options-value-row"
      className={cx(styles.valueRow, isDragging && styles.valueRowDragging)}
    >
      <Input
        value={value.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Value name"
        data-testid="edit-options-value-name-input"
        prefix={
          <Flex gap={8} align="center" className={styles.inputPrefix}>
            <span
              className={styles.valueDragHandle}
              data-testid="edit-options-value-drag-handle"
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
            disabled={isDeleteDisabled}
            data-testid="edit-options-delete-value-button"
          />
        }
      />
    </div>
  );
};
