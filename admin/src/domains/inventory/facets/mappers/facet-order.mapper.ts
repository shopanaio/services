import type {
  ApiFacetMoveInput,
  ApiFacetValueUpdateInput,
} from "@/graphql/types";
import {
  getApiIdFromFacetGridRowId,
  type FacetGridRow,
  type FacetGridRowId,
} from "./facet-grid-row.mapper";

export type FacetOrderRowId = FacetGridRowId;

export interface FacetOrderEdit {
  rowKind: "facet" | "value";
  parentId: FacetOrderRowId | null;
  originalParentId: FacetOrderRowId | null;
  originalSortIndex: number;
  sortIndex: number;
}

export interface FacetOrderInputMappingResult {
  facetMoveInputs: Array<{ rowId: FacetOrderRowId; input: ApiFacetMoveInput }>;
  facetValueInputs: Array<{
    rowId: FacetOrderRowId;
    input: ApiFacetValueUpdateInput;
  }>;
}

export function mapFacetOrderEditsToInputs(
  orderEdits: Partial<Record<FacetOrderRowId, FacetOrderEdit>>,
  finalRows: FacetGridRow[],
): FacetOrderInputMappingResult {
  const facetMoveInputs: FacetOrderInputMappingResult["facetMoveInputs"] = [];
  const facetValueInputs: FacetOrderInputMappingResult["facetValueInputs"] = [];
  const editedFacetRowIds = new Set(
    Object.entries(orderEdits)
      .filter(([, edit]) => edit.rowKind === "facet")
      .map(([rowId]) => rowId as FacetOrderRowId),
  );
  const finalFacetRows = finalRows
    .filter((row) => row.type === "facet" && row.parentId === null)
    .sort((left, right) => left.sortIndex - right.sortIndex);

  for (const rowId of editedFacetRowIds) {
    const index = finalFacetRows.findIndex((row) => row.id === rowId);
    const row = finalFacetRows[index];
    if (!row?.apiId) {
      continue;
    }

    facetMoveInputs.push({
      rowId,
      input: {
        id: row.apiId,
        afterFacetId: finalFacetRows[index - 1]?.apiId ?? null,
        beforeFacetId: finalFacetRows[index + 1]?.apiId ?? null,
      },
    });
  }

  for (const [rowId, edit] of Object.entries(orderEdits) as [
    FacetOrderRowId,
    FacetOrderEdit,
  ][]) {
    if (edit.rowKind === "facet") {
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

  return { facetMoveInputs, facetValueInputs };
}
