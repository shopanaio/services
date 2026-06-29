"use client";

import { useCallback } from "react";
import { App } from "antd";
import type { ApiGenericUserError } from "@/graphql/types";
import type { FacetGridFields } from "../graphql/operation-types";
import {
  apiFacetsToFacetGridRows,
  mapFacetOrderEditsToInputs,
  type FacetGridRow,
} from "../mappers";
import type {
  FacetOrderEdit,
  FacetOrderRowId,
} from "../mappers/facet-order.mapper";
import { useUpdateFacet } from "./use-update-facet";
import { useUpdateFacetValue } from "./use-update-facet-value";

interface UseSaveFacetOrderOptions {
  refetchFacets: () => Promise<FacetGridFields[]>;
  resetRowsFromServer: (nextRows: FacetGridRow[]) => void;
  onSaved: () => void;
}

export interface SaveFacetOrderResult {
  ok: boolean;
  rowErrors: Partial<Record<FacetOrderRowId, ApiGenericUserError[]>>;
  submitErrors: ApiGenericUserError[];
}

function getUnexpectedError(error: unknown): ApiGenericUserError {
  return {
    message:
      error instanceof Error ? error.message : "Failed to save facet order.",
    code: "FACET_ORDER_SAVE_FAILED",
  };
}

export function useSaveFacetOrder({
  refetchFacets,
  resetRowsFromServer,
  onSaved,
}: UseSaveFacetOrderOptions) {
  const { message } = App.useApp();
  const { updateFacet } = useUpdateFacet();
  const { updateFacetValue } = useUpdateFacetValue();

  const saveFacetOrder = useCallback(
    async (
      orderEdits: Partial<Record<FacetOrderRowId, FacetOrderEdit>>,
    ): Promise<SaveFacetOrderResult> => {
      if (Object.keys(orderEdits).length === 0) {
        message.info("Facet order is unchanged.");
        return { ok: true, rowErrors: {}, submitErrors: [] };
      }

      try {
        const { facetInputs, facetValueInputs } =
          mapFacetOrderEditsToInputs(orderEdits);

        for (const { rowId, input } of facetInputs) {
          const result = await updateFacet(input);
          if (result.userErrors.length > 0) {
            message.error(result.userErrors[0].message);
            return {
              ok: false,
              rowErrors: { [rowId]: result.userErrors },
              submitErrors: [],
            };
          }
        }

        for (const { rowId, input } of facetValueInputs) {
          const result = await updateFacetValue(input);
          if (result.userErrors.length > 0) {
            message.error(result.userErrors[0].message);
            return {
              ok: false,
              rowErrors: { [rowId]: result.userErrors },
              submitErrors: [],
            };
          }
        }

        const freshFacets = await refetchFacets();
        resetRowsFromServer(apiFacetsToFacetGridRows(freshFacets));
        message.success("Facet order saved.");
        onSaved();
        return { ok: true, rowErrors: {}, submitErrors: [] };
      } catch (error) {
        const submitError = getUnexpectedError(error);
        message.error(submitError.message);
        return { ok: false, rowErrors: {}, submitErrors: [submitError] };
      }
    },
    [message, onSaved, refetchFacets, resetRowsFromServer, updateFacet, updateFacetValue],
  );

  return { saveFacetOrder };
}
