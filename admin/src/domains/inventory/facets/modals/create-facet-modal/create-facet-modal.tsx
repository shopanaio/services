"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Flex, Input, Select } from "antd";
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
  getDefaultFacetUiType,
  mapFacetFormToCreateInput,
  mapFacetUserErrorsToFormErrors,
} from "../../mappers";
import { useCreateFacet } from "../../hooks";
import type { ICreateFacetModalPayload } from "../../modals";
import { FacetUiTypeSelector } from "../components/facet-ui-type-selector";
import { createFacetSchema, type CreateFacetFormValues } from "./schema";
import { FacetSelectionMode, FacetType } from "@/graphql/types";

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
}));

const DEFAULT_VALUES: CreateFacetFormValues = {
  label: "",
  slug: "",
  facetType: FacetType.Option,
  uiType: getDefaultFacetUiType(FacetType.Option),
  selectionMode: FacetSelectionMode.Multi,
};

export function CreateFacetModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateFacetModalPayload;
  const { createFacet, loading } = useCreateFacet();

  const methods = useForm<CreateFacetFormValues>({
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
      setValue("selectionMode", getDefaultFacetSelectionMode(nextUiType), {
        shouldValidate: true,
      });
    }
  }, [facetType, setValue, uiType]);

  const uiTypeOptions = useMemo(
    () => getAllowedFacetUiTypes(facetType),
    [facetType],
  );

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
          if (error.field === "selectionMode") {
            setError("selectionMode", { message: error.message });
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
                      placeholder="Color"
                      status={error ? "error" : undefined}
                      suffix={
                        <Flex
                          gap={4}
                          align="center"
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <Controller
                            name="uiType"
                            control={control}
                            render={({ field: uiTypeField }) => (
                              <FacetUiTypeSelector
                                value={uiTypeField.value}
                                options={uiTypeOptions}
                                onChange={(value) => {
                                  uiTypeField.onChange(value);
                                  setValue(
                                    "selectionMode",
                                    getDefaultFacetSelectionMode(value),
                                    { shouldValidate: true },
                                  );
                                }}
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
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <div className={styles.label}>Source</div>
              <Controller
                name="facetType"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Select
                      {...field}
                      style={{ width: "100%" }}
                      options={Object.values(FacetType).map((value) => ({
                        value,
                        label: value,
                      }))}
                      status={error ? "error" : undefined}
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
