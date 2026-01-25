import type { ITreeTableRow } from "@/hooks";

export type RowType = "group" | "attribute";

export interface IAttributeValue {
  id: string;
  name: string;
  slug: string;
  sortIndex: number;
}

export interface IAttributeRow extends ITreeTableRow {
  type: RowType;
  values?: IAttributeValue[]; // Only for attributes
}
