"use client";

import { useCallback, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Checkbox, Input, Select } from "antd";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  getDuplicateSourceHandles,
  mapFacetUserErrorsToFormErrors,
  mapFacetValueFormToCreateInput,
  normalizeSourceHandles,
} from "../../mappers";
import { useCreateFacetValue } from "../../hooks";
import type { ICreateFacetValueModalPayload } from "../../modals";
import {
  createFacetValueSchema,
  type CreateFacetValueFormInput,
  type CreateFacetValueFormValues,
} from "./schema";

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
}));

const DEFAULT_VALUES: CreateFacetValueFormValues = {
  label: "",
  slug: "",
  enabled: true,
  sourceHandles: [],
  swatchId: null,
};

export function CreateFacetValueModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateFacetValueModalPayload;
  const { createFacetValue, loading } = useCreateFacetValue();

  const methods = useForm<
    CreateFacetValueFormInput,
    unknown,
    CreateFacetValueFormValues
  >({
    resolver: zodResolver(createFacetValueSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...typedPayload.initialValues,
    },
  });
  const { control, handleSubmit, setError, setValue, watch } = methods;
  const label = watch("label");

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  const onSubmit = useCallback(
    async (values: CreateFacetValueFormValues) => {
      const duplicateHandles = getDuplicateSourceHandles(values.sourceHandles);
      if (duplicateHandles.length > 0) {
        setError("sourceHandles", {
          message: `Duplicate source handles: ${duplicateHandles.join(", ")}`,
        });
        return;
      }

      const sourceHandles = normalizeSourceHandles(values.sourceHandles);
      if (sourceHandles.length === 0) {
        setError("sourceHandles", {
          message: "At least one source handle is required",
        });
        return;
      }

      const result = await createFacetValue(
        mapFacetValueFormToCreateInput(
          typedPayload.facetId,
          { ...values, slug: slugify(values.label), sourceHandles },
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
          if (error.field === "sourceHandles") {
            setError("sourceHandles", { message: error.message });
          }
        });
        message.error(result.userErrors[0].message);
        return;
      }

      message.success("Facet value created.");
      await typedPayload.onSaved?.();
      pop();
    },
    [createFacetValue, message, pop, setError, typedPayload],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-facet-value"
        header={
          <ModalHeader
            name="create-facet-value"
            title={`Create value: ${typedPayload.facetLabel}`}
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
          <PaperHeader title="Identity" />
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
                      placeholder="Red"
                      status={error ? "error" : undefined}
                    />
                    {error && <div className={styles.error}>{error.message}</div>}
                  </>
                )}
              />
            </div>
          </div>
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              >
                Enabled
              </Checkbox>
            )}
          />
        </Paper>

        <Paper>
          <PaperHeader title="Linked source values" />
          <Controller
            name="sourceHandles"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <Select
                  mode="tags"
                  tokenSeparators={[","]}
                  style={{ width: "100%" }}
                  placeholder="Add source handles"
                  value={field.value}
                  onChange={(values) => field.onChange(values)}
                  status={error ? "error" : undefined}
                />
                {error && <div className={styles.error}>{error.message}</div>}
              </>
            )}
          />
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
