"use client";

import { useState } from "react";
import { Tag, Tooltip, Typography } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";

// ============================================================================
// Types
// ============================================================================

export interface ICopyableChipProps {
  /** Label text displayed before value */
  label?: string;
  /** Value to copy to clipboard */
  value: string;
  /** Display value (if different from copy value) */
  displayValue?: string;
  /** Use monospace font */
  mono?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  chip: {
    cursor: "pointer",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
  },
  label: {
    fontSize: token.fontSizeSM,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginRight: 4,
  },
  value: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  valueMono: {
    fontSize: 11,
    color: token.colorTextSecondary,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  icon: {
    fontSize: 9,
    color: token.colorTextTertiary,
  },
  iconSuccess: {
    fontSize: 9,
    color: token.colorSuccess,
  },
}));

// ============================================================================
// Component
// ============================================================================

export const CopyableChip = ({
  label,
  value,
  displayValue,
  mono,
}: ICopyableChipProps) => {
  const { styles } = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? "Copied!" : undefined}>
      <Tag color="default" onClick={handleCopy} className={styles.chip}>
        {label && (
          <Typography.Text type="secondary" className={styles.label}>
            {label}
          </Typography.Text>
        )}
        <Typography.Text className={mono ? styles.valueMono : styles.value}>
          {displayValue || value}
        </Typography.Text>
        {copied ? (
          <CheckOutlined className={styles.iconSuccess} />
        ) : (
          <CopyOutlined className={styles.icon} />
        )}
      </Tag>
    </Tooltip>
  );
};
