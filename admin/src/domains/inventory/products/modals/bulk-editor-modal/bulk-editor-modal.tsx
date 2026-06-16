"use client";

import React, { useCallback, useEffect } from "react";
import { createStyles } from "antd-style";
import { Divider, Tag } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useBulkEditorStore } from "./hooks/use-bulk-editor-store";
import { BulkEditorGrid } from "./components/bulk-editor-grid";
import { ColumnSettingsPopover } from "./components/column-settings-popover";

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
  gridContainer: {
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
    width: "100%",
  },
  headerExtra: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  countTag: {
    marginLeft: 4,
    marginRight: 0,
    padding: "0 6px",
    fontSize: 12,
    lineHeight: "18px",
    borderRadius: 9,
  },
}));

export const BulkEditorModal: React.FC = () => {
  const { styles } = useStyles();
  const { pop, setDirty } = useModalStackContext();

  const hasChanges = useBulkEditorStore((s) => s.hasChanges());
  const changesCount = useBulkEditorStore((s) => s.getChangesCount());
  const status = useBulkEditorStore((s) => s.status);
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

  const handleSave = useCallback(async () => {
    startSaving();
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSaveSuccess();
    handleClose();
  }, [startSaving, onSaveSuccess, handleClose]);

  const title = "Bulk Editor";

  // Header extra: Columns button (left of Save)
  const headerExtra = (
    <div className={styles.headerExtra}>
      <ColumnSettingsPopover />
      <Divider type="vertical" style={{ height: 48, margin: 0 }} />
    </div>
  );

  return (
    <ModalLayout
      name="bulk-editor"
      fullWidth
      bodyClassName={styles.body}
      headerProps={{
        title,
        onClose: handleClose,
        extra: headerExtra,
        submitButtonProps: {
          onClick: handleSave,
          loading: isSaving,
          disabled: !hasChanges,
          children: (
            <>
              Save
              {hasChanges && (
                <Tag className={styles.countTag}>{changesCount}</Tag>
              )}
            </>
          ),
        },
      }}
    >
      <div className={styles.content}>
        <div className={styles.gridContainer}>
          <BulkEditorGrid />
        </div>
      </div>
    </ModalLayout>
  );
};
