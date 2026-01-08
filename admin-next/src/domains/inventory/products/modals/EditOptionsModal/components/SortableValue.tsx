import { Button, Flex, Input } from "antd";
import { CloseOutlined, HolderOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStyles } from "../EditOptionsModal.styles";
import { DEFAULT_SWATCH } from "../EditOptionsModal.constants";
import type { IOptionValue, ISwatch, FeatureStyleType } from "../EditOptionsModal.schema";
import { SwatchPicker } from "./SwatchPicker";

interface ISortableValueProps {
  value: IOptionValue;
  groupStyle: FeatureStyleType;
  onLabelChange: (label: string) => void;
  onSwatchChange: (swatch: ISwatch) => void;
  onDelete: () => void;
}

export const SortableValue = ({
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
