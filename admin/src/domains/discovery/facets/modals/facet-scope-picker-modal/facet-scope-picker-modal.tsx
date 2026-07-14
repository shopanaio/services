"use client";

import { useCallback, useMemo, useState } from "react";
import { App } from "antd";
import { createStyles } from "antd-style";
import type { ApiFacetScopesUpdateInput } from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityPickerContent } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { useUpdateFacetScopes } from "../../hooks";
import { getFacetScopeLabel } from "../../mappers";
import type { IFacetScopePickerModalPayload } from "../../modals";
import {
  facetPickerConfig,
  type FacetPickerEntity,
} from "../../pickers/facet-picker-config";

const useStyles = createStyles(({ token }) => ({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingSM,
    height: "100%",
    minHeight: 0,
  },
}));

export function FacetScopePickerModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as IFacetScopePickerModalPayload;
  const { updateFacetScopes, loading } = useUpdateFacetScopes();
  const initialSelection = useMemo(
    () =>
      typedPayload.facets
        .filter((facet) => facet.scopes.includes(typedPayload.scope))
        .map((facet) => facet.id),
    [typedPayload.facets, typedPayload.scope],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const lockedFacetIds = useMemo(
    () =>
      new Set(
        typedPayload.facets
          .filter(
            (facet) =>
              facet.scopes.length === 1 &&
              facet.scopes[0] === typedPayload.scope,
          )
          .map((facet) => facet.id),
      ),
    [typedPayload.facets, typedPayload.scope],
  );
  const pickerConfig = useMemo(
    () => ({
      ...facetPickerConfig,
      isRowSelectionLocked: (facet: FacetPickerEntity) =>
        lockedFacetIds.has(facet.id),
    }),
    [lockedFacetIds],
  );

  const updates = useMemo<ApiFacetScopesUpdateInput["updates"]>(() => {
    const selected = new Set(selectedIds);

    return typedPayload.facets.flatMap((facet) => {
      const wasSelected = facet.scopes.includes(typedPayload.scope);
      const isSelected = selected.has(facet.id);
      if (wasSelected === isSelected) return [];

      return [
        {
          id: facet.id,
          scopes: isSelected
            ? [...new Set([...facet.scopes, typedPayload.scope])]
            : facet.scopes.filter((scope) => scope !== typedPayload.scope),
        },
      ];
    });
  }, [selectedIds, typedPayload.facets, typedPayload.scope]);

  const handleSelectionChange = useCallback(
    (ids: string[], _entities: IPickableEntity[]) => {
      setSelectedIds(ids);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (updates.length === 0) return;
    const result = await updateFacetScopes({ updates });
    if (result.userErrors.length > 0) {
      message.error(result.userErrors[0].message);
      return;
    }

    await typedPayload.onSaved?.();
    message.success(
      `${getFacetScopeLabel(typedPayload.scope)} facets updated.`,
    );
    forcePop();
  }, [
    forcePop,
    message,
    typedPayload,
    updateFacetScopes,
    updates,
  ]);

  const scopeLabel = getFacetScopeLabel(typedPayload.scope);

  return (
    <ModalLayout
      name="facet-scope-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          name="facet-scope-picker"
          title={`${scopeLabel} context facets`}
          onClose={forcePop}
          submitButtonProps={{
            children:
              updates.length > 0 ? `Save (${updates.length})` : "Save",
            loading,
            disabled: updates.length === 0,
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.content}>
        <EntityPickerContent<FacetPickerEntity>
          config={pickerConfig}
          selectionMode="multi"
          initialSelection={initialSelection}
          excludeIds={[]}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </ModalLayout>
  );
}
