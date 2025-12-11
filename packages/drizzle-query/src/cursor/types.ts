import type { OrderDirection } from "../types.js";

// ============ Cursor Types ============

export type CursorDirection = "forward" | "backward";

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
