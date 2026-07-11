"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Flex, Input } from "antd";
import { createStyles } from "antd-style";
import { PlusOutlined } from "@ant-design/icons";
import { LuSwatchBook } from "react-icons/lu";
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
  getFacetSourceTypeLabel,
  getFacetTypeIcon,
  isDiscreteFacetType,
  mapFacetFormToCreateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import { useCreateFacet } from "../../hooks";
import {
  useFacetSourcePickerModal,
  type ICreateFacetModalPayload,
} from "../../modals";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import {
  createFacetSchema,
  type CreateFacetFormInput,
  type CreateFacetFormValues,
} from "./schema";
import { FacetType } from "@/graphql/types";
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
  stackedField: {
    marginBottom: 16,
  },
  sourceSelectorButton: {
    width: "100%",
    height: 46,
    justifyContent: "flex-start",
    paddingInline: 12,
    borderColor: token.colorBorder,
    color: token.colorText,
  },
  sourceSelectorContent: {
    justifyContent: "flex-start",
    width: "100%",
    minWidth: 0,
  },
  sourceLine: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sourceValue: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    minWidth: 0,
    verticalAlign: "middle",
  },
}));

const MULTI_SOURCE_FACET_TYPES = new Set<FacetType>([
  FacetType.Option,
  FacetType.Feature,
]);

interface FacetSourceSelectorProps {
  value: CreateFacetFormInput["sources"];
  facetType: FacetType;
  hasError?: boolean;
  onClick: () => void;
}

function FacetSourceSelector({
  value,
  facetType,
  hasError = false,
  onClick,
}: FacetSourceSelectorProps) {
  const { styles } = useStyles();
  const sources = value ?? [];
  const hasSources = sources.length > 0;
  const sourceTypeLabel = hasSources ? getFacetSourceTypeLabel(facetType) : "Source";
  const sourceLabel = hasSources
    ? sources.map((source) => source.name).join(", ")
    : "Select source";
  const icon = hasSources ? getFacetTypeIcon(facetType) : null;

  return (
    <Button
      type="default"
      danger={hasError}
      className={styles.sourceSelectorButton}
      onClick={onClick}
      data-testid="create-facet-source-button"
    >
      <Flex gap={4} align="center" className={styles.sourceSelectorContent}>
        <span className={styles.sourceLine}>
          {sourceTypeLabel}:
          <span className={styles.sourceValue}>
            {icon}
            <strong>{sourceLabel}</strong>
          </span>
        </span>
      </Flex>
    </Button>
  );
}

const DEFAULT_VALUES: CreateFacetFormInput = {
  label: "",
  slug: "",
  facetType: FacetType.Option,
  uiType: getDefaultFacetUiType(FacetType.Option),
  sources: [],
  selectedValueCandidates: [],
};

