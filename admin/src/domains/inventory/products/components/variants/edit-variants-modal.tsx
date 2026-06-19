"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { Divider, Tag } from "antd";
import { createStyles } from "antd-style";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useVariantsEditorStore } from "./hooks";
import {
  VariantsEditorGrid,
  VariantsColumnSettings,
  extractOptionGroups,
} from "./components";
import type { IVariantInput } from "./components/variants-editor-grid";
import type { IVariantEditorRow, IOptionGroup } from "./config/types";
import type { IEditVariantsModalPayload } from "../../modals";
import type { ApiProductOption, ApiVariant } from "@/graphql/types";
import {
  mapApiDimensionsToVariantFields,
  mapApiWeightToVariantFields,
} from "../../utils/product-measurements";

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
// Helpers
// ============================================================================

function transformVariantsToInput(
  variants: ApiVariant[],
  productOptions: ApiProductOption[],
): IVariantInput[] {
  const optionsById = new Map(
    productOptions.map((option) => [option.id, option]),
  );

  return variants.map((variant) => ({
    ...mapApiWeightToVariantFields(variant.inventoryItem?.weight),
    ...mapApiDimensionsToVariantFields(variant.inventoryItem?.dimensions),
    id: variant.id,
    title: variant.title ?? variant.handle,
    imageUrl: variant.media[0]?.file.url ?? null,
    media: variant.media.map((media) => media.file.url),
    options: variant.selectedOptions.map((selectedOption) => {
      const option = optionsById.get(selectedOption.optionId);
      const value = option?.values.find(
        (candidate) => candidate.id === selectedOption.optionValueId,
      );

      return {
        name: option?.name ?? "Option",
        value: value?.name ?? "Unknown option",
      };
    }),
    sku: variant.inventoryItem?.sku ?? null,
    barcode: null,
    onHand: variant.inventoryItem?.totalAvailable ?? 0,
    unavailable: 0,
    reserved: 0,
    price: variant.price?.amountMinor ?? 0,
    compareAtPrice: variant.price?.compareAtMinor ?? null,
    costPrice: variant.inventoryItem?.unitCost?.amountMinor ?? null,
  }));
}

function getDataForSave(rows: IVariantEditorRow[]) {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    // Inventory quantities
    onHand: row.onHand,
    unavailable: row.unavailable,
    reserved: row.reserved,
    available: row.available,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    costPrice: row.costPrice,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
  }));
}

// ============================================================================
// Main Component
// ============================================================================

export const EditVariantsModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantsModalPayload;

  // Store
  const hasChanges = useVariantsEditorStore((s) => s.hasChanges());
  const changesCount = useVariantsEditorStore((s) => s.getChangesCount());
  const status = useVariantsEditorStore((s) => s.status);

  const { resetEdits } = useVariantsEditorStore.getState();

  const isSaving = status === "saving";

  // Column restrictions from payload
  const availableColumns = typedPayload.availableColumns;
  const showColumnSettings = typedPayload.showColumnSettings ?? true;

  // Transform variants to input format
  const variantInputs = useMemo(
    () =>
      transformVariantsToInput(
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
  const handleSave = useCallback(() => {
    const dataForSave = getDataForSave(rowDataRef.current);
    typedPayload.onSave?.(dataForSave);
    resetEdits();
    pop();
  }, [typedPayload, resetEdits, pop]);

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
