"use client";

import { useCallback } from "react";
import { App } from "antd";
import type { ApiGenericUserError } from "@/graphql/types";
import type { FacetGridFields } from "../graphql/operation-types";
import {
  apiFacetsToFacetGridRows,
  mapFacetGridEditsToInputs,
  type FacetGridRow,
} from "../mappers";
import { useUpdateFacet } from "./use-update-facet";
import { useUpdateFacetValue } from "./use-update-facet-value";
import {
  useFacetGridEditStore,
  type FacetGridRowId,
} from "./use-facet-grid-edit-store";

interface UseSaveFacetGridEditsOptions {
  refetchFacets: () => Promise<FacetGridFields[]>;
  resetRowsFromServer: (nextRows: FacetGridRow[]) => void;
}

function getUnexpectedError(error: unknown): ApiGenericUserError {
  return {
    message:
      error instanceof Error ? error.message : "Failed to save facet changes.",
    code: "FACET_SAVE_FAILED",
  };
}

export function useSaveFacetGridEdits({
  refetchFacets,
  resetRowsFromServer,
}: UseSaveFacetGridEditsOptions) {
  const { message } = App.useApp();
  const { updateFacet } = useUpdateFacet();
  const { updateFacetValue } = useUpdateFacetValue();

  const saveFacetGridEdits = useCallback(async () => {
    const store = useFacetGridEditStore.getState();
    const fieldEdits = store.getAllFieldEdits();

    if (Object.keys(fieldEdits).length === 0) {
      message.info("There are no facet changes to save.");
      return false;
    }

    store.startSaving();
    store.clearSubmitErrors();

    try {
      const { facetInputs, facetValueInputs } =
        mapFacetGridEditsToInputs(fieldEdits);

      for (const { rowId, input } of facetInputs) {
        const result = await updateFacet(input);
        if (result.userErrors.length > 0) {
          store.setRowErrors(rowId, result.userErrors);
          message.error(result.userErrors[0].message);
          return false;
        }
        store.discardRow(rowId);
      }

      for (const { rowId, input } of facetValueInputs) {
        const result = await updateFacetValue(input);
        if (result.userErrors.length > 0) {
          store.setRowErrors(rowId, result.userErrors);
          message.error(result.userErrors[0].message);
          return false;
        }
        store.discardRow(rowId);
      }

      store.onSubmitAccepted();
      const freshFacets = await refetchFacets();
      resetRowsFromServer(apiFacetsToFacetGridRows(freshFacets));
      message.success("Facet changes saved.");
      return true;
    } catch (error) {
      const submitError = getUnexpectedError(error);
      store.setSubmitErrors([submitError]);
      message.error(submitError.message);
      return false;
    } finally {
      useFacetGridEditStore.getState().finishSaving();
    }
  }, [message, refetchFacets, resetRowsFromServer, updateFacet, updateFacetValue]);

  const discardFacetGridEdits = useCallback(
    (rows: FacetGridRow[]) => {
      const store = useFacetGridEditStore.getState();
      store.discardAll();
      resetRowsFromServer(rows);
    },
    [resetRowsFromServer],
  );

  return { saveFacetGridEdits, discardFacetGridEdits };
}

export function getFirstFacetGridEditError(
  submitErrors: ApiGenericUserError[],
  rowErrors: Partial<Record<FacetGridRowId, ApiGenericUserError[]>>,
) {
  return submitErrors[0] ?? Object.values(rowErrors).flat()[0] ?? null;
}
