"use client";

import { useCallback, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, AutoComplete, Button, Flex, Input, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { FacetValueEmptyDisplayAction, FacetValueKind } from "@/graphql/types";
import {
  useMergeFacetValues,
  useUnmergeFacetValues,
  useUpdateFacetValue,
} from "../../hooks";
import type { IFacetValueGroupModalPayload } from "../../modals";
import type { FacetValueEditorRow } from "../edit-facet-modal/types";
import {
  facetValueGroupSchema,
  type FacetValueGroupFormInput,
  type FacetValueGroupFormValues,
} from "./schema";

const useStyles = createStyles(({ token }) => ({
  field: {
    minWidth: 0,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: token.colorText,
  },
  error: {
    fontSize: 12,
    color: token.colorError,
    marginTop: 4,
  },
  help: {
    marginTop: 6,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  valueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 36,
    padding: "4px 0",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  addButton: {
    alignSelf: "flex-start",
    paddingInline: 0,
  },
}));

function uniqueSourceRows(values: FacetValueEditorRow[]): FacetValueEditorRow[] {
  const rows = new Map<string, FacetValueEditorRow>();
  for (const value of values) {
    if (value.kind === FacetValueKind.Source) {
      rows.set(value.id, value);
    }
  }
  return [...rows.values()];
}

export function FacetValueGroupModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IFacetValueGroupModalPayload;
  const { mergeFacetValues, loading: merging } = useMergeFacetValues();
  const { unmergeFacetValues, loading: unmerging } = useUnmergeFacetValues();
  const { updateFacetValue, loading: updating } = useUpdateFacetValue();
  const initialValues = useMemo(
    () =>
      uniqueSourceRows(
        typedPayload.groupMode === "edit"
          ? typedPayload.initialGroupedValues ?? []
          : typedPayload.selectedValues,
      ),
    [typedPayload.groupMode, typedPayload.initialGroupedValues, typedPayload.selectedValues],
  );
  const [draftValues, setDraftValues] = useState<FacetValueEditorRow[]>(initialValues);
  const [adding, setAdding] = useState(false);

  const methods = useForm<
    FacetValueGroupFormInput,
    unknown,
    FacetValueGroupFormValues
  >({
    resolver: zodResolver(facetValueGroupSchema),
    defaultValues: {
      label: typedPayload.initialGroupLabel ?? "",
    },
  });
  const { control, handleSubmit, setError } = methods;

  const options = useMemo(() => {
    const usedIds = new Set(draftValues.map((value) => value.id));
    return typedPayload.availableValues
      .filter((value) => value.kind === FacetValueKind.Source)
      .filter((value) => !usedIds.has(value.id))
      .map((value) => ({
        value: value.id,
        label: (
          <Flex vertical>
            <span>{value.label}</span>
            <Typography.Text type="secondary">{value.handle}</Typography.Text>
          </Flex>
        ),
      }));
  }, [draftValues, typedPayload.availableValues]);

  const appendValue = useCallback(
    (id: string) => {
      const value = typedPayload.availableValues.find((candidate) => candidate.id === id);
      if (!value || value.kind !== FacetValueKind.Source) return;
      setDraftValues((current) =>
        current.some((candidate) => candidate.id === id)
          ? current
          : [...current, value],
      );
      setAdding(false);
    },
    [typedPayload.availableValues],
  );

  const removeValue = useCallback((id: string) => {
    setDraftValues((current) => current.filter((value) => value.id !== id));
  }, []);

  const onSubmit = useCallback(
    async (values: FacetValueGroupFormValues) => {
      if (draftValues.length === 0) {
        message.error("Add at least one value.");
        return;
      }

      const labelChanged =
        typedPayload.groupMode === "edit" &&
        values.label.trim() !== (typedPayload.initialGroupLabel ?? "").trim();
      const initialIds = new Set(initialValues.map((value) => value.id));
      const draftIds = new Set(draftValues.map((value) => value.id));
      const addedIds = draftValues
        .filter((value) => !initialIds.has(value.id))
        .map((value) => value.id);
      const removedIds = initialValues
        .filter((value) => !draftIds.has(value.id))
        .map((value) => value.id);

      if (typedPayload.groupMode === "edit" && !typedPayload.groupValueId) {
        message.error("Group value is missing.");
        return;
      }

      if (labelChanged && typedPayload.groupValueId) {
        const result = await updateFacetValue({
          id: typedPayload.groupValueId,
          label: values.label,
          handle: slugify(values.label),
        });
        if (result.userErrors.length > 0) {
          const firstError = result.userErrors[0];
          setError("label", { message: firstError.message });
          message.error(firstError.message);
          return;
        }
      }

      if (removedIds.length > 0) {
        const result = await unmergeFacetValues({
          sourceValueIds: removedIds,
          emptyDisplayAction: FacetValueEmptyDisplayAction.Disable,
        });
        if (result.userErrors.length > 0) {
          message.error(result.userErrors[0].message);
          return;
        }
      }

      const sourceValueIds =
        typedPayload.groupMode === "edit"
          ? addedIds
          : draftValues.map((value) => value.id);

      if (sourceValueIds.length > 0) {
        const result = await mergeFacetValues({
          facetId: typedPayload.facetId,
          sourceValueIds,
          ...(typedPayload.groupValueId
            ? { targetDisplayValueId: typedPayload.groupValueId }
            : {
                targetLabel: values.label,
                targetHandle: slugify(values.label),
              }),
        });
        if (result.userErrors.length > 0) {
          const firstError = result.userErrors[0];
          if (firstError.field?.includes("targetLabel")) {
            setError("label", { message: firstError.message });
          }
          message.error(firstError.message);
          return;
        }
      }

      await typedPayload.onSaved?.();
      message.success(
        typedPayload.groupMode === "edit" ? "Group updated." : "Group created.",
      );
      pop();
    },
    [
      draftValues,
      initialValues,
      mergeFacetValues,
      message,
      pop,
      setError,
      typedPayload,
      unmergeFacetValues,
      updateFacetValue,
    ],
  );

  const title =
    typedPayload.groupMode === "edit" ? "Edit value group" : "Create value group";
  const submitLabel =
    typedPayload.groupMode === "edit" ? "Save changes" : "Create group";

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="facet-value-group"
        header={
          <ModalHeader
            name="facet-value-group"
            title={title}
            onClose={pop}
            submitButtonProps={{
              children: submitLabel,
              loading: merging || unmerging || updating,
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        <Paper>
          <PaperHeader title="General" />
          <div className={styles.field}>
            <div className={styles.label}>Name *</div>
            <Controller
              name="label"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <Input
                    {...field}
                    autoFocus
                    placeholder="Small"
                    status={error ? "error" : undefined}
                    data-testid="facet-value-group-name-input"
                  />
                  {error ? <div className={styles.error}>{error.message}</div> : null}
                </>
              )}
            />
            <div className={styles.help}>
              Customers will see this in your store's filters
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader title="Values *" />
          <Flex vertical gap={4}>
            {draftValues.map((value) => (
              <div
                key={value.id}
                className={styles.valueRow}
                data-testid={`facet-value-group-value-row-${value.handle}`}
              >
                <span>{value.label}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  aria-label={`Remove ${value.label}`}
                  data-testid={`facet-value-group-remove-value-${value.handle}`}
                  onClick={() => removeValue(value.id)}
                />
              </div>
            ))}
            {adding ? (
              <AutoComplete
                autoFocus
                options={options}
                placeholder="Search source value..."
                data-testid="facet-value-group-source-autocomplete"
                filterOption={(input, option) => {
                  const value = typedPayload.availableValues.find(
                    (candidate) => candidate.id === option?.value,
                  );
                  const query = input.toLowerCase();
                  return Boolean(
                    value?.label.toLowerCase().includes(query) ||
                      value?.handle.toLowerCase().includes(query),
                  );
                }}
                onSelect={appendValue}
              />
            ) : null}
            <Button
              type="link"
              className={styles.addButton}
              data-testid="facet-value-group-add-value-button"
              onClick={() => setAdding(true)}
            >
              + Add another value
            </Button>
          </Flex>
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
