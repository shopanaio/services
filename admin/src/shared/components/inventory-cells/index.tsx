"use client";

import React from "react";
import { Tooltip } from "antd";
import { Diff } from "@/shared/components/editor-grid";
import { calculateAvailable } from "@/shared/utils/inventory";

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
  /** Stable selector for integration tests */
  testId?: string;
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
  /** Stable selector for integration tests */
  testId?: string;
}

// ============================================================================
// Reserved Cell
// Read-only cell showing reserved quantity with tooltip
// ============================================================================

export const ReservedCell: React.FC<InventoryCellProps> = ({
  value,
  testId,
}) => (
  <Tooltip title="Managed by order system">
    <div className="ec-cell ec-cell--right" data-testid={testId}>
      {value}
    </div>
  </Tooltip>
);

// ============================================================================
// Editable Number Cell
// Shows value with diff when edited (old → new)
// ============================================================================

export const EditableInventoryCell: React.FC<EditableInventoryCellProps> = ({
  value,
  edit,
}) => {
  if (edit) {
    return (
      <div className="ec-cell ec-cell--right">
        <Diff originalValue={edit.originalValue} currentValue={edit.currentValue} />
      </div>
    );
  }

  return <div className="ec-cell ec-cell--right">{value}</div>;
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
  testId,
}) => {
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
        <div className="ec-cell ec-cell--right" data-testid={testId}>
          <Diff
            originalValue={originalAvailable}
            currentValue={newAvailable}
            isNegative={isNegative}
          />
        </div>
      );
    }
  }

  // Default display
  return (
    <div
      className={`ec-cell ec-cell--right${currentAvailable === 0 ? " ec-value--zero" : ""}`}
      data-testid={testId}
    >
      {currentAvailable}
    </div>
  );
};
