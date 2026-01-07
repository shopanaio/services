import React, { useState, useCallback, useEffect } from "react";
import { Popover, Input, InputNumber, Button, Space } from "antd";
import { useSelectionStyles } from "./styles";

interface SetValuePopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when value is applied */
  onApply: (value: unknown) => void;
  /** Current column being edited (for type hints) */
  column: string | null;
  /** Trigger element */
  children: React.ReactNode;
  /** Input type override */
  inputType?: "text" | "number";
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Popover for entering a value to apply to selected cells
 */
export const SetValuePopover: React.FC<SetValuePopoverProps> = ({
  open,
  onOpenChange,
  onApply,
  column,
  children,
  inputType,
  placeholder,
}) => {
  const { styles } = useSelectionStyles();
  const [value, setValue] = useState<string | number>("");

  // Reset value when popover opens
  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  // Determine input type based on column name (heuristic)
  const resolvedInputType = inputType ?? inferInputType(column);

  const handleApply = useCallback(() => {
    const finalValue = resolvedInputType === "number" ? Number(value) : value;
    onApply(finalValue);
    setValue("");
  }, [value, resolvedInputType, onApply]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        handleApply();
      } else if (event.key === "Escape") {
        onOpenChange(false);
      }
    },
    [handleApply, onOpenChange]
  );

  const content = (
    <div className={styles.setValuePopover}>
      {resolvedInputType === "number" ? (
        <InputNumber
          className={styles.setValueInput}
          value={value as number}
          onChange={(v) => setValue(v ?? "")}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Enter value..."}
          style={{ width: "100%" }}
          autoFocus
        />
      ) : (
        <Input
          className={styles.setValueInput}
          value={value as string}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Enter value..."}
          autoFocus
        />
      )}
      <Space className={styles.setValueActions}>
        <Button size="small" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button size="small" type="primary" onClick={handleApply}>
          Apply
        </Button>
      </Space>
    </div>
  );

  return (
    <Popover
      content={content}
      title="Set Value"
      trigger="click"
      open={open}
      onOpenChange={onOpenChange}
      placement="bottom"
    >
      {children}
    </Popover>
  );
};

/**
 * Infer input type from column name
 */
function inferInputType(column: string | null): "text" | "number" {
  if (!column) return "text";

  const numberColumns = [
    "price",
    "cost",
    "stock",
    "quantity",
    "weight",
    "length",
    "width",
    "height",
    "amount",
    "count",
  ];

  const lowerColumn = column.toLowerCase();
  return numberColumns.some((nc) => lowerColumn.includes(nc))
    ? "number"
    : "text";
}
