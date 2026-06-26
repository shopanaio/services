import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ApiGenericUserError } from "@/graphql/types";
import type {
  IFieldEdit,
  IRowEdits,
} from "@/shared/components/editor-grid/types";
import type {
  IVariantEditorRow,
  VariantEditorRowKind,
} from "../config/types";
import type { VariantEditorSaveRow } from "../../../mappers/product-variant-editor.mapper";
import {
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_WEIGHT_UNIT,
} from "../../../utils/product-measurements";

// ============================================================================
// Types
// ============================================================================

export interface IColumnVisibility {
  [field: string]: boolean;
}

export type VariantsEditorStatus = "idle" | "saving" | "error";

export interface VariantDraftMaterializationResult {
  clientMutationId: string;
  entityId: string;
  applied: boolean;
  errors: ApiGenericUserError[];
}

export interface InitializeVariantsEditorSessionOptions {
  includeBlankRow?: boolean;
}

// Default column visibility for variants editor
export const DEFAULT_VARIANTS_COLUMN_VISIBILITY: IColumnVisibility = {
  media: true,
  price: true,
  compareAtPrice: false,
  weight: false,
  length: false,
  width: false,
  height: false,
};

const DRAFT_ROW_PREFIX = "draft:";
const BLANK_ROW_PREFIX = "blank:";

