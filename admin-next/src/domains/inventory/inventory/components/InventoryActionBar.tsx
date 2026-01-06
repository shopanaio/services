"use client";

import { Button, Space, Typography } from "antd";
import { createStyles } from "antd-style";
import { useInventoryEditStore } from "../hooks/useInventoryEditStore";

const useStyles = createStyles(({ token }) => ({
  actionBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
  },
  changesCount: {
    color: token.colorTextSecondary,
  },
}));

interface InventoryActionBarProps {
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export function InventoryActionBar({ onSave, onDiscard }: InventoryActionBarProps) {
  const { styles } = useStyles();
  const { hasChanges, getChangesCount, status } = useInventoryEditStore();

  const changesCount = getChangesCount();

  if (!hasChanges()) return null;

  return (
    <div className={styles.actionBar}>
      <Typography.Text className={styles.changesCount}>
        {changesCount} unsaved {changesCount === 1 ? "change" : "changes"}
      </Typography.Text>
      <Space>
        <Button onClick={onDiscard} disabled={status === "saving"}>
          Discard
        </Button>
        <Button type="primary" onClick={onSave} loading={status === "saving"}>
          Save changes
        </Button>
      </Space>
    </div>
  );
}
