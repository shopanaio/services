"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Button,
  Flex,
  Input,
  Select,
  Skeleton,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
  getDefaultFacetSelectionMode,
  isDiscreteFacetType,
  mapFacetFormToUpdateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import {
  useDeleteFacetValue,
  useFacet,
  useUpsertFacetSwatch,
  useUpdateFacet,
  useUpdateFacetValue,
} from "../../hooks";
import {
  useCreateFacetValueModal,
  type IEditFacetModalPayload,
} from "../../modals";
import type {
  FacetSwatchFields,
  FacetValueGridFields,
} from "../../graphql/operation-types";
import type {
  OptionEditorSwatch,
  OptionEditorValue,
} from "../../../products/modals/edit-options-modal/types";
import { editFacetSchema, type EditFacetFormValues } from "./schema";
import { FacetValuesList } from "./components/facet-values-list";
import {
  FacetSelectionMode,
  FacetUiType,
  SwatchType,
  type ApiFacetSwatchCreateInput,
  type ApiFacetSwatchUpdateInput,
} from "@/graphql/types";

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
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "4px 0",
  },
  muted: {
    color: token.colorTextSecondary,
  },
}));

const EMPTY_VALUES: EditFacetFormValues = {
  label: "",
  slug: "",
  uiType: FacetUiType.Checkbox,
  selectionMode: FacetSelectionMode.Multi,
};

const DATA_URL_PATTERN = /^data:/i;

function isExistingApiFileId(
  fileId: string | null | undefined,
): fileId is string {
  return Boolean(fileId && !DATA_URL_PATTERN.test(fileId));
}

function swatchMetadataInput(
  metadata: unknown,
): Record<string, unknown> | null | undefined {
  if (metadata === null || metadata === undefined) {
    return metadata;
  }

  return typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : undefined;
}

function facetSwatchToEditorSwatch(
  swatch: FacetSwatchFields | null | undefined,
): OptionEditorSwatch | null {
  if (!swatch) {
    return null;
  }

  return {
    swatchType: swatch.swatchType,
    colorOne: swatch.colorOne,
    colorTwo: swatch.colorTwo,
    fileId:
      swatch.swatchType === SwatchType.Image ? swatch.file?.id ?? null : null,
    fileUrl:
      swatch.swatchType === SwatchType.Image ? swatch.file?.url ?? null : null,
    metadata: swatch.metadata,
  };
}

function facetValuesToEditorValues(
  values: FacetValueGridFields[],
): OptionEditorValue[] {
  return [...values]
    .sort((first, second) => first.sortIndex - second.sortIndex)
    .map((value, index) => ({
      id: value.id,
      apiId: value.id,
      apiSwatchId: value.swatch?.id,
      name: value.label,
      slug: value.slug,
      sortIndex: index,
      swatch: facetSwatchToEditorSwatch(value.swatch),
    }));
}

function normalizeValueSortIndexes(
  values: OptionEditorValue[],
): OptionEditorValue[] {
  return values.map((value, sortIndex) => ({
    ...value,
    sortIndex,
  }));
}

function editorSwatchToCreateInput(
  swatch: OptionEditorSwatch,
): ApiFacetSwatchCreateInput {
  const input: ApiFacetSwatchCreateInput = {
    swatchType: swatch.swatchType,
  };
  const metadata = swatchMetadataInput(swatch.metadata);

  if (metadata !== undefined) {
    input.metadata = metadata;
  }

  if (swatch.swatchType === SwatchType.Color) {
    input.colorOne = swatch.colorOne ?? null;
    return input;
  }

  if (swatch.swatchType === SwatchType.Gradient) {
    input.colorOne = swatch.colorOne ?? null;
    input.colorTwo = swatch.colorTwo ?? null;
    return input;
  }

  if (swatch.swatchType === SwatchType.Image) {
    input.fileId = isExistingApiFileId(swatch.fileId) ? swatch.fileId : null;
  }

  return input;
}

function editorSwatchToUpdateInput(
  id: string,
  swatch: OptionEditorSwatch,
): ApiFacetSwatchUpdateInput {
  return {
    id,
    ...editorSwatchToCreateInput(swatch),
  };
}

