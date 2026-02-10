"use client";

import { Flex, Button, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { PanelBase } from "../components";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token, css }) => ({
  label: css`
    color: ${token.colorText};
    font-weight: 500;
    white-space: nowrap;
  `,
  icon: css`
    font-size: 16px;
    color: ${token.colorWarning};
  `,
  divider: css`
    width: 1px;
    height: 24px;
    background: ${token.colorBorderSecondary};
    margin: 0 ${token.marginXS}px;
  `,
}));

// ============================================================================
// Component
// ============================================================================

export interface EditingPanelProps {
  /** Number of unsaved changes */
  changesCount?: number;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether save is in progress */
  saving?: boolean;
  /** Called when user clicks Save */
  onSave: () => void;
  /** Called when user clicks Discard */
  onCancel: () => void;
  /** Label for unsaved changes (default: "Unsaved changes") */
  label?: string;
  /** Label for save button (default: "Save") */
  saveLabel?: string;
  /** Label for discard button (default: "Discard") */
  discardLabel?: string;
  /** Panel width */
  width?: number | string;
  /** Custom class name */
  className?: string;
}

export function EditingPanel({
  changesCount,
  saving,
  onSave,
  onCancel,
  label = "Unsaved changes",
  saveLabel = "Save",
  discardLabel = "Discard",
  width,
  className,
}: EditingPanelProps) {
  const { styles } = useStyles();

  const displayLabel =
    changesCount !== undefined && changesCount > 0
      ? `${label} (${changesCount})`
      : label;

  return (
    <PanelBase width={width} className={className}>
      <Flex align="center" gap="small" style={{ flex: 1 }}>
        <EditOutlined className={styles.icon} />
        <Typography.Text className={styles.label}>{displayLabel}</Typography.Text>
      </Flex>

      <div className={styles.divider} />

      <Flex align="center" gap="small">
        <Button size="middle" onClick={onCancel} disabled={saving}>
          {discardLabel}
        </Button>
        <Button
          type="primary"
          size="middle"
          onClick={onSave}
          loading={saving}
        >
          {saveLabel}
        </Button>
      </Flex>
    </PanelBase>
  );
}
