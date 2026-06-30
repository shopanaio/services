"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Button,
  Dropdown,
  Flex,
  Input,
  Skeleton,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  LuDollarSign,
  LuPackageCheck,
  LuSlidersHorizontal,
  LuSparkles,
  LuSwatchBook,
  LuTag,
} from "react-icons/lu";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  getAllowedFacetUiTypes,
  isDiscreteFacetType,
  mapFacetFormToUpdateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import {
  useCreateFacetValue,
  useDeleteFacetValue,
  useFacet,
  useUnmergeFacetValues,
  useUpsertFacetSwatch,
  useUpdateFacet,
  useUpdateFacetValue,
} from "../../hooks";
import {
  type IEditFacetModalPayload,
  useFacetValueCandidatesModal,
  useFacetValueGroupModal,
} from "../../modals";
import type {
  FacetSwatchFields,
  FacetValueGridFields,
} from "../../graphql/operation-types";
import { DEFAULT_SWATCH } from "../../../products/modals/edit-options-modal/edit-options-modal.constants";
import type { OptionEditorSwatch } from "../../../products/modals/edit-options-modal/types";
import {
  editFacetSchema,
  type EditFacetFormInput,
  type EditFacetFormValues,
} from "./schema";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import { FacetValuesGrid } from "./components/facet-values-grid";
import type { FacetValueEditorRow } from "./types";
import {
  FacetValueEmptyDisplayAction,
  FacetValueKind,
  FacetType,
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
  labelInput: {
    ".ant-input-group-addon": {
      paddingInline: 2,
    },
  },
  sourceAddon: {
    width: 28,
    paddingInline: 4,
    justifyContent: "center",
  },
}));

const FACET_SOURCE_OPTIONS: {
  key: FacetType;
  label: string;
  icon: ReactNode;
}[] = [
  {
    key: FacetType.Price,
    label: "Price",
    icon: <LuDollarSign />,
  },
  {
    key: FacetType.Tag,
    label: "Tag",
    icon: <LuTag />,
  },
  {
    key: FacetType.Option,
    label: "Option",
    icon: <LuSlidersHorizontal />,
  },
  {
    key: FacetType.Feature,
    label: "Feature",
    icon: <LuSparkles />,
  },
  {
    key: FacetType.InStock,
    label: "Stock",
    icon: <LuPackageCheck />,
  },
];

interface FacetSourceAddonProps {
  value: FacetType;
}

function FacetSourceAddon({ value }: FacetSourceAddonProps) {
  const { styles } = useStyles();
  const current = FACET_SOURCE_OPTIONS.find((option) => option.key === value);

  return (
    <Flex gap={4} align="center" className={styles.sourceAddon}>
      {current?.icon}
    </Flex>
  );
}

const EMPTY_VALUES: EditFacetFormValues = {
  label: "",
  slug: "",
  uiType: FacetUiType.Checkbox,
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
): FacetValueEditorRow[] {
  return [...values]
    .sort((first, second) => first.sortIndex - second.sortIndex)
    .map((value, index) => ({
      id: value.id,
      apiId: value.id,
      apiSwatchId: value.swatch?.id,
      kind: value.kind,
      label: value.label,
      handle: value.handle,
      sortIndex: index,
      enabled: value.enabled,
      parent: value.parent,
      sourceValues: value.sourceValues.map((sourceValue) => ({
        id: sourceValue.id,
        label: sourceValue.label,
        handle: sourceValue.handle,
      })),
      swatch: facetSwatchToEditorSwatch(value.swatch),
    }));
}

