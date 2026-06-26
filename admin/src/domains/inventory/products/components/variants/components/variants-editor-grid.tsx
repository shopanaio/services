"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { EditorGrid } from "@/shared/components/editor-grid";
import type { ICellSelection } from "@/shared/components/ag-grid-cell-selection";
import { useVariantsEditorStore, useVariantsColumns } from "../hooks";
import {
  SELECTABLE_COLUMNS,
} from "../config";
import { mapVariantEditorInputsToRows } from "../../../mappers/product-variant-editor.mapper";
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
  allowDraftRows?: boolean;
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
  allowDraftRows = true,
  dataTestId = "variants-editor-grid",
}) => {
  // Extract option groups for column generation
  const optionGroups = useMemo(
    () => extractOptionGroups(variants, productOptions),
    [variants, productOptions]
  );

  const { push: openEditMediaModal } = useEditMediaModal();

  // Transform variants to row data
  const initialRows = useMemo(
    () => mapVariantEditorInputsToRows(variants),
    [variants]
  );

  const currency = defaultCurrency ?? null;

  // Store hooks
  const edits = useVariantsEditorStore((s) => s.edits);
  const draftRows = useVariantsEditorStore((s) => s.draftRows);
  const materializedRows = useVariantsEditorStore((s) => s.materializedRows);
  const blankRow = useVariantsEditorStore((s) => s.blankRow);
  const rowErrors = useVariantsEditorStore((s) => s.rowErrors);
  const setFieldValue = useVariantsEditorStore((s) => s.setFieldValue);
  const getCurrentRows = useVariantsEditorStore((s) => s.getCurrentRows);

  const rows = useMemo(() => {
    const sessionRows = allowDraftRows && blankRow
      ? [...materializedRows, ...draftRows, blankRow]
      : [...materializedRows, ...draftRows];

    return [...initialRows, ...sessionRows].map((row) => ({
      ...row,
      rowError: rowErrors[row.id] ?? null,
    }));
  }, [
    allowDraftRows,
    blankRow,
    draftRows,
    initialRows,
    materializedRows,
    rowErrors,
  ]);
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
    const currentRows = getCurrentRows(initialRows);

    return allowDraftRows
      ? currentRows
      : currentRows.filter((row) => row.kind !== "blank");
  }, [
    allowDraftRows,
    blankRow,
    draftRows,
    edits,
    getCurrentRows,
    initialRows,
    materializedRows,
    rowErrors,
  ]);

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
        allowSetFeatured: true,
        hasFeatured: true,
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

  const handleOptionValueChange = useCallback(
    (rowId: string, optionId: string, optionValueId: string) => {
      const row = displayRows.find((candidate) => candidate.id === rowId);
      const originalRow = rows.find((candidate) => candidate.id === rowId);

      if (!row || !originalRow) {
        return;
      }

      setFieldValue(rowId, "selectedOptionValueIds", originalRow.selectedOptionValueIds, {
        ...row.selectedOptionValueIds,
        [optionId]: optionValueId,
      });
    },
    [displayRows, rows, setFieldValue],
  );

  // Columns - pass availableColumns and ignoreUserSettings
  const columns = useVariantsColumns({
    optionGroups,
    productOptions,
    currency,
    availableColumns,
    editableColumns,
    ignoreUserSettings,
    onEditMedia: isFieldEditable("media") ? handleOpenMediaEditor : undefined,
    onOptionValueChange: handleOptionValueChange,
  });

  // Notify compatible external consumers of store-owned rows.
  useEffect(() => {
    if (
      Object.keys(edits).length > 0 ||
      draftRows.length > 0 ||
      materializedRows.length > 0
    ) {
      onChange?.(displayRows);
    }
  }, [
    displayRows,
    draftRows.length,
    edits,
    materializedRows.length,
    onChange,
  ]);

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

      setFieldValue(rowId, field, originalValue, newValue);
    },
    [isFieldEditable, setFieldValue]
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
