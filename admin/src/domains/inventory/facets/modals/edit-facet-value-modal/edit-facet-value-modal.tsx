"use client";

import { useCallback, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  Skeleton,
  Typography,
} from "antd";
import { LinkOutlined } from "@ant-design/icons";
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
  mapFacetValueFormToUpdateInput,
  normalizeSourceHandles,
} from "../../mappers";
import { useFacetValue, useUpdateFacetValue } from "../../hooks";
import {
  type IEditFacetValueModalPayload,
  useLinkSourceValuesModal,
} from "../../modals";
import { editFacetValueSchema, type EditFacetValueFormValues } from "./schema";

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
  swatchPreview: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  swatchDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorder}`,
  },
}));

const EMPTY_VALUES: EditFacetValueFormValues = {
  label: "",
  slug: "",
  enabled: true,
  sourceHandles: [],
  swatchId: null,
};

export function EditFacetValueModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditFacetValueModalPayload;
  const { facetValue, loading: loadingValue, error } = useFacetValue(
    typedPayload.valueId,
  );
  const { updateFacetValue, loading: saving } = useUpdateFacetValue();
  const { push: openLinkSourceValuesModal } = useLinkSourceValuesModal();

  const methods = useForm<EditFacetValueFormValues>({
    resolver: zodResolver(editFacetValueSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { control, handleSubmit, reset, setError, setValue, watch } = methods;
  const sourceHandles = watch("sourceHandles");
  const label = watch("label");

  useEffect(() => {
    if (!facetValue) {
      return;
    }
    reset({
      label: facetValue.label,
      slug: facetValue.slug,
      enabled: facetValue.enabled,
      sourceHandles: facetValue.sourceHandles,
      swatchId: facetValue.swatch?.id ?? null,
    });
  }, [facetValue, reset]);

  useEffect(() => {
    setValue("slug", slugify(label), { shouldValidate: Boolean(label) });
  }, [label, setValue]);

  const onSubmit = useCallback(
    async (values: EditFacetValueFormValues) => {
      if (!facetValue) {
        return;
      }

      const duplicateHandles = getDuplicateSourceHandles(values.sourceHandles);
      if (duplicateHandles.length > 0) {
        setError("sourceHandles", {
          message: `Duplicate source handles: ${duplicateHandles.join(", ")}`,
        });
        return;
      }

      const normalizedHandles = normalizeSourceHandles(values.sourceHandles);
      if (normalizedHandles.length === 0) {
        setError("sourceHandles", {
          message: "At least one source handle is required",
        });
        return;
      }

      const result = await updateFacetValue(
        mapFacetValueFormToUpdateInput(facetValue.id, {
          ...values,
          slug: slugify(values.label),
          sourceHandles: normalizedHandles,
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
          if (userError.field === "sourceHandles") {
            setError("sourceHandles", { message: userError.message });
          }
        });
        message.error(result.userErrors[0].message);
        return;
      }

      message.success("Facet value updated.");
      await typedPayload.onSaved?.();
      pop();
    },
    [facetValue, message, pop, setError, typedPayload, updateFacetValue],
  );

  if (loadingValue && !facetValue) {
    return (
      <ModalLayout
        name="edit-facet-value"
        headerProps={{ title: "Facet value", onClose: pop, submitButtonProps: null }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </ModalLayout>
    );
  }

  if (error) {
    return (
      <ModalLayout
        name="edit-facet-value"
        headerProps={{ title: "Facet value", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="error" showIcon message={error.message} />
      </ModalLayout>
    );
  }

  if (!facetValue) {
    return (
      <ModalLayout
        name="edit-facet-value"
        headerProps={{ title: "Facet value", onClose: pop, submitButtonProps: null }}
      >
        <Alert type="warning" showIcon message="Facet value not found" />
      </ModalLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="edit-facet-value"
        header={
          <ModalHeader
            name="edit-facet-value"
            title={facetValue.label}
            onClose={pop}
            submitButtonProps={{
              loading: saving,
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
          <PaperHeader
            title="Linked source values"
            actions={
              <Button
                size="small"
                icon={<LinkOutlined />}
                onClick={() =>
                  openLinkSourceValuesModal({
                    valueId: facetValue.id,
                    valueLabel: facetValue.label,
                    sourceHandles,
                    onSave: (nextHandles: string[]) => {
                      setValue("sourceHandles", nextHandles, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    },
                  })
                }
              >
                Edit links
              </Button>
            }
          />
          <Controller
            name="sourceHandles"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <>
                <Select
                  mode="tags"
                  tokenSeparators={[","]}
                  style={{ width: "100%" }}
                  value={field.value}
                  onChange={(values) => field.onChange(values)}
                  status={fieldError ? "error" : undefined}
                />
                {fieldError && (
                  <div className={styles.error}>{fieldError.message}</div>
                )}
              </>
            )}
          />
        </Paper>

        <Paper>
          <PaperHeader title="Swatch" />
          {facetValue.swatch ? (
            <div className={styles.swatchPreview}>
              <span
                className={styles.swatchDot}
                style={{
                  background:
                    facetValue.swatch.colorOne ??
                    facetValue.swatch.colorTwo ??
                    "#fff",
                }}
              />
              <Typography.Text type="secondary">
                {facetValue.swatch.swatchType}
              </Typography.Text>
            </div>
          ) : (
            <Flex>
              <Typography.Text type="secondary">
                No swatch assigned
              </Typography.Text>
            </Flex>
          )}
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
