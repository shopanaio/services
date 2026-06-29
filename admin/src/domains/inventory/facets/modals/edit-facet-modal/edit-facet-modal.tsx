"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Flex, Input, Select, Skeleton, Typography } from "antd";
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
import { useFacet, useUpdateFacet } from "../../hooks";
import {
  useCreateFacetValueModal,
  type IEditFacetModalPayload,
} from "../../modals";
import { editFacetSchema, type EditFacetFormValues } from "./schema";
import { FacetSelectionMode, FacetUiType } from "@/graphql/types";

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

export function EditFacetModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditFacetModalPayload;
  const { facet, loading: loadingFacet, error } = useFacet(typedPayload.facetId);
  const { updateFacet, loading: saving } = useUpdateFacet();
  const { push: openCreateValueModal } = useCreateFacetValueModal();

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

      message.success("Facet updated.");
      await typedPayload.onSaved?.();
      pop();
    },
    [facet, message, pop, setError, typedPayload, updateFacet],
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
              loading: saving,
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
                      onSaved: typedPayload.onSaved,
                    })
                  }
                >
                  Create
                </Button>
              ) : null
            }
          />
          {discrete ? (
            <Flex vertical gap={4}>
              <Typography.Text>
                {facet.values.length} public values
              </Typography.Text>
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
