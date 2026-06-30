import type { ITreeTableRow } from "@/hooks/use-tree-table-drag-drop";

export type AttributeEditorRowType = "group" | "attribute";

export interface AttributeEditorValue {
  id: string;
  apiId?: string;
  name: string;
  slug: string;
  sortIndex: number;
}

export interface AttributeEditorRow extends ITreeTableRow {
  id: string;
  apiId?: string;
  apiType?: AttributeEditorRowType;
  type: AttributeEditorRowType;
  name: string;
  slug: string;
  parentId: string | null;
  sortIndex: number;
  level: 0 | 1;
  values: AttributeEditorValue[];
}
