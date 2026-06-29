import type {
  ApiFacetUpdateInput,
  ApiFacetValueUpdateInput,
} from "@/graphql/types";
import type {
  FacetGridEditStore,
  FacetGridRowId,
} from "../hooks/use-facet-grid-edit-store";
import { normalizeFacetSlug } from "./facet-input.mapper";
import {
  normalizeFacetValueSlug,
  normalizeSourceHandles,
} from "./facet-value-input.mapper";
import { getApiIdFromFacetGridRowId } from "./facet-grid-row.mapper";

export interface FacetGridEditInput<TInput> {
  rowId: FacetGridRowId;
  input: TInput;
}

export interface FacetGridEditMappingResult {
  facetInputs: FacetGridEditInput<ApiFacetUpdateInput>[];
  facetValueInputs: FacetGridEditInput<ApiFacetValueUpdateInput>[];
}

export function mapFacetGridEditsToInputs(
  fieldEdits: FacetGridEditStore["fieldEdits"],
): FacetGridEditMappingResult {
  const facetInputs: FacetGridEditInput<ApiFacetUpdateInput>[] = [];
  const facetValueInputs: FacetGridEditInput<ApiFacetValueUpdateInput>[] = [];

  for (const [rowId, rowEdits] of Object.entries(fieldEdits) as [
    FacetGridRowId,
    NonNullable<FacetGridEditStore["fieldEdits"][FacetGridRowId]>,
  ][]) {
    if (rowId.startsWith("facet:")) {
      const input: ApiFacetUpdateInput = {
        id: getApiIdFromFacetGridRowId(rowId),
      };

      if (rowEdits["facet.label"]) {
        input.label = String(rowEdits["facet.label"].currentValue ?? "").trim();
      }
      if (rowEdits["facet.slug"]) {
        input.slug = normalizeFacetSlug(
          String(rowEdits["facet.slug"].currentValue ?? ""),
        );
      }
      if (rowEdits["facet.uiType"]) {
        input.uiType = rowEdits["facet.uiType"]
          .currentValue as ApiFacetUpdateInput["uiType"];
      }
      if (rowEdits["facet.selectionMode"]) {
        input.selectionMode = rowEdits["facet.selectionMode"]
          .currentValue as ApiFacetUpdateInput["selectionMode"];
      }

      facetInputs.push({ rowId, input });
      continue;
    }

    const input: ApiFacetValueUpdateInput = {
      id: getApiIdFromFacetGridRowId(rowId),
    };

    if (rowEdits["value.label"]) {
      input.label = String(rowEdits["value.label"].currentValue ?? "").trim();
    }
    if (rowEdits["value.slug"]) {
      input.slug = normalizeFacetValueSlug(
        String(rowEdits["value.slug"].currentValue ?? ""),
      );
    }
    if (rowEdits["value.enabled"]) {
      input.enabled = Boolean(rowEdits["value.enabled"].currentValue);
    }
    if (rowEdits["value.sourceHandles"]) {
      input.sourceHandles = normalizeSourceHandles(
        (rowEdits["value.sourceHandles"].currentValue as string[]) ?? [],
      );
    }
    if (rowEdits["value.swatchId"]) {
      input.swatchId =
        (rowEdits["value.swatchId"].currentValue as string | null) ?? null;
    }

    facetValueInputs.push({ rowId, input });
  }

  return { facetInputs, facetValueInputs };
}
