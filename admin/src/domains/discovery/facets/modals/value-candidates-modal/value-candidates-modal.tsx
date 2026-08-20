"use client";

import { useCallback, useState } from "react";
import { App } from "antd";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { FacetValueKind } from "@/graphql/types";
import { FacetValueCandidatesGrid } from "../../components/facet-value-candidates-grid";
import type { FacetValueCandidateFormValue } from "../../components/facet-value-candidates-grid";
import { useCreateFacetValue } from "../../hooks";
import type { IFacetValueCandidatesModalPayload } from "../../modals";

export function ValueCandidatesModal() {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IFacetValueCandidatesModalPayload;
  const { createFacetValue, loading } = useCreateFacetValue();
  const [selectedValues, setSelectedValues] = useState<FacetValueCandidateFormValue[]>([]);

  const handleSubmit = useCallback(async () => {
    if (selectedValues.length === 0) {
      message.error("Select at least one value.");
      return;
    }

    for (const [index, value] of selectedValues.entries()) {
      const result = await createFacetValue({
        facetId: typedPayload.facetId,
        kind: FacetValueKind.Source,
        label: value.label,
        handle: value.handle,
        enabled: true,
        sortIndex:
          typedPayload.nextSortIndex === undefined ? undefined : typedPayload.nextSortIndex + index,
      });

      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        return;
      }
    }

    await typedPayload.onSaved?.();
    message.success("Values added.");
    pop();
  }, [createFacetValue, message, pop, selectedValues, typedPayload]);

  return (
    <ModalLayout
      name="facet-value-candidates"
      header={
        <ModalHeader
          name="facet-value-candidates"
          title="Add values"
          onClose={pop}
          submitButtonProps={{
            children: "Add selected",
            disabled: selectedValues.length === 0,
            loading,
            onClick: handleSubmit,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Values" />
        <FacetValueCandidatesGrid
          facetType={typedPayload.facetType}
          facetId={typedPayload.facetId}
          sourceHandles={typedPayload.sourceHandles}
          value={selectedValues}
          onChange={setSelectedValues}
          height={420}
        />
      </Paper>
    </ModalLayout>
  );
}
