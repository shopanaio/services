import React, { useState, useCallback } from "react";
import { Button, message, Space, Tooltip } from "antd";
import {
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useCellSelectionContext, useCellSelectionStore } from "./CellSelectionProvider";
import { useSelectionStyles } from "./styles";
import { SetValuePopover } from "./SetValuePopover";

interface SelectionToolbarProps {
  /** Additional actions to render */
  extraActions?: React.ReactNode;
  /** Hide the "Set Value" button */
  hideSetValue?: boolean;
  /** Hide the "Copy" button */
  hideCopy?: boolean;
  /** Hide the "Clear" button */
  hideClear?: boolean;
  /** Custom label for selection count */
  selectionLabel?: (count: number, column: string | null) => string;
}

/**
 * Toolbar that appears when cells are selected
 * Provides bulk actions like Set Value, Copy, Clear
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  extraActions,
  hideSetValue = false,
  hideCopy = false,
  hideClear = false,
  selectionLabel,
}) => {
  const { styles } = useSelectionStyles();
  const { api, config } = useCellSelectionContext();
  const store = useCellSelectionStore();

  const [setValueOpen, setSetValueOpen] = useState(false);

  // Subscribe to selection state
  const selectedCells = store((state) => state.selectedCells);
  const activeColumn = store((state) => state.activeColumn);

  // Don't render if no selection
  if (selectedCells.length === 0) {
    return null;
  }

  const handleCopy = useCallback(async () => {
    try {
      await api.copySelectedValues();
      message.success(`Copied ${selectedCells.length} values`);
    } catch {
      message.error("Failed to copy values");
    }
  }, [api, selectedCells.length]);

  const handleClear = useCallback(() => {
    api.clearSelectedValues();
    message.success(`Cleared ${selectedCells.length} cells`);
  }, [api, selectedCells.length]);

  const handleCancel = useCallback(() => {
    api.clearSelection();
  }, [api]);

  const handleSetValue = useCallback(
    (value: unknown) => {
      api.setSelectedValues(value);
      setSetValueOpen(false);
      message.success(`Updated ${selectedCells.length} cells`);
    },
    [api, selectedCells.length]
  );

  const label = selectionLabel
    ? selectionLabel(selectedCells.length, activeColumn)
    : `${selectedCells.length} cell${selectedCells.length === 1 ? "" : "s"} selected`;

  const hasSetValue = config.setCellValue && !hideSetValue;
  const hasCopy = config.getCellValue && !hideCopy;
  const hasClear = config.setCellValue && !hideClear;

  return (
    <div className={styles.toolbar}>
      <span className={styles.selectionCount}>{label}</span>

      <Space className={styles.toolbarActions} size="small">
        {extraActions}

        {hasSetValue && (
          <SetValuePopover
            open={setValueOpen}
            onOpenChange={setSetValueOpen}
            onApply={handleSetValue}
            column={activeColumn}
          >
            <Tooltip title="Set value to selected cells">
              <Button size="small" icon={<EditOutlined />}>
                Set Value
              </Button>
            </Tooltip>
          </SetValuePopover>
        )}

        {hasCopy && (
          <Tooltip title="Copy values to clipboard">
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              Copy
            </Button>
          </Tooltip>
        )}

        {hasClear && (
          <Tooltip title="Clear selected cell values">
            <Button size="small" icon={<DeleteOutlined />} onClick={handleClear}>
              Clear
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Cancel selection">
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            onClick={handleCancel}
          />
        </Tooltip>
      </Space>
    </div>
  );
};
