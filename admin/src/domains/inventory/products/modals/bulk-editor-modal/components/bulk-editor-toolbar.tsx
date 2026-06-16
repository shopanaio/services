import React, { useCallback } from "react";
import { createStyles } from "antd-style";
import { Button, Space, Typography, Badge, App } from "antd";
import { useBulkEditorStore } from "../hooks/use-bulk-editor-store";
import { ColumnSettingsPopover } from "./column-settings-popover";

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    backgroundColor: token.colorBgContainer,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  changesCount: {
    color: token.colorTextSecondary,
    fontSize: 13,
  },
  badge: {
    "& .ant-badge-count": {
      backgroundColor: token.colorPrimary,
    },
  },
}));

export const BulkEditorToolbar: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const hasChanges = useBulkEditorStore((s) => s.hasChanges());
  const changesCount = useBulkEditorStore((s) => s.getChangesCount());
  const status = useBulkEditorStore((s) => s.status);
  const discardAll = useBulkEditorStore((s) => s.discardAll);
  const startSaving = useBulkEditorStore((s) => s.startSaving);
  const onSaveSuccess = useBulkEditorStore((s) => s.onSaveSuccess);

  const isSaving = status === "saving";

  const handleDiscard = useCallback(() => {
    discardAll();
    message.info("Changes discarded");
  }, [discardAll]);

  const handleSave = useCallback(async () => {
    startSaving();

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSaveSuccess();
    message.success("Changes saved successfully");
  }, [startSaving, onSaveSuccess]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <ColumnSettingsPopover />
      </div>

      <div className={styles.right}>
        {hasChanges && (
          <>
            <Badge count={changesCount} className={styles.badge} overflowCount={99}>
              <Text className={styles.changesCount}>unsaved changes</Text>
            </Badge>
            <Space size={8}>
              <Button onClick={handleDiscard} disabled={isSaving}>
                Discard
              </Button>
              <Button type="primary" onClick={handleSave} loading={isSaving}>
                Save changes
              </Button>
            </Space>
          </>
        )}
      </div>
    </div>
  );
};
