"use client";

import { Typography } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { createStyles } from "antd-style";
import type { IInventoryListItem } from "../mocks/inventory-list";
import {
  useInventoryEditStore,
  type EditableField,
} from "../hooks/useInventoryEditStore";

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
}));

interface EditableNumberCellProps
  extends CustomCellRendererProps<IInventoryListItem> {
  field: EditableField;
}

export function EditableNumberCell(props: EditableNumberCellProps) {
  const { data, value, field } = props;
  const { styles } = useStyles();
  const { getOriginalValue } = useInventoryEditStore();

  if (!data) return null;

  const originalValue = getOriginalValue(data.id, field);
  const currentValue = value as number;

  // Show diff if value changed from original
  if (originalValue !== null && originalValue !== currentValue) {
    return (
      <div className={styles.cellWrapper}>
        <span className={styles.diffCell}>
          <span className={styles.oldValue}>{originalValue}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.newValue}>{currentValue}</span>
        </span>
      </div>
    );
  }

  // Default display
  return (
    <div className={styles.cellWrapper}>
      <Typography.Text>{currentValue}</Typography.Text>
    </div>
  );
}
