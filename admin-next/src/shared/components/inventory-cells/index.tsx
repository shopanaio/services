"use client";

import React from "react";
import { Typography, Tooltip } from "antd";
import { createStyles, cx } from "antd-style";
import { calculateAvailable } from "@/shared/utils/inventory";

// ============================================================================
// Styles
// ============================================================================

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
    fontWeight: 600,
    color: token.colorError,
  },
  zeroValue: {
    color: token.colorError,
  },
}));

// ============================================================================
// Types
// ============================================================================

export interface InventoryFieldEdit {
  originalValue: number;
  currentValue: number;
}

export interface InventoryCellProps {
  /** Current value to display */
  value: number;
  /** Whether this is a zero value (shows in red) */
  isZero?: boolean;
}

export interface EditableInventoryCellProps extends InventoryCellProps {
  /** Edit information if field was changed */
  edit?: InventoryFieldEdit;
}

export interface CalculatedAvailableCellProps {
  /** Current inventory values */
  onHand: number;
  unavailable: number;
  reserved: number;
  /** Edit information for onHand field */
  onHandEdit?: InventoryFieldEdit;
  /** Edit information for unavailable field */
  unavailableEdit?: InventoryFieldEdit;
}

// ============================================================================
// Reserved Cell
// Read-only cell showing reserved quantity with tooltip
// ============================================================================

export const ReservedCell: React.FC<InventoryCellProps> = ({ value }) => {
  const { styles } = useStyles();

  return (
    <Tooltip title="Managed by order system">
      <div className={styles.cellWrapper}>
        <Typography.Text>{value}</Typography.Text>
      </div>
    </Tooltip>
  );
};

// ============================================================================
// Editable Number Cell
// Shows value with diff when edited (old → new)
// ============================================================================

export const EditableInventoryCell: React.FC<EditableInventoryCellProps> = ({
  value,
  edit,
}) => {
  const { styles } = useStyles();

  // Show diff if there's an edit for this field
  if (edit) {
    return (
      <div className={styles.cellWrapper}>
        <span className={styles.diffCell}>
          <span className={styles.oldValue}>{edit.originalValue}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.newValue}>{edit.currentValue}</span>
        </span>
      </div>
    );
  }

  // Default display
  return (
    <div className={styles.cellWrapper}>
      <Typography.Text>{value}</Typography.Text>
    </div>
  );
};

// ============================================================================
// Calculated Available Cell
// Shows calculated available with visual diff when dependencies change
// Formula: Available = On Hand - Unavailable - Reserved
// ============================================================================

export const CalculatedAvailableCell: React.FC<CalculatedAvailableCellProps> = ({
  onHand,
  unavailable,
  reserved,
  onHandEdit,
  unavailableEdit,
}) => {
  const { styles } = useStyles();

  // Current available value
  const currentAvailable = calculateAvailable(onHand, unavailable, reserved);

  // Check if any field was edited
  if (onHandEdit || unavailableEdit) {
    const origOnHand = onHandEdit?.originalValue ?? onHand;
    const origUnavailable = unavailableEdit?.originalValue ?? unavailable;
    const originalAvailable = calculateAvailable(origOnHand, origUnavailable, reserved);

    const currOnHand = onHandEdit?.currentValue ?? onHand;
    const currUnavailable = unavailableEdit?.currentValue ?? unavailable;
    const newAvailable = calculateAvailable(currOnHand, currUnavailable, reserved);

    if (originalAvailable !== newAvailable) {
      const isNegative = newAvailable < 0;

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
              {newAvailable}
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
};
