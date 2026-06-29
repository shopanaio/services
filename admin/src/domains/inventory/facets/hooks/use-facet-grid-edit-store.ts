import { create } from "zustand";
import type { ApiGenericUserError } from "@/graphql/types";

export type FacetGridRowId = `facet:${string}` | `value:${string}`;

export type FacetGridEditableField =
  | "facet.label"
  | "facet.slug"
  | "facet.uiType"
  | "facet.selectionMode"
  | "value.label"
  | "value.slug"
  | "value.enabled"
  | "value.sourceHandles"
  | "value.swatchId";

export interface FacetGridFieldEdit {
  originalValue: string | number | boolean | string[] | null;
  currentValue: string | number | boolean | string[] | null;
}

type RowEdits = Partial<Record<FacetGridEditableField, FacetGridFieldEdit>>;

export interface FacetGridEditStore {
  fieldEdits: Partial<Record<FacetGridRowId, RowEdits>>;
  selectedRowIds: FacetGridRowId[];
  rowErrors: Partial<Record<FacetGridRowId, ApiGenericUserError[]>>;
  submitErrors: ApiGenericUserError[];
  status: "idle" | "saving";
  setFieldValue: (
    rowId: FacetGridRowId,
    field: FacetGridEditableField,
    originalValue: FacetGridFieldEdit["originalValue"],
    currentValue: FacetGridFieldEdit["currentValue"],
  ) => void;
  setSelectedRowIds: (rowIds: FacetGridRowId[]) => void;
  discardRow: (rowId: FacetGridRowId) => void;
  discardAll: () => void;
  startSaving: () => void;
  finishSaving: () => void;
  onSubmitAccepted: () => void;
  setRowErrors: (
    rowId: FacetGridRowId,
    errors: ApiGenericUserError[],
  ) => void;
  clearRowErrors: (rowId: FacetGridRowId) => void;
  setSubmitErrors: (errors: ApiGenericUserError[]) => void;
  clearSubmitErrors: () => void;
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getFieldEdit: (
    rowId: FacetGridRowId,
    field: FacetGridEditableField,
  ) => FacetGridFieldEdit | undefined;
  getRowEdits: (rowId: FacetGridRowId) => RowEdits | undefined;
  getAllFieldEdits: () => FacetGridEditStore["fieldEdits"];
}

function normalizeComparableValue(
  value: FacetGridFieldEdit["currentValue"],
): FacetGridFieldEdit["currentValue"] {
  if (!Array.isArray(value)) {
    return value;
  }

  return [...value]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
}

function valuesEqual(
  left: FacetGridFieldEdit["currentValue"],
  right: FacetGridFieldEdit["currentValue"],
) {
  const normalizedLeft = normalizeComparableValue(left);
  const normalizedRight = normalizeComparableValue(right);

  if (!Array.isArray(normalizedLeft) || !Array.isArray(normalizedRight)) {
    return normalizedLeft === normalizedRight;
  }

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function withoutRow<T>(
  record: Partial<Record<FacetGridRowId, T>>,
  rowId: FacetGridRowId,
): Partial<Record<FacetGridRowId, T>> {
  const { [rowId]: _discarded, ...rest } = record;
  return rest;
}

export const useFacetGridEditStore = create<FacetGridEditStore>((set, get) => ({
  fieldEdits: {},
  selectedRowIds: [],
  rowErrors: {},
  submitErrors: [],
  status: "idle",

  setFieldValue: (rowId, field, originalValue, currentValue) => {
    set((state) => {
      const nextRowEdits = { ...(state.fieldEdits[rowId] ?? {}) };

      if (valuesEqual(originalValue, currentValue)) {
        delete nextRowEdits[field];
      } else {
        nextRowEdits[field] = { originalValue, currentValue };
      }

      const nextFieldEdits =
        Object.keys(nextRowEdits).length === 0
          ? withoutRow(state.fieldEdits, rowId)
          : {
              ...state.fieldEdits,
              [rowId]: nextRowEdits,
            };

      return {
        fieldEdits: nextFieldEdits,
        rowErrors: withoutRow(state.rowErrors, rowId),
        submitErrors: [],
      };
    });
  },

  setSelectedRowIds: (rowIds) => set({ selectedRowIds: rowIds }),

  discardRow: (rowId) => {
    set((state) => ({
      fieldEdits: withoutRow(state.fieldEdits, rowId),
      rowErrors: withoutRow(state.rowErrors, rowId),
    }));
  },

  discardAll: () =>
    set({
      fieldEdits: {},
      selectedRowIds: [],
      rowErrors: {},
      submitErrors: [],
      status: "idle",
    }),

  startSaving: () => set({ status: "saving" }),

  finishSaving: () => set({ status: "idle" }),

  onSubmitAccepted: () =>
    set({
      fieldEdits: {},
      selectedRowIds: [],
      rowErrors: {},
      submitErrors: [],
      status: "idle",
    }),

  setRowErrors: (rowId, errors) => {
    set((state) => {
      if (errors.length === 0) {
        return { rowErrors: withoutRow(state.rowErrors, rowId) };
      }

      return {
        rowErrors: {
          ...state.rowErrors,
          [rowId]: errors,
        },
      };
    });
  },

  clearRowErrors: (rowId) =>
    set((state) => ({ rowErrors: withoutRow(state.rowErrors, rowId) })),

  setSubmitErrors: (errors) => set({ submitErrors: errors }),

  clearSubmitErrors: () => set({ submitErrors: [] }),

  hasChanges: () => Object.keys(get().fieldEdits).length > 0,

  getChangesCount: () =>
    Object.values(get().fieldEdits).reduce(
      (count, rowEdits) => count + Object.keys(rowEdits ?? {}).length,
      0,
    ),

  getFieldEdit: (rowId, field) => get().fieldEdits[rowId]?.[field],

  getRowEdits: (rowId) => get().fieldEdits[rowId],

  getAllFieldEdits: () => get().fieldEdits,
}));
