import React, { useCallback } from "react";
import { useCellSelectionContext, useCellSelectionStore } from "./CellSelectionProvider";

interface SelectableCellProps {
  /** Row ID for this cell */
  rowId: string;
  /** Field/column name for this cell */
  field: string;
  /** Cell content */
  children: React.ReactNode;
  /** Disable selection for this cell */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Wrapper component that makes a cell selectable
 * Handles mouse events and applies selection styling
 *
 * @example
 * ```tsx
 * export const PriceCellRenderer: React.FC<Props> = (props) => {
 *   return (
 *     <SelectableCell rowId={props.data.id} field="price">
 *       {formatPrice(props.value)}
 *     </SelectableCell>
 *   );
 * };
 * ```
 */
export const SelectableCell: React.FC<SelectableCellProps> = ({
  rowId,
  field,
  children,
  disabled = false,
  className,
}) => {
  const { handlers } = useCellSelectionContext();
  const store = useCellSelectionStore();

  // Subscribe to selection state for this specific cell
  const isSelected = store((state) => state.isCellSelected(rowId, field));

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;
      handlers.handleMouseDown(rowId, field, event);
    },
    [handlers, rowId, field, disabled]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    handlers.handleMouseEnter(rowId, field);
  }, [handlers, rowId, field, disabled]);

  return (
    <div
      data-selectable="true"
      data-selected={isSelected}
      className={className}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};
