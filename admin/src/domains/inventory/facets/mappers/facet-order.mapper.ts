import type {
  ApiFacetUpdateInput,
  ApiFacetValueUpdateInput,
} from "@/graphql/types";
import type { FacetGridRowId } from "../hooks/use-facet-grid-edit-store";
import { getApiIdFromFacetGridRowId } from "./facet-grid-row.mapper";

export type FacetOrderRowId = FacetGridRowId;

export interface FacetOrderEdit {
  rowKind: "facet" | "value";
  parentId: FacetOrderRowId | null;
  originalParentId: FacetOrderRowId | null;
  originalSortIndex: number;
  sortIndex: number;
}

export interface FacetOrderInputMappingResult {
  facetInputs: Array<{ rowId: FacetOrderRowId; input: ApiFacetUpdateInput }>;
  facetValueInputs: Array<{
    rowId: FacetOrderRowId;
    input: ApiFacetValueUpdateInput;
  }>;
}

export function mapFacetOrderEditsToInputs(
  orderEdits: Partial<Record<FacetOrderRowId, FacetOrderEdit>>,
): FacetOrderInputMappingResult {
  const facetInputs: FacetOrderInputMappingResult["facetInputs"] = [];
  const facetValueInputs: FacetOrderInputMappingResult["facetValueInputs"] = [];

  for (const [rowId, edit] of Object.entries(orderEdits) as [
    FacetOrderRowId,
    FacetOrderEdit,
  ][]) {
    if (edit.rowKind === "facet") {
      facetInputs.push({
        rowId,
        input: {
          id: getApiIdFromFacetGridRowId(rowId),
          sortIndex: edit.sortIndex,
        },
      });
      continue;
    }

    facetValueInputs.push({
      rowId,
      input: {
        id: getApiIdFromFacetGridRowId(rowId),
        sortIndex: edit.sortIndex,
      },
    });
  }

  return { facetInputs, facetValueInputs };
}
