"use client";

import React, { useCallback, useEffect } from "react";
import { createStyles } from "antd-style";
import { Button, Badge, Typography } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useBulkEditorStore } from "./hooks/useBulkEditorStore";
import { useBulkEditorData } from "./hooks/useBulkEditorData";
import { BulkEditorGrid } from "./components/BulkEditorGrid";
import { ColumnSettingsPopover } from "./components/ColumnSettingsPopover";

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  body: {
    padding: "0 !important",
    display: "flex",
    flexDirection: "column",
    // Make the inner content wrapper fill available space
    "& > div": {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "0 !important",
      gap: "0 !important",
      maxWidth: "none !important",
      width: "100%",
    },
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: "100%",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "8px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    backgroundColor: token.colorBgContainer,
  },
  gridContainer: {
    flex: 1,
    overflow: "hidden",
    minHeight: 0, // Important for flex children to shrink properly
    width: "100%",
  },
  headerExtra: {
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

export const BulkEditorModal: React.FC = () => {
  const { styles } = useStyles();
  const { pop, setDirty } = useModalStackContext();
  const { productsCount, variantsCount } = useBulkEditorData();

  const hasChanges = useBulkEditorStore((s) => s.hasChanges());
  const changesCount = useBulkEditorStore((s) => s.getChangesCount());
  const status = useBulkEditorStore((s) => s.status);
  const discardAll = useBulkEditorStore((s) => s.discardAll);
  const startSaving = useBulkEditorStore((s) => s.startSaving);
  const onSaveSuccess = useBulkEditorStore((s) => s.onSaveSuccess);
  const closeEditor = useBulkEditorStore((s) => s.closeEditor);

  const isSaving = status === "saving";

  // Sync dirty state with modal
  useEffect(() => {
    setDirty(hasChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanges]);

  const handleClose = useCallback(() => {
    closeEditor();
    pop();
  }, [closeEditor, pop]);

  const handleDiscard = useCallback(() => {
    discardAll();
  }, [discardAll]);

  const handleSave = useCallback(async () => {
    startSaving();
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSaveSuccess();
    handleClose();
  }, [startSaving, onSaveSuccess, handleClose]);

  const headerExtra = (
    <div className={styles.headerExtra}>
      {hasChanges && (
        <>
          <Badge count={changesCount} className={styles.badge} overflowCount={99}>
            <Text className={styles.changesCount}>unsaved</Text>
          </Badge>
          <Button size="small" onClick={handleDiscard} disabled={isSaving}>
            Discard
          </Button>
        </>
      )}
    </div>
  );

  return (
    <ModalLayout
      name="bulk-editor"
      fullWidth
      bodyClassName={styles.body}
      headerProps={{
        title: `Bulk Editor · ${productsCount} products, ${variantsCount} variants`,
        onClose: handleClose,
        extra: headerExtra,
        submitButtonProps: hasChanges
          ? {
              onClick: handleSave,
              loading: isSaving,
              disabled: !hasChanges,
            }
          : null,
      }}
    >
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <ColumnSettingsPopover />
        </div>
        <div className={styles.gridContainer}>
          <BulkEditorGrid />
        </div>
      </div>
    </ModalLayout>
  );
};
