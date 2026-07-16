"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LuPlus as PlusOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
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
  getFacetSourceHandleLabel,
  getFacetSourceTypeLabel,
  getFacetTypeIcon,
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
  FacetGridFields,
} from "../../graphql/operation-types";
import { DEFAULT_SWATCH } from "@/domains/inventory/products/modals/edit-options-modal/edit-options-modal.constants";
import type { OptionEditorSwatch } from "@/domains/inventory/products/modals/edit-options-modal/types";
import {
  editFacetSchema,
  type EditFacetFormInput,
  type EditFacetFormValues,
} from "./schema";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import { FacetScopeSelector } from "../components/facet-scope-selector";
import { FacetValuesGrid } from "./components/facet-values-grid";
import type { FacetValueEditorRow } from "./types";
import {
  FacetValueKind,
  FacetScopeType,
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
  stackedField: {
    marginBottom: 16,
  },
  sourceDisplay: {
    display: "flex",
    alignItems: "center",
    minHeight: 46,
    paddingInline: 12,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    color: token.colorText,
    background: token.colorBgContainer,
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

interface FacetSourceDisplayProps {
  facetType: FacetType;
  sources: FacetGridFields["sources"];
}

function FacetSourceDisplay({ facetType, sources }: FacetSourceDisplayProps) {
  const { styles } = useStyles();
  const sourceTypeLabel = getFacetSourceTypeLabel(facetType);
  const sourceLabel =
    sources.length > 0
      ? sources.map((source) => source.name || source.handle).join(", ")
      : getFacetSourceHandleLabel(facetType, "") ?? facetType;
  const icon = getFacetTypeIcon(facetType);

  return (
    <div className={styles.sourceDisplay}>
      <span className={styles.sourceLine}>
        {sourceTypeLabel}:
        <span className={styles.sourceValue}>
          {icon}
          <strong>{sourceLabel}</strong>
        </span>
      </span>
    </div>
  );
}

const EMPTY_VALUES: EditFacetFormValues = {
  label: "",
  slug: "",
  uiType: FacetUiType.Checkbox,
  scopes: [FacetScopeType.Search, FacetScopeType.Category],
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
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [swatchesEnabled, setSwatchesEnabled] = useState(false);
  const submitInProgressRef = useRef(false);

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
      scopes: facet.scopes,
    });
  }, [facet, reset]);

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  useEffect(() => {
    if (!facet) {
      return;
    }
    if (submitInProgressRef.current) {
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
          setSelectionResetKey((current) => current + 1);
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
      setSelectionResetKey,
      toInitialGroupedRows,
      typedPayload,
    ],
  );

  const handleUpdateValueSwatch = useCallback(
    (valueId: string, swatch: OptionEditorSwatch) => {
      setEditorValues((currentValues) =>
        currentValues.map((value) =>
          value.id === valueId ? { ...value, swatch } : value,
        ),
      );
    },
    [],
  );

  const onSubmit = useCallback(
    async (values: EditFacetFormValues) => {
      if (!facet) {
        return;
      }

      submitInProgressRef.current = true;

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
          if (userError.field === "scopes") {
            setError("scopes", { message: userError.message });
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
          const canUpdateHandle = value.kind !== FacetValueKind.Source;
          const slug = slugify(trimmedName);
          const sortIndexChanged = original?.sortIndex !== sortIndex;
          const slugChanged = canUpdateHandle && original?.handle !== slug;
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

      message.success("Filter updated.");
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
      if (row.kind === FacetValueKind.Group) {
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
      const groupedValue = rows.find(
        (row) => row.kind === FacetValueKind.Group && row.sourceValues.length > 0,
      );
      if (groupedValue) {
        message.warning("Ungroup grouped values before deleting them.");
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
        headerProps={{ title: "Filter", onClose: pop, submitButtonProps: null }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </ModalLayout>
    );
  }

  if (error) {
    return (
      <ModalLayout
        name="edit-facet"
        headerProps={{ title: "Filter", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="error" showIcon message={error.message} />
      </ModalLayout>
    );
  }

  if (!facet) {
    return (
      <ModalLayout
        name="edit-facet"
        headerProps={{ title: "Filter", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="warning" showIcon message="Filter not found" />
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
          <div className={styles.stackedField}>
            <div className={styles.label}>Source</div>
            <FacetSourceDisplay
              facetType={facet.facetType}
              sources={facet.sources}
            />
          </div>
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
                      data-testid="edit-facet-label-input"
                    />
                    {fieldError && (
                      <div className={styles.error}>{fieldError.message}</div>
                    )}
                  </>
                )}
              />
            </div>
          </div>
          <div className={styles.stackedField}>
            <div className={styles.label}>Available in</div>
            <Controller
              name="scopes"
              control={control}
              render={({ field, fieldState: { error: fieldError } }) => (
                <>
                  <FacetScopeSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {fieldError ? (
                    <div className={styles.error}>{fieldError.message}</div>
                  ) : null}
                </>
              )}
            />
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
                      />
                    )}
                  />
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
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    aria-label="Add values"
                    data-testid="facet-values-add-button"
                    onClick={handleOpenValueCandidates}
                  />
                </Flex>
              }
            />
            <Flex vertical gap={8}>
              <FacetValuesGrid
                values={editorValues}
                swatchesEnabled={swatchesEnabled}
                selectionResetKey={selectionResetKey}
                onReorder={(values) =>
                  setEditorValues(normalizeValueSortIndexes(values))
                }
                onSwatchChange={handleUpdateValueSwatch}
                onAddToGroup={(values) => openGroupModal("create", values)}
                onEditGroup={(value) => openGroupModal("edit", [], value)}
                onUngroup={handleUngroupValues}
                onDelete={handleDeleteValues}
              />
            </Flex>
          </Paper>
        ) : null}
      </ModalLayout>
    </FormProvider>
  );
}
