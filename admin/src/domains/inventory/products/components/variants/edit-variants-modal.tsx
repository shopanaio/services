"use client";

import { useEffect, useCallback, useMemo } from "react";
import { Button, Divider, Tag, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
import { mapVariantOperationResultsToRowState } from "../../mappers/product-errors.mapper";
import {
  mapApiVariantsToEditorInputs,
  mapVariantEditorInputsToRows,
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
  const storeDefaultCurrency = useDefaultCurrency();
  const defaultCurrency =
    typedPayload.defaultCurrency ?? storeDefaultCurrency ?? null;
  const allowDraftRows = typedPayload.allowDraftRows ?? true;

  // Store
  const hasChanges = useVariantsEditorStore((s) => s.hasChanges());
  const changesCount = useVariantsEditorStore((s) => s.getChangesCount());
  const status = useVariantsEditorStore((s) => s.status);
  const initializeSession = useVariantsEditorStore((s) => s.initializeSession);
  const resetSession = useVariantsEditorStore((s) => s.resetSession);
  const startSaving = useVariantsEditorStore((s) => s.startSaving);
  const onSaveSuccess = useVariantsEditorStore((s) => s.onSaveSuccess);
  const onSaveError = useVariantsEditorStore((s) => s.onSaveError);
  const addDraftRow = useVariantsEditorStore((s) => s.addDraftRow);
  const setRowErrors = useVariantsEditorStore((s) => s.setRowErrors);
  const materializeDraftRows = useVariantsEditorStore(
    (s) => s.materializeDraftRows,
  );
  const getCurrentRows = useVariantsEditorStore((s) => s.getCurrentRows);
  const getRowsForSave = useVariantsEditorStore((s) => s.getRowsForSave);

  const isSaving = status === "saving";

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
    () => apiVariantsToVariantOptionRows(
      typedPayload.variants,
      typedPayload.productOptions,
    ),
    [typedPayload.productOptions, typedPayload.variants],
  );

  const baseRows = useMemo(
    () => mapVariantEditorInputsToRows(variantInputs),
    [variantInputs],
  );

  // Sync dirty state
  useEffect(() => {
    setDirty(hasChanges);
  }, [hasChanges, setDirty]);

  // Reset session on mount/unmount
  useEffect(() => {
    initializeSession({ includeBlankRow: allowDraftRows });
    return () => {
      resetSession();
    };
  }, [allowDraftRows, initializeSession, resetSession]);

  // Handle close
  const handleClose = useCallback(() => {
    resetSession();
    pop();
  }, [resetSession, pop]);

  const handleAddDraftRow = useCallback(() => {
    addDraftRow();
  }, [addDraftRow]);

  // Handle save
  const handleSave = useCallback(async () => {
    const currentRows = getCurrentRows(baseRows).filter(
      (row) => row.kind !== "blank",
    );
    const optionValidation = validateVariantOptionRows(
      currentRows,
      typedPayload.productOptions,
    );

    if (optionValidation.hasErrors) {
      const validationRowErrors: Record<string, string | null> = {};

      for (const row of optionValidation.rows as Array<
        IVariantEditorRow & { validationMessage?: string | null }
      >) {
        if (row.validationMessage) {
          validationRowErrors[row.id] = row.validationMessage;
        }
      }

      setRowErrors(validationRowErrors);
      message.error(optionValidation.messages[0] ?? "Variant options are invalid.");
      return;
    }

    setRowErrors({});
    const { existingRows, draftRows } = getRowsForSave(baseRows);
    const existingCurrentRows = currentRows.filter(
      (row) => row.kind !== "draft",
    );
    const optionOperations = variantOptionRowsToProductUpdateInput(
      existingCurrentRows,
      originalOptionRows,
      typedPayload.productOptions,
    );
    const additionalOperations = optionOperations.variants?.length
      ? optionOperations
      : undefined;

    startSaving();

    try {
      const result = await typedPayload.onSave?.({
        existingRows,
        draftRows,
        additionalOperations,
      });

      if (!result || result.ok) {
        onSaveSuccess();
        pop();
        return;
      }

      const rowState = mapVariantOperationResultsToRowState({
        existingRows,
        draftRows,
        additionalOperations,
        submittedVariantOperations: result.submittedVariantOperations,
        operationResults: result.operationResults,
        userErrors: result.userErrors,
      });

      materializeDraftRows(rowState.materializedDraftRows);
      setRowErrors(rowState.rowErrors);
      onSaveError();

      message.error(
        rowState.firstMessage ??
          result.userErrors[0]?.message ??
          "Variant changes could not be saved.",
      );
    } catch (err) {
      onSaveError();
      message.error(
        err instanceof Error
          ? err.message
          : "Variant changes could not be saved.",
      );
    }
  }, [
    baseRows,
    getCurrentRows,
    getRowsForSave,
    message,
    originalOptionRows,
    materializeDraftRows,
    setRowErrors,
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
  const headerExtra = allowDraftRows || showColumnSettings ? (
    <div className={styles.headerExtra}>
      {allowDraftRows ? (
        <Button
          icon={<PlusOutlined />}
          onClick={handleAddDraftRow}
          disabled={isSaving}
        >
          Add variant
        </Button>
      ) : null}
      {showColumnSettings ? (
        <>
          <VariantsColumnSettings optionGroups={optionGroups} />
          <Divider orientation="vertical" style={{ height: 48, margin: 0 }} />
        </>
      ) : null}
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
            availableColumns={availableColumns}
            editableColumns={editableColumns}
            ignoreUserSettings={!!availableColumns}
            defaultCurrency={defaultCurrency}
            productOptions={typedPayload.productOptions}
            productMediaFiles={typedPayload.productMediaFiles ?? []}
            allowDraftRows={allowDraftRows}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
