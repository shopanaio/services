"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Divider, Tag } from "antd";
import { createStyles } from "antd-style";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useVariantsEditorStore } from "./hooks";
import { VariantsColumnSettings } from "./components/variants-column-settings";
import {
  extractOptionGroups,
  VariantsEditorGrid,
} from "./components/variants-editor-grid";
import type { IVariantEditorRow, IOptionGroup } from "./config/types";
import type { IEditVariantsModalPayload } from "../../modals";
import {
  getVariantEditorRowsForSave,
  mapApiVariantsToEditorInputs,
} from "../../mappers/product-variant-editor.mapper";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  body: {
    padding: "0 !important",
    display: "flex",
    flexDirection: "column",
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

// ============================================================================
// Main Component
// ============================================================================

export const EditVariantsModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantsModalPayload;
  const [submitting, setSubmitting] = useState(false);

  // Store
  const hasChanges = useVariantsEditorStore((s) => s.hasChanges());
  const changesCount = useVariantsEditorStore((s) => s.getChangesCount());
  const status = useVariantsEditorStore((s) => s.status);
  const resetEdits = useVariantsEditorStore((s) => s.resetEdits);
  const startSaving = useVariantsEditorStore((s) => s.startSaving);
  const onSaveSuccess = useVariantsEditorStore((s) => s.onSaveSuccess);
  const onSaveError = useVariantsEditorStore((s) => s.onSaveError);

  const isSaving = submitting || status === "saving";

  // Column restrictions from payload
  const availableColumns = typedPayload.availableColumns;
  const showColumnSettings = typedPayload.showColumnSettings ?? true;

  // Transform variants to input format
  const variantInputs = useMemo(
    () =>
      mapApiVariantsToEditorInputs(
        typedPayload.variants,
        typedPayload.productOptions,
      ),
    [typedPayload.variants, typedPayload.productOptions]
  );

  // Extract option groups for column settings
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variantInputs),
    [variantInputs]
  );

  // Track current rows for save
  const rowDataRef = useRef<IVariantEditorRow[]>([]);

  // Sync dirty state
  useEffect(() => {
    // setDirty(hasChanges);
  }, [hasChanges, setDirty]);

  // Reset edits on mount/unmount
  useEffect(() => {
    resetEdits();
    return () => {
      resetEdits();
    };
  }, [resetEdits]);

  // Handle row changes
  const handleChange = useCallback((rows: IVariantEditorRow[]) => {
    rowDataRef.current = rows;
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetEdits();
    pop();
  }, [resetEdits, pop]);

  // Handle save
  const handleSave = useCallback(async () => {
    const dataForSave = getVariantEditorRowsForSave(rowDataRef.current);
    setSubmitting(true);
    startSaving();

    try {
      const result = await typedPayload.onSave?.(dataForSave);

      if (result === false) {
        onSaveError();
        return;
      }

      onSaveSuccess();
      pop();
    } catch {
      onSaveError();
    } finally {
      setSubmitting(false);
    }
  }, [typedPayload, startSaving, onSaveError, onSaveSuccess, pop]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Header extra: Columns button (conditionally shown)
  const headerExtra = showColumnSettings ? (
    <div className={styles.headerExtra}>
      <VariantsColumnSettings optionGroups={optionGroups} />
      <Divider type="vertical" style={{ height: 48, margin: 0 }} />
    </div>
  ) : null;

  return (
    <ModalLayout
      name="edit-variants"
      fullWidth
      bodyClassName={styles.body}
      headerProps={{
        title: "Edit Variants",
        onClose: handleClose,
        extra: headerExtra,
        submitButtonProps: {
          onClick: handleSave,
          loading: isSaving,
          disabled: isSaving || !hasChanges,
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
          <VariantsEditorGrid
            variants={variantInputs}
            onChange={handleChange}
            availableColumns={availableColumns}
            ignoreUserSettings={!!availableColumns}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
