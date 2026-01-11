import { useState } from "react";
import { Tag, Tooltip, Typography } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { useCopyableChipStyles } from "../product-info-header.styles";
import type { ICopyableChipProps } from "../types";

export const CopyableChip = ({
  label,
  value,
  displayValue,
  mono,
}: ICopyableChipProps) => {
  const { styles } = useCopyableChipStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? "Copied!" : undefined}>
      <Tag color="default" onClick={handleCopy} className={styles.copyableChip}>
        {label && (
          <Typography.Text type="secondary" className={styles.chipLabel}>
            {label}
          </Typography.Text>
        )}
        <Typography.Text
          className={mono ? styles.chipValueMono : styles.chipValue}
        >
          {displayValue || value}
        </Typography.Text>
        {copied ? (
          <CheckOutlined className={styles.chipIconSuccess} />
        ) : (
          <CopyOutlined className={styles.chipIcon} />
        )}
      </Tag>
    </Tooltip>
  );
};
