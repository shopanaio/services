import type { OrderDirection } from "../types.js";

// ============ Cursor Types ============

export type CursorDirection = "forward" | "backward";

/**
 * Transform functions for seek values in cursors.
 * Used to convert between database values and cursor values (e.g., UUID ↔ Global ID).
 */
export type SeekTransform = {
  /** Transform value when encoding into cursor (db value → cursor value) */
  encode: (value: unknown) => unknown;
  /** Transform value when decoding from cursor (cursor value → db value) */
  decode: (value: unknown) => unknown;
};

/**
 * Map of field names to their seek transforms.
 */
export type SeekTransforms = Record<string, SeekTransform>;

export type SeekValue = {
  field: string;
  value: unknown;
  direction: OrderDirection;
};

export type CursorParams = {
  type: string;
  filtersHash: string;
  seek: SeekValue[];
};

export type SortParam = {
  field: string;
  direction: OrderDirection;
};
