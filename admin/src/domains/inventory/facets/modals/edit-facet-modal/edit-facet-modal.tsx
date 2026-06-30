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
  useUpsertFacetSwatch,
  useUpdateFacet,
  useUpdateFacetValue,
} from "../../hooks";
import { type IEditFacetModalPayload } from "../../modals";
import type {
  FacetSwatchFields,
  FacetValueGridFields,
} from "../../graphql/operation-types";
import { createTemporaryOptionValueId } from "../../../products/mappers";
import { DEFAULT_SWATCH } from "../../../products/modals/edit-options-modal/edit-options-modal.constants";
import type {
  OptionEditorSwatch,
  OptionEditorValue,
} from "../../../products/modals/edit-options-modal/types";
import {
  editFacetSchema,
  type EditFacetFormInput,
  type EditFacetFormValues,
} from "./schema";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import { FacetValuesList } from "./components/facet-values-list";
import {
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
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditFacetModalPayload;
  const {
    facet,
    loading: loadingFacet,
    error,
  } = useFacet(typedPayload.facetId);
  const { updateFacet, loading: saving } = useUpdateFacet();
  const { updateFacetValue } = useUpdateFacetValue();
  const {
    createFacetSwatch,
    updateFacetSwatch,
    loading: savingSwatch,
  } = useUpsertFacetSwatch();
  const { createFacetValue, loading: creatingValue } = useCreateFacetValue();
  const { deleteFacetValue, loading: deletingValue } = useDeleteFacetValue();
  const [savingValueOrder, setSavingValueOrder] = useState(false);
  const [editorValues, setEditorValues] = useState<OptionEditorValue[]>([]);
  const [deletedValueIds, setDeletedValueIds] = useState<string[]>([]);
  const [swatchesEnabled, setSwatchesEnabled] = useState(false);

  const methods = useForm<EditFacetFormInput, unknown, EditFacetFormValues>({
    resolver: zodResolver(editFacetSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { control, handleSubmit, reset, setError, setValue, watch } = methods;
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
    setDeletedValueIds([]);
    setSwatchesEnabled(facet.values.some((value) => Boolean(value.swatch)));
  }, [facet]);

  const uiTypeOptions = useMemo(
    () =>
      facet ? getAllowedFacetUiTypes(facet.facetType) : [],
    [facet],
  );

  const handleAddValue = useCallback(() => {
    setEditorValues((current) =>
      normalizeValueSortIndexes([
        ...current,
        {
          id: createTemporaryOptionValueId(),
          name: "",
          slug: "",
          sortIndex: current.length,
          swatch: { ...DEFAULT_SWATCH },
        },
      ]),
    );
  }, []);

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
        for (const valueId of deletedValueIds) {
          const deleteResult = await deleteFacetValue({ id: valueId });

          if (deleteResult.userErrors.length > 0) {
            message.error(deleteResult.userErrors[0].message);
            return;
          }
        }

        for (const [sortIndex, value] of editorValues.entries()) {
          const trimmedName = value.name.trim();
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
              slug: slugify(trimmedName),
              enabled: true,
              sourceHandles: [],
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
          const slugChanged = original?.slug !== slug;
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
            ...(slugChanged ? { slug } : {}),
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
      deletedValueIds,
      deleteFacetValue,
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

  const handleDeleteValue = useCallback(
    (valueIndex: number) => {
      const value = editorValues[valueIndex];
      if (value?.apiId) {
        setDeletedValueIds((current) =>
          current.includes(value.apiId!) ? current : [...current, value.apiId!],
        );
      }

      setEditorValues((current) =>
        normalizeValueSortIndexes(
          current.filter((_, index) => index !== valueIndex),
        ),
      );
    },
    [editorValues],
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
                deletingValue,
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
                    aria-label="Create value"
                    onClick={handleAddValue}
                  />
                ) : null}
              </Flex>
            }
          />
          {discrete ? (
            <Flex vertical gap={8}>
              <FacetValuesList
                values={editorValues}
                swatchesEnabled={swatchesEnabled}
                onReorder={(values) =>
                  setEditorValues(normalizeValueSortIndexes(values))
                }
                onUpdateValueName={(valueIndex, name) =>
                  setEditorValues((current) =>
                    current.map((value, index) =>
                      index === valueIndex
                        ? { ...value, name, slug: slugify(name) }
                        : value,
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
