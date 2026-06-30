import type { FacetValueKind } from "@/graphql/types";
import type { OptionEditorSwatch } from "../../../products/modals/edit-options-modal/types";

export interface FacetValueEditorRow {
  id: string;
  apiId?: string;
  apiSwatchId?: string;
  kind: FacetValueKind;
  label: string;
  handle: string;
  sortIndex: number;
  enabled: boolean;
  parent?: {
    id: string;
    label: string;
    handle: string;
  } | null;
  sourceValues: Array<{
    id: string;
    label: string;
    handle: string;
  }>;
  swatch?: OptionEditorSwatch | null;
}

export type { EditFacetFormValues } from "./schema";
