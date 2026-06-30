"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Flex, Input } from "antd";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  getAllowedFacetUiTypes,
  getDefaultFacetUiType,
  mapFacetFormToCreateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import { useCreateFacet } from "../../hooks";
import type { ICreateFacetModalPayload } from "../../modals";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import {
  createFacetSchema,
  type CreateFacetFormInput,
  type CreateFacetFormValues,
} from "./schema";
import { FacetType } from "@/graphql/types";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import "../../pickers/facet-source-picker-config";
import type { FacetSourcePickerEntity } from "../../pickers/facet-source-picker-config";
import { FacetValueCandidatesGrid } from "./facet-value-candidates-grid";

const useStyles = createStyles(({ token }) => ({
  fieldGroup: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
  },
  field: {
    flex: 1,
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
  labelInput: {
    ".ant-input-group-addon": {
      paddingInline: 2,
    },
  },
  sourceSelectorButton: {
    maxWidth: 160,
    minWidth: 96,
    paddingInline: 4,
  },
  sourceSelectorContent: {
    justifyContent: "center",
    width: "100%",
    minWidth: 0,
    span: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  },
}));

interface FacetSourceSelectorProps {
  value: CreateFacetFormInput["source"];
  hasError?: boolean;
  onClick: () => void;
}

function FacetSourceSelector({
  value,
  hasError = false,
  onClick,
}: FacetSourceSelectorProps) {
  const { styles } = useStyles();
  const label = value?.name || "Source";

  return (
    <Button
      size="small"
      type="text"
      danger={hasError}
      className={styles.sourceSelectorButton}
      onClick={onClick}
    >
      <Flex gap={4} align="center" className={styles.sourceSelectorContent}>
        <span>{label}</span>
      </Flex>
    </Button>
  );
}

const DEFAULT_VALUES: CreateFacetFormInput = {
  label: "",
  slug: "",
  facetType: FacetType.Option,
  uiType: getDefaultFacetUiType(FacetType.Option),
  source: null,
  selectedValueCandidates: [],
};

export function CreateFacetModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateFacetModalPayload;
  const { createFacet, loading } = useCreateFacet();

  const methods = useForm<CreateFacetFormInput, unknown, CreateFacetFormValues>({
    resolver: zodResolver(createFacetSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...typedPayload.initialValues,
    },
  });
  const { control, handleSubmit, setError, setValue, watch } = methods;
  const label = watch("label");
  const facetType = watch("facetType");
  const uiType = watch("uiType");
  const source = watch("source");
  const uiTypeOptions = useMemo(
    () => getAllowedFacetUiTypes(facetType),
    [facetType],
  );

  const { openPicker } = useEntityPicker<FacetSourcePickerEntity>({
    entityType: "facet-source",
    selectionMode: "single",
    initialSelection: [],
    queryMeta: {
      allowedFacetTypes: [
        FacetType.Price,
        FacetType.Tag,
        FacetType.Option,
        FacetType.Feature,
        FacetType.InStock,
      ],
    },
    onConfirm: ([selectedSource]) => {
      if (!selectedSource) return;

      setValue("facetType", selectedSource.facetType, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue(
        "source",
        {
          handle: selectedSource.handle,
          name: selectedSource.name,
        },
        { shouldValidate: true, shouldDirty: true },
      );
      setValue("selectedValueCandidates", [], {
        shouldValidate: true,
        shouldDirty: true,
      });

      const allowed = getAllowedFacetUiTypes(selectedSource.facetType);
      if (!allowed.includes(uiType)) {
        setValue("uiType", getDefaultFacetUiType(selectedSource.facetType), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
  });

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  useEffect(() => {
    if (!uiTypeOptions.includes(uiType)) {
      const nextUiType = getDefaultFacetUiType(facetType);
      setValue("uiType", nextUiType, { shouldValidate: true });
    }
  }, [facetType, setValue, uiType, uiTypeOptions]);

  const onSubmit = useCallback(
    async (values: CreateFacetFormValues) => {
      const result = await createFacet(
        mapFacetFormToCreateInput(
          { ...values, slug: slugify(values.label) },
          typedPayload.nextSortIndex,
        ),
      );

      if (result.userErrors.length > 0) {
        mapFacetUserErrorsToFormErrors(result.userErrors).forEach((error) => {
          if (error.field === "label") {
            setError("label", { message: error.message });
          }
          if (error.field === "slug") {
            setError("slug", { message: error.message });
          }
          if (error.field === "uiType") {
            setError("uiType", { message: error.message });
          }
          if (error.field === "facetType" || error.field === "source") {
            setError("source", { message: error.message });
          }
          if (error.field === "valueCandidates") {
            setError("selectedValueCandidates", { message: error.message });
          }
        });
        message.error(result.userErrors[0].message);
        return;
      }

      message.success("Facet created.");
      await typedPayload.onSaved?.();
      pop();
    },
    [createFacet, message, pop, setError, typedPayload],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-facet"
        header={
          <ModalHeader
            name="create-facet"
            title="Create facet"
            onClose={pop}
            submitButtonProps={{
              children: "Create",
              loading,
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        <Paper>
          <PaperHeader title="General" />
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <div className={styles.label}>Label</div>
              <Controller
                name="label"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Input
                      {...field}
                      autoFocus
                      className={styles.labelInput}
                      placeholder="Color"
                      status={error ? "error" : undefined}
                      addonBefore={
                        <Flex
                          align="center"
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <Controller
                            name="source"
                            control={control}
                            render={({
                              field: sourceField,
                              fieldState: { error: sourceError },
                            }) => (
                              <FacetSourceSelector
                                value={sourceField.value}
                                hasError={Boolean(sourceError)}
                                onClick={openPicker}
                              />
                            )}
                          />
                        </Flex>
                      }
                    />
                    {error && <div className={styles.error}>{error.message}</div>}
                  </>
                )}
              />
              <Controller
                name="source"
                control={control}
                render={({ fieldState: { error } }) =>
                  error ? (
                    <div className={styles.error}>{error.message}</div>
                  ) : (
                    <></>
                  )
                }
              />
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader
            title="UI type"
            actions={
              <Controller
                name="uiType"
                control={control}
                render={({ field: uiTypeField }) => (
                  <FacetUiTypeSelector
                    value={uiTypeField.value}
                    options={uiTypeOptions}
                    onChange={uiTypeField.onChange}
                  />
                )}
              />
            }
          />
        </Paper>

        <Paper>
          <PaperHeader title="Values" />
          <Controller
            name="selectedValueCandidates"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                {error ? (
                  <div className={styles.error}>{error.message}</div>
                ) : null}
                <FacetValueCandidatesGrid
                  facetType={facetType}
                  sourceHandle={source?.handle ?? null}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              </>
            )}
          />
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
