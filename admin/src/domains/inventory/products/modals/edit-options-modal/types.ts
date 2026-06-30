import type { OptionDisplayType, SwatchType } from "@/graphql/types";

export interface OptionEditorSwatch {
  swatchType: SwatchType;
  colorOne?: string | null;
  colorTwo?: string | null;
  fileId?: string | null;
  fileUrl?: string | null;
  metadata?: unknown;
}

export interface OptionEditorValue {
  id: string;
  apiId?: string;
  apiSwatchId?: string;
  name: string;
  slug: string;
  sortIndex: number;
  swatch: OptionEditorSwatch | null;
}

export interface OptionEditorGroup {
  id: string;
  apiId?: string;
  name: string;
  slug: string;
  displayType: OptionDisplayType;
  sortIndex: number;
  values: OptionEditorValue[];
}
