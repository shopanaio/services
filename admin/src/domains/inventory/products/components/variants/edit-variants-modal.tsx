"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Divider, Tag, App } from "antd";
import { createStyles } from "antd-style";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useDefaultCurrency } from "@/domains/workspace";
import { useVariantsEditorStore } from "./hooks";
import { VariantsColumnSettings } from "./components/variants-column-settings";
import {
  extractOptionGroups,
  VariantsEditorGrid,
} from "./components/variants-editor-grid";
import type {
  IVariantEditorRow,
  IOptionGroup,
} from "./config/types";
import type { IEditVariantsModalPayload } from "../../modals";
import {
  apiVariantsToVariantOptionRows,
  validateVariantOptionRows,
  variantOptionRowsToProductUpdateInput,
} from "../../mappers";
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
  const { message } = App.useApp();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantsModalPayload;
  const [submitting, setSubmitting] = useState(false);
  const storeDefaultCurrency = useDefaultCurrency();
  const defaultCurrency =
    typedPayload.defaultCurrency ?? storeDefaultCurrency ?? null;

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
  const editableColumns = typedPayload.editableColumns;
  const showColumnSettings = typedPayload.showColumnSettings ?? true;

  // Transform variants to input format
  const variantInputs = useMemo(
    () =>
      mapApiVariantsToEditorInputs(
        typedPayload.variants,
        typedPayload.productOptions,
        { productMediaFiles: typedPayload.productMediaFiles },
      ),
    [
      typedPayload.productOptions,
      typedPayload.productMediaFiles,
      typedPayload.variants,
    ],
  );

  // Extract option groups for column settings
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variantInputs, typedPayload.productOptions),
    [typedPayload.productOptions, variantInputs]
  );

  const originalOptionRows = useMemo(
    () =>
      apiVariantsToVariantOptionRows(
        typedPayload.variants,
        typedPayload.productOptions,
      ),
    [typedPayload.productOptions, typedPayload.variants],
  );

  // Track current rows for save
  const rowDataRef = useRef<IVariantEditorRow[]>([]);

  // Sync dirty state
  useEffect(() => {
    setDirty(hasChanges);
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
    const currentRows =
      rowDataRef.current.length > 0 ? rowDataRef.current : originalOptionRows;
    const optionValidation = validateVariantOptionRows(
      currentRows,
      typedPayload.productOptions,
    );

    if (optionValidation.hasErrors) {
      message.error(optionValidation.messages[0] ?? "Variant options are invalid.");
      return;
    }

    const optionOperations = variantOptionRowsToProductUpdateInput(
      currentRows,
      originalOptionRows,
      typedPayload.productOptions,
    );
    const dataForSave = getVariantEditorRowsForSave(currentRows);
    setSubmitting(true);
    startSaving();

    try {
      const result = await typedPayload.onSave?.(
        dataForSave,
        optionOperations.variants?.length ? optionOperations : undefined,
      );

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
  }, [
    message,
    originalOptionRows,
    typedPayload,
    startSaving,
    onSaveError,
    onSaveSuccess,
    pop,
  ]);

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
            editableColumns={editableColumns}
            ignoreUserSettings={!!availableColumns}
            defaultCurrency={defaultCurrency}
            productOptions={typedPayload.productOptions}
            productMediaFiles={typedPayload.productMediaFiles ?? []}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