function createEditorId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}${random}`;
}

function createEmptyEditorRow(kind: VariantEditorRowKind): IVariantEditorRow {
  const isDraft = kind === "draft";

  return {
    id: createEditorId(isDraft ? DRAFT_ROW_PREFIX : BLANK_ROW_PREFIX),
    kind,
    clientMutationId: isDraft
      ? createEditorId("variant-create:")
      : undefined,
    title: isDraft ? "New variant" : "Add variant",
    imageUrl: null,
    media: [],
    options: [],
    selectedOptionValueIds: {},
    price: null,
    compareAtPrice: null,
    weight: null,
    weightUnit: DEFAULT_WEIGHT_UNIT,
    length: null,
    width: null,
    height: null,
    dimensionUnit: DEFAULT_DIMENSION_UNIT,
    rowError: null,
  };
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && "id" in item) {
        return (item as { id: unknown }).id;
      }

      return item;
    });
  }

  return value;
}

function areFieldValuesEqual(left: unknown, right: unknown): boolean {
  const comparableLeft = normalizeComparableValue(left);
  const comparableRight = normalizeComparableValue(right);

  if (Array.isArray(comparableLeft) && Array.isArray(comparableRight)) {
    return (
      comparableLeft.length === comparableRight.length &&
      comparableLeft.every((item, index) => item === comparableRight[index])
    );
  }

  return comparableLeft === comparableRight;
}

function isMeaningfulBlankValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) =>
      isMeaningfulBlankValue(item),
    );
  }

  return value !== null && value !== undefined && value !== "";
}

function applyRowPatch(
  row: IVariantEditorRow,
  patch: Partial<IVariantEditorRow>,
): IVariantEditorRow {
  const updatedRow = {
    ...row,
    ...patch,
  };

  if (patch.media) {
    updatedRow.imageUrl = patch.media[0]?.url ?? null;
  }

  return updatedRow;
}

function rowToSaveRow(row: IVariantEditorRow): VariantEditorSaveRow {
  return {
    id: row.id,
    kind: row.kind,
    clientMutationId: row.clientMutationId,
    selectedOptionValueIds: row.selectedOptionValueIds,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
    mediaFileIds: row.media.map((file) => file.id),
  };
}

function withRowError(
  row: IVariantEditorRow,
  rowErrors: Record<string, string | null>,
): IVariantEditorRow {
  return {
    ...row,
    rowError: rowErrors[row.id] ?? null,
  };
}

function getOperationErrorMessage(errors: ApiGenericUserError[]): string | null {
  if (errors.length === 0) {
    return null;
  }

  return errors.map((error) => error.message).join(" ");
}

// ============================================================================
// Store Interface
// ============================================================================

interface VariantsEditorStore {
  // State
  edits: Record<string, IRowEdits>;
  draftRows: IVariantEditorRow[];
  blankRow: IVariantEditorRow | null;
  rowErrors: Record<string, string | null>;
  columnVisibility: IColumnVisibility;
  optionColumnVisibility: Record<string, boolean>;
  status: VariantsEditorStatus;

  // Actions - Session
  initializeSession: (options?: InitializeVariantsEditorSessionOptions) => void;
  resetSession: () => void;

  // Actions - Editing
  setFieldValue: (
    rowId: string,
    field: string,
    originalValue: unknown,
    newValue: unknown
  ) => void;
  discardAll: () => void;
  discardRow: (rowId: string) => void;
  resetEdits: () => void;
  addDraftRow: () => void;
  updateDraftRow: (rowId: string, patch: Partial<IVariantEditorRow>) => void;
  removeDraftRow: (rowId: string) => void;
  materializeDraftRows: (
    results: VariantDraftMaterializationResult[],
  ) => void;
  setRowErrors: (errors: Record<string, string | null>) => void;

  // Actions - Saving
  startSaving: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;

  // Actions - Column Visibility
  setColumnVisibility: (field: string, visible: boolean) => void;
  toggleColumn: (field: string) => void;
  setOptionColumnVisibility: (optionName: string, visible: boolean) => void;
  toggleOptionColumn: (optionName: string) => void;
  resetColumnsToDefault: () => void;

  // Selectors
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getCurrentRows: (baseRows: IVariantEditorRow[]) => IVariantEditorRow[];
  getRowsForSave: (baseRows: IVariantEditorRow[]) => {
    existingRows: VariantEditorSaveRow[];
    draftRows: VariantEditorSaveRow[];
  };
  getRowEdits: (rowId: string) => IRowEdits | undefined;
  getFieldEdit: (rowId: string, field: string) => IFieldEdit | undefined;
  isColumnVisible: (field: string) => boolean;
  isOptionColumnVisible: (optionName: string) => boolean;
}

// ============================================================================
// Store
// ============================================================================

export const useVariantsEditorStore = create<VariantsEditorStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        edits: {},
        draftRows: [],
        blankRow: null,
        rowErrors: {},
        columnVisibility: DEFAULT_VARIANTS_COLUMN_VISIBILITY,
        optionColumnVisibility: {},
        status: "idle",

        // Session actions
        initializeSession: (options) =>
          set({
            edits: {},
            draftRows: [],
            blankRow: options?.includeBlankRow
              ? createEmptyEditorRow("blank")
              : null,
            rowErrors: {},
            status: "idle",
          }),
        resetSession: () =>
          set({
            edits: {},
            draftRows: [],
            blankRow: null,
            rowErrors: {},
            status: "idle",
          }),

        // Edit actions
        setFieldValue: (rowId, field, originalValue, newValue) => {
          const draftRow = get().draftRows.find((row) => row.id === rowId);
          const blankRow = get().blankRow;

          if (blankRow?.id === rowId) {
            if (!isMeaningfulBlankValue(newValue)) {
              return;
            }

            const draft = applyRowPatch(createEmptyEditorRow("draft"), {
              [field]: newValue,
            } as Partial<IVariantEditorRow>);

            set((state) => ({
              draftRows: [...state.draftRows, draft],
              blankRow: createEmptyEditorRow("blank"),
              rowErrors: {
                ...state.rowErrors,
                [draft.id]: null,
                [rowId]: null,
              },
            }));
            return;
          }

          if (draftRow) {
            set((state) => ({
              draftRows: state.draftRows.map((row) =>
                row.id === rowId
                  ? applyRowPatch(row, {
                      [field]: newValue,
                    } as Partial<IVariantEditorRow>)
                  : row,
              ),
              rowErrors: {
                ...state.rowErrors,
                [rowId]: null,
              },
            }));
            return;
          }

          set((state) => {
            const rowEdits = state.edits[rowId] || {};

            if (areFieldValuesEqual(originalValue, newValue)) {
              const { [field]: _, ...restFields } = rowEdits;
              if (Object.keys(restFields).length === 0) {
                const { [rowId]: __, ...restEdits } = state.edits;
                return {
                  edits: restEdits,
                  rowErrors: { ...state.rowErrors, [rowId]: null },
                };
              }
              return {
                edits: { ...state.edits, [rowId]: restFields },
                rowErrors: { ...state.rowErrors, [rowId]: null },
              };
            }

            return {
              edits: {
                ...state.edits,
                [rowId]: {
                  ...rowEdits,
                  [field]: { originalValue, currentValue: newValue },
                },
              },
              rowErrors: { ...state.rowErrors, [rowId]: null },
            };
          });
        },

        discardAll: () => set({ edits: {}, draftRows: [], rowErrors: {} }),
        discardRow: (rowId) =>
          set((state) => {
            const { [rowId]: _, ...restEdits } = state.edits;
            const { [rowId]: __, ...restErrors } = state.rowErrors;

            return {
              edits: restEdits,
              draftRows: state.draftRows.filter((row) => row.id !== rowId),
              rowErrors: restErrors,
            };
          }),
        resetEdits: () => set({ edits: {}, rowErrors: {} }),
        addDraftRow: () =>
          set((state) => ({
            draftRows: [...state.draftRows, createEmptyEditorRow("draft")],
          })),
        updateDraftRow: (rowId, patch) =>
          set((state) => ({
            draftRows: state.draftRows.map((row) =>
              row.id === rowId ? applyRowPatch(row, patch) : row,
            ),
          })),
        removeDraftRow: (rowId) =>
          set((state) => {
            const { [rowId]: _, ...restErrors } = state.rowErrors;

            return {
              draftRows: state.draftRows.filter((row) => row.id !== rowId),
              rowErrors: restErrors,
            };
          }),
        materializeDraftRows: (results) =>
          set((state) => {
            const rowErrors = { ...state.rowErrors };
            let draftRows = state.draftRows;

            for (const result of results) {
              const draft = draftRows.find(
                (row) => row.clientMutationId === result.clientMutationId,
              );

              if (!draft) {
                continue;
              }

              const message = getOperationErrorMessage(result.errors);
              const nextRow = {
                ...draft,
                id: result.entityId,
                kind: "existing" as const,
                rowError: message,
              };

              delete rowErrors[draft.id];
              rowErrors[result.entityId] = message;
              draftRows = draftRows.map((row) =>
                row.id === draft.id ? nextRow : row,
              );
            }

            return {
              draftRows,
              rowErrors,
            };
          }),
        setRowErrors: (errors) => set({ rowErrors: errors }),

        // Save actions
        startSaving: () => set({ status: "saving" }),
        onSaveSuccess: () => get().resetSession(),
        onSaveError: () => set({ status: "error" }),

        // Column visibility actions
        setColumnVisibility: (field, visible) =>
          set((state) => ({
            columnVisibility: { ...state.columnVisibility, [field]: visible },
          })),
        toggleColumn: (field) =>
          set((state) => ({
            columnVisibility: {
              ...state.columnVisibility,
              [field]: !state.columnVisibility[field],
            },
          })),
        setOptionColumnVisibility: (optionName, visible) =>
          set((state) => ({
            optionColumnVisibility: {
              ...state.optionColumnVisibility,
              [optionName]: visible,
            },
          })),
        toggleOptionColumn: (optionName) =>
          set((state) => ({
            optionColumnVisibility: {
              ...state.optionColumnVisibility,
              [optionName]: !(state.optionColumnVisibility[optionName] ?? true),
            },
          })),
        resetColumnsToDefault: () =>
          set({
            columnVisibility: DEFAULT_VARIANTS_COLUMN_VISIBILITY,
            optionColumnVisibility: {},
          }),

        // Selectors
        hasChanges: () =>
          Object.keys(get().edits).length > 0 ||
          get().draftRows.length > 0,
        getChangesCount: () => {
          const editCount = Object.values(get().edits).reduce(
            (count, rowEdits) => count + Object.keys(rowEdits).length,
            0,
          );

          return editCount + get().draftRows.length;
        },
        getCurrentRows: (baseRows) => {
          const state = get();
          const rows = baseRows.map((row) => {
            const rowEdits = state.edits[row.id];
            if (!rowEdits) {
              return withRowError(row, state.rowErrors);
            }

            const updatedRow = { ...row };
            for (const [field, edit] of Object.entries(rowEdits)) {
              (updatedRow as Record<string, unknown>)[field] =
                edit.currentValue;
            }

            if (rowEdits.media) {
              const media = rowEdits.media.currentValue;
              updatedRow.imageUrl = Array.isArray(media)
                ? media[0]?.url ?? null
                : updatedRow.imageUrl;
            }

            return withRowError(updatedRow, state.rowErrors);
          });

          const sessionRows = state.draftRows.map((row) =>
            withRowError(row, state.rowErrors),
          );

          if (state.blankRow) {
            sessionRows.push(withRowError(state.blankRow, state.rowErrors));
          }

          return [...rows, ...sessionRows];
        },
        getRowsForSave: (baseRows) => {
          const rows = get().getCurrentRows(baseRows).filter(
            (row) => row.kind !== "blank",
          );

          return {
            existingRows: rows
              .filter((row) => row.kind !== "draft")
              .map(rowToSaveRow),
            draftRows: rows
              .filter((row) => row.kind === "draft")
              .map(rowToSaveRow),
          };
        },
        getRowEdits: (rowId) => get().edits[rowId],
        getFieldEdit: (rowId, field) => get().edits[rowId]?.[field],
        isColumnVisible: (field) => get().columnVisibility[field] ?? true,
        isOptionColumnVisible: (optionName) =>
          get().optionColumnVisibility[optionName] ?? true,
      }),
      {
        name: "variants-editor-store",
        partialize: (state) => ({
          columnVisibility: state.columnVisibility,
          optionColumnVisibility: state.optionColumnVisibility,
        }),
      }
    ),
    { name: "variants-editor" }
  )
);
