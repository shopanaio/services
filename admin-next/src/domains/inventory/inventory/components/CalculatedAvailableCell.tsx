"use client";

import { Typography } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { createStyles, cx } from "antd-style";
import type { IInventoryListItem } from "../mocks/inventory-list";
import { useInventoryEditStore } from "../hooks/useInventoryEditStore";

const useStyles = createStyles(({ token }) => ({
  cellWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    height: "100%",
    paddingRight: 4,
  },
  diffCell: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontStyle: "italic",
  },
  oldValue: {
    color: token.colorTextSecondary,
    textDecoration: "line-through",
  },
  arrow: {
    color: token.colorTextSecondary,
    fontSize: 12,
  },
  newValue: {
    fontWeight: 600,
  },
  newValueNegative: {
    color: token.colorError,
  },
  zeroValue: {
    color: token.colorError,
  },
}));

export function CalculatedAvailableCell(
  props: CustomCellRendererProps<IInventoryListItem>
) {
  const { data, value } = props;
  const { styles } = useStyles();
  const { getFieldEdit } = useInventoryEditStore();

  if (!data) return null;

  const currentAvailable = value as number;

  // Check if any field was edited
  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  // If any field was changed, calculate original available
  if (onHandEdit || unavailableEdit) {
    const origOnHand = onHandEdit?.originalValue ?? data.onHand;
    const origUnavailable = unavailableEdit?.originalValue ?? data.unavailable;
    const originalAvailable = origOnHand - origUnavailable - data.reserved;

    if (originalAvailable !== currentAvailable) {
      const isNegative = currentAvailable < 0;

      return (
        <div className={styles.cellWrapper}>
          <span className={styles.diffCell}>
            <span className={styles.oldValue}>{originalAvailable}</span>
            <span className={styles.arrow}>→</span>
            <span
              className={cx(
                styles.newValue,
                isNegative && styles.newValueNegative
              )}
            >
              {currentAvailable}
            </span>
          </span>
        </div>
      );
    }
  }

  // Default display
  if (currentAvailable === 0) {
    return (
      <div className={styles.cellWrapper}>
        <Typography.Text className={styles.zeroValue}>
          {currentAvailable}
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.cellWrapper}>
      <Typography.Text>{currentAvailable}</Typography.Text>
    </div>
  );
}