function normalizeValueSortIndexes(
  values: FacetValueEditorRow[],
): FacetValueEditorRow[] {
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
    refetch,
  } = useFacet(typedPayload.facetId);
  const { updateFacet, loading: saving } = useUpdateFacet();
  const { updateFacetValue } = useUpdateFacetValue();
  const { unmergeFacetValues, loading: unmergingValues } = useUnmergeFacetValues();
  const {
    createFacetSwatch,
    updateFacetSwatch,
    loading: savingSwatch,
  } = useUpsertFacetSwatch();
  const { createFacetValue, loading: creatingValue } = useCreateFacetValue();
  const { deleteFacetValue, loading: deletingValue } = useDeleteFacetValue();
  const { push: openValueGroupModal } = useFacetValueGroupModal();
  const { push: openValueCandidatesModal } = useFacetValueCandidatesModal();
  const [savingValueOrder, setSavingValueOrder] = useState(false);
  const [editorValues, setEditorValues] = useState<FacetValueEditorRow[]>([]);
  const [swatchesEnabled, setSwatchesEnabled] = useState(false);

  const methods = useForm<EditFacetFormInput, unknown, EditFacetFormValues>({
    resolver: zodResolver(editFacetSchema),
    defaultValues: EMPTY_VALUES,
  });
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = methods;
  const label = watch("label");

  useEffect(() => {
    if (!facet) {
      return;
    }

    reset({
      label: facet.label,
      slug: facet.slug,
      uiType: facet.uiType,
    });
  }, [facet, reset]);

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  useEffect(() => {
    if (!facet) {
      return;
    }

    setEditorValues(facetValuesToEditorValues(facet.values));
    setSwatchesEnabled(facet.values.some((value) => Boolean(value.swatch)));
  }, [facet]);

  const uiTypeOptions = useMemo(
    () =>
      facet ? getAllowedFacetUiTypes(facet.facetType) : [],
    [facet],
  );

  const hasDraftValueChanges = useMemo(() => {
    if (!facet) return false;
    const originalIds = [...facet.values]
      .sort((first, second) => first.sortIndex - second.sortIndex)
      .map((value) => value.id);
    const currentIds = [...editorValues]
      .sort((first, second) => first.sortIndex - second.sortIndex)
      .map((value) => value.id);

    if (originalIds.length !== currentIds.length) return true;
    return originalIds.some((id, index) => id !== currentIds[index]);
  }, [editorValues, facet]);

  const ensureNoDraftChanges = useCallback(() => {
    if (!isDirty && !hasDraftValueChanges) {
      return true;
    }
    message.warning("Save or close current changes before changing values.");
    return false;
  }, [hasDraftValueChanges, isDirty, message]);

  const handleOpenValueCandidates = useCallback(() => {
    if (!facet) return;
    if (!ensureNoDraftChanges()) return;
    openValueCandidatesModal({
      facetId: facet.id,
      facetType: facet.facetType,
      nextSortIndex: editorValues.length,
      onSaved: async () => {
        await refetch();
        await typedPayload.onSaved?.();
      },
    });
  }, [
    editorValues.length,
    ensureNoDraftChanges,
    facet,
    openValueCandidatesModal,
    refetch,
    typedPayload,
  ]);

  const toInitialGroupedRows = useCallback(
    (value: FacetValueEditorRow): FacetValueEditorRow[] =>
      value.sourceValues.map((sourceValue, index) => {
        const existing = editorValues.find((row) => row.id === sourceValue.id);
        return (
          existing ?? {
            id: sourceValue.id,
            apiId: sourceValue.id,
            kind: FacetValueKind.Source,
            label: sourceValue.label,
            handle: sourceValue.handle,
            sortIndex: index,
            enabled: true,
            parent: {
              id: value.id,
              label: value.label,
              handle: value.handle,
            },
            sourceValues: [],
            swatch: null,
          }
        );
      }),
    [editorValues],
  );

  const openGroupModal = useCallback(
    (
      mode: "create" | "edit" | "add-to-existing",
      selectedValues: FacetValueEditorRow[],
      groupValue?: FacetValueEditorRow,
    ) => {
      if (!facet) return;
      if (!ensureNoDraftChanges()) return;
      openValueGroupModal({
        groupMode: mode,
        facetId: facet.id,
        selectedValues,
        availableValues: editorValues,
        groupValueId: groupValue?.id,
        initialGroupLabel: groupValue?.label,
        initialGroupedValues: groupValue ? toInitialGroupedRows(groupValue) : undefined,
        onSaved: async () => {
          await refetch();
          await typedPayload.onSaved?.();
        },
      });
    },
    [
      editorValues,
      ensureNoDraftChanges,
      facet,
      openValueGroupModal,
      refetch,
      toInitialGroupedRows,
      typedPayload,
    ],
  );

  const onSubmit = useCallback(
    async (values: EditFacetFormValues) => {
      if (!facet) {
        return;
      }

      const result = await updateFacet(
        mapFacetFormToUpdateInput(facet.id, {
          ...values,
          slug: slugify(values.label),
        }),
      );
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
        });
        message.error(result.userErrors[0].message);
        return;
      }

      try {
        setSavingValueOrder(true);
        for (const [sortIndex, value] of editorValues.entries()) {
          const trimmedName = value.label.trim();
          if (!trimmedName) {
            message.error("Value name is required.");
            return;
          }

          const original = value.apiId
            ? facet.values.find((candidate) => candidate.id === value.apiId)
            : null;
          const originalSwatchId = original?.swatch?.id ?? null;
          let swatchId = originalSwatchId;
          const swatch = swatchesEnabled ? value.swatch ?? DEFAULT_SWATCH : null;

          if (swatch) {
            const swatchResult = swatchId
              ? await updateFacetSwatch(
                  editorSwatchToUpdateInput(swatchId, swatch),
                )
              : await createFacetSwatch(
                  editorSwatchToCreateInput(swatch),
                );

            if (swatchResult.userErrors.length > 0) {
              message.error(swatchResult.userErrors[0].message);
              return;
            }

            swatchId = swatchResult.facetSwatch?.id ?? swatchId;
          } else {
            swatchId = null;
          }

          if (!value.apiId) {
            const createResult = await createFacetValue({
              facetId: facet.id,
              label: trimmedName,
              handle: slugify(trimmedName),
              enabled: true,
              ...(swatchId ? { swatchId } : {}),
              sortIndex,
            });

            if (createResult.userErrors.length > 0) {
              message.error(createResult.userErrors[0].message);
              return;
            }

            continue;
          }

          const labelChanged = original?.label !== trimmedName;
          const slug = slugify(trimmedName);
          const sortIndexChanged = original?.sortIndex !== sortIndex;
          const slugChanged = original?.handle !== slug;
          const swatchChanged = originalSwatchId !== swatchId;

          if (
            !labelChanged &&
            !slugChanged &&
            !sortIndexChanged &&
            !swatchChanged
          ) {
            continue;
          }

          const orderResult = await updateFacetValue({
            id: value.apiId,
            ...(labelChanged ? { label: trimmedName } : {}),
            ...(slugChanged ? { handle: slug } : {}),
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
      createFacetValue,
      createFacetSwatch,
      editorValues,
      message,
      pop,
      setError,
      swatchesEnabled,
      typedPayload,
      updateFacet,
      updateFacetSwatch,
      updateFacetValue,
    ],
  );

  const collectUngroupSourceIds = useCallback((rows: FacetValueEditorRow[]) => {
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.kind === FacetValueKind.Display) {
        row.sourceValues.forEach((sourceValue) => ids.add(sourceValue.id));
      }
      if (row.kind === FacetValueKind.Source && row.parent?.id) {
        ids.add(row.id);
      }
    }
    return [...ids];
  }, []);

  const handleUngroupValues = useCallback(
    async (rows: FacetValueEditorRow[]) => {
      const sourceValueIds = collectUngroupSourceIds(rows);
      if (!ensureNoDraftChanges()) return;
      if (sourceValueIds.length === 0) {
        message.info("No grouped values to ungroup.");
        return;
      }

      const result = await unmergeFacetValues({
        sourceValueIds,
        emptyDisplayAction: FacetValueEmptyDisplayAction.Disable,
      });
      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        return;
      }

      await refetch();
      await typedPayload.onSaved?.();
      message.success("Values ungrouped.");
    },
    [
      collectUngroupSourceIds,
      ensureNoDraftChanges,
      message,
      refetch,
      typedPayload,
      unmergeFacetValues,
    ],
  );

  const handleDeleteValues = useCallback(
    (rows: FacetValueEditorRow[]) => {
      if (!ensureNoDraftChanges()) return;
      const groupedDisplay = rows.find(
        (row) => row.kind === FacetValueKind.Display && row.sourceValues.length > 0,
      );
      if (groupedDisplay) {
        message.warning("Ungroup display values before deleting them.");
        return;
      }

      modal.confirm({
        title: rows.length === 1 ? "Delete value?" : "Delete values?",
        content:
          rows.length === 1
            ? `Delete ${rows[0].label}?`
            : `Delete ${rows.length} selected values?`,
        okText: "Delete",
        okButtonProps: { danger: true },
        async onOk() {
          for (const row of rows) {
            if (!row.apiId) continue;
            const result = await deleteFacetValue({ id: row.apiId });
            if (result.userErrors.length > 0) {
              message.error(result.userErrors[0].message);
              return Promise.reject(new Error(result.userErrors[0].message));
            }
          }
          await refetch();
          await typedPayload.onSaved?.();
          message.success(rows.length === 1 ? "Value deleted." : "Values deleted.");
        },
      });
    },
    [deleteFacetValue, ensureNoDraftChanges, message, modal, refetch, typedPayload],
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
              loading:
                saving ||
                savingValueOrder ||
                savingSwatch ||
                creatingValue ||
                deletingValue ||
                unmergingValues,
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
                      className={styles.labelInput}
                      status={fieldError ? "error" : undefined}
                      addonBefore={<FacetSourceAddon value={facet.facetType} />}
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
              <Flex gap={8} align="center">
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
                {discrete ? (
                  <Dropdown
                    menu={{
                      selectable: true,
                      selectedKeys: [swatchesEnabled ? "on" : "off"],
                      items: [
                        {
                          key: "on",
                          label: "On",
                          onClick: () => setSwatchesEnabled(true),
                        },
                        {
                          key: "off",
                          label: "Off",
                          onClick: () => setSwatchesEnabled(false),
                        },
                      ],
                    }}
                    trigger={["click"]}
                  >
                    <Button type="text" aria-label="Value swatches">
                      <Flex gap={4} align="center">
                        <LuSwatchBook />
                        <span>{swatchesEnabled ? "On" : "Off"}</span>
                      </Flex>
                    </Button>
                  </Dropdown>
                ) : null}
                {discrete ? (
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    aria-label="Add values"
                    onClick={handleOpenValueCandidates}
                  />
                ) : null}
              </Flex>
            }
          />
          {discrete ? (
            <Flex vertical gap={8}>
              <FacetValuesGrid
                values={editorValues}
                onReorder={(values) =>
                  setEditorValues(normalizeValueSortIndexes(values))
                }
                onAddToGroup={(values) => openGroupModal("create", values)}
                onEditGroup={(value) => openGroupModal("edit", [], value)}
                onUngroup={handleUngroupValues}
                onDelete={handleDeleteValues}
              />
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