export function CreateFacetModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateFacetModalPayload;
  const { createFacet, loading } = useCreateFacet();
  const initialSources =
    typedPayload.initialValues?.sources ??
    (typedPayload.initialValues?.source
      ? [typedPayload.initialValues.source]
      : undefined);

  const methods = useForm<CreateFacetFormInput, unknown, CreateFacetFormValues>({
    resolver: zodResolver(createFacetSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...typedPayload.initialValues,
      ...(initialSources ? { sources: initialSources } : {}),
    },
  });
  const { clearErrors, control, handleSubmit, setError, setValue, watch } =
    methods;
  const label = watch("label");
  const facetType = watch("facetType");
  const uiType = watch("uiType");
  const sources = watch("sources");
  const discrete = isDiscreteFacetType(facetType);
  const uiTypeOptions = useMemo(
    () => getAllowedFacetUiTypes(facetType),
    [facetType],
  );
  const sourceHandles = useMemo(
    () => (sources ?? []).map((source) => source.handle),
    [sources],
  );
  const initialSourceSelection = useMemo(
    () => sourceHandles.map((handle) => `${facetType}:${handle}`),
    [facetType, sourceHandles],
  );

  const { push: openFacetSourcePicker } = useFacetSourcePickerModal();
  const openPicker = useCallback(() => {
    openFacetSourcePicker({
      selectionMode: "multi",
      initialSelection: initialSourceSelection,
      initialFacetType: sources?.length ? facetType : undefined,
      queryMeta: {
        allowedFacetTypes: [
          FacetType.Price,
          FacetType.Tag,
          FacetType.Option,
          FacetType.Feature,
          FacetType.InStock,
        ],
      },
      onConfirm: (
        selectedSourceEntities: FacetSourcePickerEntity[],
        selectedIds: string[],
      ) => {
        const selectedSourceById = new Map(
          selectedSourceEntities.map((source) => [source.id, source]),
        );
        for (const source of sources ?? []) {
          const id = `${facetType}:${source.handle}`;
          if (!selectedIds.includes(id) || selectedSourceById.has(id)) continue;
          selectedSourceById.set(id, {
            id,
            title: source.name,
            facetType,
            handle: source.handle,
            name: source.name,
            typeLabel: getFacetSourceTypeLabel(facetType),
          });
        }
        const selectedSources = selectedIds
          .map((id) => selectedSourceById.get(id))
          .filter((source): source is FacetSourcePickerEntity =>
            Boolean(source),
          );

        const firstSelectedSource = selectedSources[0];
        if (!firstSelectedSource) return;
        const selectedFacetType = firstSelectedSource.facetType;
        const hasMixedFacetTypes = selectedSources.some(
          (source) => source.facetType !== selectedFacetType,
        );

        if (hasMixedFacetTypes) {
          setError("sources", {
            message: "Select sources from one facet type",
          });
          message.error("Select sources from one facet type.");
          return;
        }

        if (
          selectedSources.length > 1 &&
          !MULTI_SOURCE_FACET_TYPES.has(selectedFacetType)
        ) {
          setError("sources", {
            message: "Only option and feature facets can use multiple sources",
          });
          message.error(
            "Only option and feature facets can use multiple sources.",
          );
          return;
        }

        setValue("facetType", selectedFacetType, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue(
          "sources",
          selectedSources.map((source) => ({
            handle: source.handle,
            name: source.name,
          })),
          { shouldValidate: true, shouldDirty: true },
        );
        clearErrors("sources");
        setValue("selectedValueCandidates", [], {
          shouldValidate: true,
          shouldDirty: true,
        });

        const allowed = getAllowedFacetUiTypes(selectedFacetType);
        if (!allowed.includes(uiType)) {
          setValue("uiType", getDefaultFacetUiType(selectedFacetType), {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      },
    });
  }, [
    clearErrors,
    facetType,
    initialSourceSelection,
    message,
    openFacetSourcePicker,
    setError,
    setValue,
    sources,
    uiType,
  ]);

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
          if (
            error.field === "facetType" ||
            error.field === "source" ||
            error.field === "sources"
          ) {
            setError("sources", { message: error.message });
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
          <div className={styles.stackedField}>
            <div className={styles.label}>Source</div>
            <Controller
              name="sources"
              control={control}
              render={({
                field: sourcesField,
                fieldState: { error: sourcesError },
              }) => (
                <>
                  <FacetSourceSelector
                    value={sourcesField.value}
                    facetType={facetType}
                    hasError={Boolean(sourcesError)}
                    onClick={openPicker}
                  />
                  {sourcesError ? (
                    <div className={styles.error}>{sourcesError.message}</div>
                  ) : null}
                </>
              )}
            />
          </div>
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
                      placeholder="Color"
                      status={error ? "error" : undefined}
                      data-testid="create-facet-label-input"
                    />
                    {error && <div className={styles.error}>{error.message}</div>}
                  </>
                )}
              />
            </div>
          </div>
        </Paper>

        {discrete ? (
          <Paper>
            <PaperHeader
              title="Values"
              actions={
                <Flex gap={8} align="center">
                  <Controller
                    name="uiType"
                    control={control}
                    render={({ field: uiTypeField }) => (
                      <FacetUiTypeSelector
                        value={uiTypeField.value}
                        options={uiTypeOptions}
                        onChange={uiTypeField.onChange}
                        disabled
                      />
                    )}
                  />
                  <Button type="text" aria-label="Value swatches" disabled>
                    <Flex gap={4} align="center">
                      <LuSwatchBook />
                      <span>Off</span>
                    </Flex>
                  </Button>
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    aria-label="Add values"
                    data-testid="facet-values-add-button"
                    disabled
                  />
                </Flex>
              }
            />
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
                    sourceHandles={sourceHandles}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                </>
              )}
            />
          </Paper>
        ) : null}
      </ModalLayout>
    </FormProvider>
  );
}
