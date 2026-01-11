export type RowType = "group" | "attribute";

export interface IAttributeValue {
  id: string;
  name: string;
  slug: string;
  sortIndex: number;
}

export interface IAttributeRow {
  id: string;
  type: RowType;
  name: string;
  parentId: string | null;
  sortIndex: number;
  level: number; // 0 = group, 1 = attribute
  values?: IAttributeValue[]; // Only for attributes
}
