"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { App } from "antd";
import { EditorGrid } from "@/shared/components/editor-grid";
import type { ICellSelection } from "@/shared/components/ag-grid-cell-selection";
import { validateFieldChange } from "@/shared/utils/inventory";
import {
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_WEIGHT_UNIT,
} from "@/domains/inventory/products/utils/product-measurements";
import { useVariantsEditorStore, useVariantsColumns } from "../hooks";
import {
  SELECTABLE_COLUMNS,
} from "../config";
import type {
  IVariantEditorInput,
  IVariantEditorRow,
  IOptionGroup,
  VariantColumnField,
} from "../config/types";
import type { ApiFile, ApiProductOption, CurrencyCode } from "@/graphql/types";
import {
  useEditMediaModal,
  type IEditMediaModalPayload,
} from "../../../modals";

// ============================================================================
// Types
// ============================================================================

export type IVariantInput = IVariantEditorInput;

interface VariantsEditorGridProps {
  variants: IVariantEditorInput[];
  onChange?: (rows: IVariantEditorRow[]) => void;
  /**
   * When provided, only these columns will be shown.
   * If undefined, all columns are available with user settings.
   */
  availableColumns?: VariantColumnField[];
  /**
   * When true, column visibility ignores user settings and uses availableColumns only.
   * Useful for restricted views like pricing modal.
   */
  ignoreUserSettings?: boolean;
  /**
   * When provided, only these visible columns can be edited.
   * If undefined, column config decides editability.
   */
  editableColumns?: VariantColumnField[];
  defaultCurrency?: CurrencyCode | null;
  productOptions?: ApiProductOption[];
  productMediaFiles?: ApiFile[];
  dataTestId?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function extractOptionGroups(
  variants: IVariantEditorInput[],
  productOptions: ApiProductOption[] = [],
): IOptionGroup[] {
  const apiOptionGroups = [...productOptions]
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((option) => ({
      name: option.name,
      values: [...option.values]
        .sort((left, right) => left.sortIndex - right.sortIndex)
        .map((value) => value.name),
    }));

  if (apiOptionGroups.length > 0) {
    return apiOptionGroups;
  }

  const groupMap = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const option of variant.options || []) {
      if (!groupMap.has(option.name)) {
        groupMap.set(option.name, new Set());
      }
      groupMap.get(option.name)!.add(option.value);
    }
  }

  return Array.from(groupMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

function variantsToRows(variants: IVariantEditorInput[]): IVariantEditorRow[] {
  return variants.map((v) => {
    const onHand = v.onHand ?? 0;
    const unavailable = v.unavailable ?? 0;
    const reserved = v.reserved ?? 0;
    const available = onHand - unavailable - reserved;

    return {
      id: v.id,
      title: v.title,
      imageUrl: v.imageUrl ?? null,
      media: v.media ?? [],
      options: v.options || [],
      // Inventory identification
      sku: v.sku ?? null,
      // Inventory quantities
      onHand,
      unavailable,
      reserved,
      available,
      // Pricing
      price: v.price ?? null,
      compareAtPrice: v.compareAtPrice ?? null,
      costPrice: v.costPrice ?? null,
      // Shipping
      weight: v.weight ?? null,
      weightUnit: v.weightUnit ?? DEFAULT_WEIGHT_UNIT,
      length: v.length ?? null,
      width: v.width ?? null,
      height: v.height ?? null,
      dimensionUnit: v.dimensionUnit ?? DEFAULT_DIMENSION_UNIT,
    };
  });
}

// ============================================================================
// Component
// ============================================================================

export const VariantsEditorGrid: React.FC<VariantsEditorGridProps> = ({
  variants,
  onChange,
  availableColumns,
  ignoreUserSettings = false,
  editableColumns,
  defaultCurrency,
  productOptions = [],
  productMediaFiles = [],
  dataTestId = "variants-editor-grid",
}) => {
  // Extract option groups for column generation
  const optionGroups = useMemo(
    () => extractOptionGroups(variants, productOptions),
    [variants, productOptions]
  );

  const { message } = App.useApp();
  const { push: openEditMediaModal } = useEditMediaModal();

  // Transform variants to row data
  const initialRows = useMemo(
    () => variantsToRows(variants),
    [variants]
  );

  const currency = defaultCurrency ?? null;

  // Store hooks
  const edits = useVariantsEditorStore((s) => s.edits);
  const setFieldValue = useVariantsEditorStore((s) => s.setFieldValue);

  const rows = initialRows;
  const selectableColumns = useMemo(() => {
    if (!editableColumns) {
      return SELECTABLE_COLUMNS;
    }

    const editableColumnSet = new Set<string>(editableColumns);

    return SELECTABLE_COLUMNS.filter((field) => editableColumnSet.has(field));
  }, [editableColumns]);
  const isFieldEditable = useCallback(
    (field: string) => {
      if (!editableColumns) {
        return SELECTABLE_COLUMNS.includes(field);
      }

      return editableColumns.includes(field as VariantColumnField);
    },
    [editableColumns],
  );

  // Compute display rows (with edits applied)
  const displayRows = useMemo(() => {
    return rows.map((row) => {
      const rowEdits = edits[row.id];
      if (!rowEdits) return row;

      const updatedRow = { ...row };
      for (const [field, edit] of Object.entries(rowEdits)) {
        (updatedRow as Record<string, unknown>)[field] = edit.currentValue;
      }

      // Recalculate available if any inventory field was edited
      if (rowEdits.onHand || rowEdits.unavailable || rowEdits.reserved) {
        updatedRow.available =
          updatedRow.onHand - updatedRow.unavailable - updatedRow.reserved;
      }

      return updatedRow;
    });
  }, [rows, edits]);

  const openMediaEditor = useCallback(
    (rowIds: string[]) => {
      const uniqueRowIds = Array.from(new Set(rowIds));
      const firstRow = displayRows.find((row) => row.id === uniqueRowIds[0]);

      if (!firstRow || !isFieldEditable("media")) {
        return;
      }

      const bulk = uniqueRowIds.length > 1;
      const initialSelectedMedia = bulk ? [] : firstRow.media;
      const initialSelectedIds = initialSelectedMedia.map((file) => file.id);
      const initialSelectedIdSet = new Set(initialSelectedIds);
      const gallery = [
        ...initialSelectedMedia,
        ...productMediaFiles.filter((file) => !initialSelectedIdSet.has(file.id)),
      ];

      openEditMediaModal({
        title: bulk ? "Edit variants media" : "Edit variant media",
        galleryTitle: "Variant Media",
        featured: initialSelectedMedia[0] ?? null,
        gallery,
        selectionMode: true,
        selectedFileIds: initialSelectedIds,
        showUpload: false,
        allowDelete: false,
        allowSetFeatured: false,
        hasFeatured: false,
        onSave: (
          media: Parameters<NonNullable<IEditMediaModalPayload["onSave"]>>[0],
        ) => {
          const selectedMedia = media.gallery;

          for (const rowId of uniqueRowIds) {
            const originalRow = rows.find((row) => row.id === rowId);

            if (!originalRow) {
              continue;
            }

            setFieldValue(rowId, "media", originalRow.media, selectedMedia);
          }

          return true;
        },
      });
    },
    [
      displayRows,
      isFieldEditable,
      openEditMediaModal,
      productMediaFiles,
      rows,
      setFieldValue,
    ],
  );

  const handleOpenMediaEditor = useCallback(
    (rowId: string, selectedRowIds?: string[]) => {
      openMediaEditor(selectedRowIds?.length ? selectedRowIds : [rowId]);
    },
    [openMediaEditor],
  );

  const handleSelectionEnter = useCallback(
    (cells: ICellSelection[]) => {
      const mediaCells = cells.filter((cell) => cell.field === "media");

      if (mediaCells.length === 0) {
        return false;
      }

      openMediaEditor(mediaCells.map((cell) => cell.rowId));
      return true;
    },
    [openMediaEditor],
  );

  // Columns - pass availableColumns and ignoreUserSettings
  const columns = useVariantsColumns({
    optionGroups,
    currency,
    availableColumns,
    editableColumns,
    ignoreUserSettings,
    onEditMedia: isFieldEditable("media") ? handleOpenMediaEditor : undefined,
  });

  // Notify parent of changes
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      onChange?.(displayRows);
    }
  }, [displayRows, edits, onChange]);

  // Handle field value change with validation
  const handleSetFieldValue = useCallback(
    (rowId: string, field: string, originalValue: unknown, newValue: unknown) => {
      if (!isFieldEditable(field)) {
        return;
      }

      if (field === "media") {
        if (newValue === null) {
          setFieldValue(rowId, field, originalValue, []);
        } else if (Array.isArray(newValue)) {
          setFieldValue(rowId, field, originalValue, newValue);
        }

        return;
      }

      // Validate inventory fields using shared validator
      if (field === "onHand" || field === "unavailable") {
        const row = rows.find((r) => r.id === rowId);
        if (row) {
          const result = validateFieldChange(field, Number(newValue), {
            onHand: row.onHand,
            unavailable: row.unavailable,
            reserved: row.reserved,
            available: row.available,
          });
          if (!result.isValid) {
            message.error(result.errors[0]?.message || "Invalid value");
            return;
          }
        }
      }

      setFieldValue(rowId, field, originalValue, newValue);
    },
    [isFieldEditable, setFieldValue, rows, message]
  );

  return (
    <EditorGrid<IVariantEditorRow>
      rows={rows}
      displayRows={displayRows}
      columns={columns}
      selectableColumns={selectableColumns}
      onSetFieldValue={handleSetFieldValue}
      onSelectionEnter={handleSelectionEnter}
      dataTestId={dataTestId}
    />
  );
};

// Re-export extractOptionGroups for use in parent
export { extractOptionGroups };
