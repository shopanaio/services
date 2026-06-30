"use client";

import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Dropdown, Flex, Input } from "antd";
import { createStyles } from "antd-style";
import {
  LuDollarSign,
  LuPackageCheck,
  LuSlidersHorizontal,
  LuSparkles,
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
  getDefaultFacetUiType,
  mapFacetFormToCreateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import { useCreateFacet } from "../../hooks";
import type { ICreateFacetModalPayload } from "../../modals";
import {
  createFacetSchema,
  type CreateFacetFormInput,
  type CreateFacetFormValues,
} from "./schema";
import { FacetType } from "@/graphql/types";

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
    width: 96,
    paddingInline: 4,
  },
  sourceSelectorContent: {
    justifyContent: "center",
    width: "100%",
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

interface FacetSourceSelectorProps {
  value: FacetType;
  onChange: (facetType: FacetType) => void;
}

function FacetSourceSelector({ value, onChange }: FacetSourceSelectorProps) {
  const { styles } = useStyles();
  const current = FACET_SOURCE_OPTIONS.find((option) => option.key === value);
  const menuItems = FACET_SOURCE_OPTIONS.map((option) => ({
    key: option.key,
    icon: option.icon,
    label: option.label,
    onClick: () => onChange(option.key),
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
      <Button
        size="small"
        type="text"
        className={styles.sourceSelectorButton}
      >
        <Flex
          gap={4}
          align="center"
          className={styles.sourceSelectorContent}
        >
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
}

const DEFAULT_VALUES: CreateFacetFormValues = {
  label: "",
  slug: "",
  facetType: FacetType.Option,
  uiType: getDefaultFacetUiType(FacetType.Option),
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

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  useEffect(() => {
    const allowed = getAllowedFacetUiTypes(facetType);
    if (!allowed.includes(uiType)) {
      const nextUiType = getDefaultFacetUiType(facetType);
      setValue("uiType", nextUiType, { shouldValidate: true });
    }
  }, [facetType, setValue, uiType]);

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
          if (error.field === "facetType") {
            setError("facetType", { message: error.message });
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
                            name="facetType"
                            control={control}
                            render={({ field: facetTypeField }) => (
                              <FacetSourceSelector
                                value={facetTypeField.value}
                                onChange={facetTypeField.onChange}
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
            </div>
          </div>
        </Paper>

      </ModalLayout>
    </FormProvider>
  );
}