export function EditFacetModal() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditFacetModalPayload;
  const {
    facet,
    loading: loadingFacet,
    error,
    refetch: refetchFacet,
  } = useFacet(typedPayload.facetId);
  const { updateFacet, loading: saving } = useUpdateFacet();
  const { updateFacetValue } = useUpdateFacetValue();
  const {
    createFacetSwatch,
    updateFacetSwatch,
    loading: savingSwatch,
  } = useUpsertFacetSwatch();
  const { deleteFacetValue } = useDeleteFacetValue();
  const { push: openCreateValueModal } = useCreateFacetValueModal();
  const [savingValueOrder, setSavingValueOrder] = useState(false);
  const [editorValues, setEditorValues] = useState<OptionEditorValue[]>([]);

  const methods = useForm<EditFacetFormValues>({
    resolver: zodResolver(editFacetSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { control, handleSubmit, reset, setError, setValue, watch } = methods;
  const uiType = watch("uiType");

  useEffect(() => {
    if (!facet) {
      return;
    }

    reset({
      label: facet.label,
      slug: facet.slug,
      uiType: facet.uiType,
      selectionMode: facet.selectionMode,
    });
  }, [facet, reset]);

  useEffect(() => {
    if (!facet) {
      return;
    }

    setEditorValues(facetValuesToEditorValues(facet.values));
  }, [facet]);

  const handleNestedValueSaved = useCallback(async () => {
    await refetchFacet();
    await typedPayload.onSaved?.();
  }, [refetchFacet, typedPayload]);

  const uiTypeOptions = useMemo(
    () =>
      facet
        ? getAllowedFacetUiTypes(facet.facetType).map((value) => ({
            value,
            label: value,
          }))
        : [],
    [facet],
  );

  const onSubmit = useCallback(
    async (values: EditFacetFormValues) => {
      if (!facet) {
        return;
      }

      const result = await updateFacet(mapFacetFormToUpdateInput(facet.id, values));
      if (result.userErrors.length > 0) {
        mapFacetUserErrorsToFormErrors(result.userErrors).forEach((userError) => {
          if (userError.field === "label") {
            setError("label", { message: userError.message });
          }
          if (userError.field === "slug") {
            setError("slug", { message: userError.message });
          }
          if (userError.field === "uiType") {
            setError("uiType", { message: userError.message });
          }
          if (userError.field === "selectionMode") {
            setError("selectionMode", { message: userError.message });
          }
        });
        message.error(result.userErrors[0].message);
        return;
      }

      try {
        setSavingValueOrder(true);
        for (const [sortIndex, value] of editorValues.entries()) {
          if (!value.apiId) {
            continue;
          }

          const original = facet.values.find(
            (candidate) => candidate.id === value.apiId,
          );
          let swatchId = original?.swatch?.id ?? null;

          if (value.swatch) {
            const swatchResult = swatchId
              ? await updateFacetSwatch(
                  editorSwatchToUpdateInput(swatchId, value.swatch),
                )
              : await createFacetSwatch(
                  editorSwatchToCreateInput(value.swatch),
                );

            if (swatchResult.userErrors.length > 0) {
              message.error(swatchResult.userErrors[0].message);
              return;
            }

            swatchId = swatchResult.facetSwatch?.id ?? swatchId;
          }

          const trimmedName = value.name.trim();
          const labelChanged = original?.label !== trimmedName;
          const sortIndexChanged = original?.sortIndex !== sortIndex;
          const swatchChanged = original?.swatch?.id !== swatchId;

          if (!labelChanged && !sortIndexChanged && !swatchChanged) {
            continue;
          }

          const orderResult = await updateFacetValue({
            id: value.apiId,
            ...(labelChanged ? { label: trimmedName } : {}),
            sortIndex,
            ...(swatchChanged ? { swatchId } : {}),
          });

          if (orderResult.userErrors.length > 0) {
            message.error(orderResult.userErrors[0].message);
            return;
          }
        }
      } finally {
        setSavingValueOrder(false);
      }

      message.success("Facet updated.");
      await typedPayload.onSaved?.();
      pop();
    },
    [
      facet,
      createFacetSwatch,
      editorValues,
      message,
      pop,
      setError,
      typedPayload,
      updateFacet,
      updateFacetSwatch,
      updateFacetValue,
    ],
  );

  const handleDeleteValue = useCallback(
    (valueIndex: number) => {
      const value = editorValues[valueIndex];
      if (!value?.apiId) {
        setEditorValues((current) =>
          normalizeValueSortIndexes(
            current.filter((_, index) => index !== valueIndex),
          ),
        );
        return;
      }

      modal.confirm({
        title: "Delete facet value?",
        content: value.name,
        okText: "Delete",
        okButtonProps: { danger: true },
        async onOk() {
          const result = await deleteFacetValue({ id: value.apiId! });
          if (result.userErrors.length > 0) {
            message.error(result.userErrors[0].message);
            return;
          }

          message.success("Facet value deleted.");
          await handleNestedValueSaved();
        },
      });
    },
    [deleteFacetValue, editorValues, handleNestedValueSaved, message, modal],
  );

  if (loadingFacet && !facet) {
    return (
      <ModalLayout
        name="edit-facet"
        headerProps={{ title: "Facet", onClose: pop, submitButtonProps: null }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </ModalLayout>
    );
  }

  if (error) {
    return (
      <ModalLayout
        name="edit-facet"
        headerProps={{ title: "Facet", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="error" showIcon message={error.message} />
      </ModalLayout>
    );
  }

  if (!facet) {
    return (
      <ModalLayout
        name="edit-facet"
        headerProps={{ title: "Facet", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="warning" showIcon message="Facet not found" />
      </ModalLayout>
    );
  }

  const discrete = isDiscreteFacetType(facet.facetType);
  const linkedSourceHandlesCount = facet.values.reduce(
    (count, value) => count + value.sourceHandles.length,
    facet.sourceHandles.length,
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="edit-facet"
        header={
          <ModalHeader
            name="edit-facet"
            title={facet.label}
            onClose={pop}
            submitButtonProps={{
              loading: saving || savingValueOrder || savingSwatch,
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
                render={({ field, fieldState: { error: fieldError } }) => (
                  <>
                    <Input
                      {...field}
                      status={fieldError ? "error" : undefined}
                    />
                    {fieldError && (
                      <div className={styles.error}>{fieldError.message}</div>
                    )}
                  </>
                )}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Slug</div>
              <Controller
                name="slug"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <>
                    <Input
                      {...field}
                      status={fieldError ? "error" : undefined}
                      onChange={(event) => field.onChange(slugify(event.target.value))}
                    />
                    {fieldError && (
                      <div className={styles.error}>{fieldError.message}</div>
                    )}
                  </>
                )}
              />
            </div>
          </div>
          <div className={styles.statRow}>
            <Typography.Text className={styles.muted}>Source</Typography.Text>
            <Typography.Text strong>{facet.facetType}</Typography.Text>
          </div>
          <div className={styles.statRow}>
            <Typography.Text className={styles.muted}>Order</Typography.Text>
            <Typography.Text strong>{facet.sortIndex}</Typography.Text>
          </div>
          <div className={styles.fieldGroup} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <div className={styles.label}>UI type</div>
              <Controller
                name="uiType"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <>
                    <Select
                      {...field}
                      style={{ width: "100%" }}
                      options={uiTypeOptions}
                      status={fieldError ? "error" : undefined}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue(
                          "selectionMode",
                          getDefaultFacetSelectionMode(value),
                          { shouldValidate: true },
                        );
                      }}
                    />
                    {fieldError && (
                      <div className={styles.error}>{fieldError.message}</div>
                    )}
                  </>
                )}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Selection mode</div>
              <Controller
                name="selectionMode"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <>
                    <Select
                      {...field}
                      style={{ width: "100%" }}
                      disabled={
                        uiType === FacetUiType.Range ||
                        uiType === FacetUiType.Boolean
                      }
                      options={Object.values(FacetSelectionMode).map((value) => ({
                        value,
                        label: value,
                      }))}
                      status={fieldError ? "error" : undefined}
                    />
                    {fieldError && (
                      <div className={styles.error}>{fieldError.message}</div>
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader
            title="Values"
            actions={
              discrete ? (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    openCreateValueModal({
                      facetId: facet.id,
                      facetLabel: facet.label,
                      facetType: facet.facetType,
                      nextSortIndex: facet.values.length,
                      onSaved: handleNestedValueSaved,
                    })
                  }
                >
                  Create
                </Button>
              ) : null
            }
          />
          {discrete ? (
            <Flex vertical gap={8}>
              <FacetValuesList
                values={editorValues}
                onReorder={(values) =>
                  setEditorValues(normalizeValueSortIndexes(values))
                }
                onUpdateValueName={(valueIndex, name) =>
                  setEditorValues((current) =>
                    current.map((value, index) =>
                      index === valueIndex ? { ...value, name } : value,
                    ),
                  )
                }
                onUpdateValueSwatch={(valueIndex, swatch) =>
                  setEditorValues((current) =>
                    current.map((value, index) =>
                      index === valueIndex ? { ...value, swatch } : value,
                    ),
                  )
                }
                onDeleteValue={handleDeleteValue}
              />
              <Typography.Text type="secondary">
                {linkedSourceHandlesCount} linked source handles
              </Typography.Text>
            </Flex>
          ) : (
            <Typography.Text type="secondary">
              Values are calculated automatically. {facet.facetType} returns{" "}
              {facet.facetType === "PRICE"
                ? "price range."
                : "availability count."}
            </Typography.Text>
          )}
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
