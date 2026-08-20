"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Input, Skeleton, Typography } from "antd";
import { createStyles } from "antd-style";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { FulfillmentStageModalPayload } from "../../../modals";
import {
  useCreateFulfillmentStage,
  useDeleteFulfillmentStage,
  useFulfillmentStage,
  useUpdateFulfillmentStage,
} from "../../../board/hooks";
import {
  buildFulfillmentStageCreateInput,
  buildFulfillmentStageUpdateInput,
  mapFulfillmentUserErrors,
} from "../../../board/mappers";
import { fulfillmentStageFormSchema, type FulfillmentStageFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  fields: { display: "grid", gap: token.padding },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  help: { display: "block", marginTop: 4, color: token.colorTextSecondary },
  error: { display: "block", marginTop: 4, color: token.colorError },
  delete: { marginTop: token.marginXL },
}));

export function FulfillmentStageModal() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typed = payload as FulfillmentStageModalPayload;
  const isEdit = typed.mode === "edit";
  const query = useFulfillmentStage(isEdit ? typed.entityId : undefined);
  const createMutation = useCreateFulfillmentStage();
  const updateMutation = useUpdateFulfillmentStage();
  const deleteMutation = useDeleteFulfillmentStage();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const handleChanged = useRef(false);
  const methods = useForm<FulfillmentStageFormValues>({
    resolver: zodResolver(fulfillmentStageFormSchema),
    defaultValues: { title: "", handle: "" },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isDirty, isValid },
  } = methods;
  const title = useWatch({ control, name: "title" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  useEffect(() => {
    if (!isEdit || !query.stage || isDirty) return;
    reset({ title: query.stage.title, handle: query.stage.handle });
  }, [isDirty, isEdit, query.stage, reset]);
  useEffect(() => {
    if (isEdit || handleChanged.current) return;
    setValue("handle", slugify(title ?? ""), { shouldValidate: Boolean(title) });
  }, [isEdit, setValue, title]);

  const submit = useCallback(
    async (values: FulfillmentStageFormValues) => {
      setGlobalErrors([]);
      clearErrors();
      try {
        const result =
          isEdit && query.stage
            ? await updateMutation.updateStage(
                buildFulfillmentStageUpdateInput(values, query.stage),
              )
            : await createMutation.createStage(
                buildFulfillmentStageCreateInput(values, typed.initialSortIndex ?? 0),
              );
        if (!result.stage || result.userErrors.length) {
          const global: string[] = [];
          mapFulfillmentUserErrors<FulfillmentStageFormValues>(result.userErrors).forEach(
            (error) =>
              error.field
                ? setError(error.field, { message: error.message })
                : global.push(error.message),
          );
          setGlobalErrors(global);
          if (result.userErrors.some((error) => error.code === "VERSION_CONFLICT"))
            await query.refetch();
          return;
        }
        await typed.onSaved?.();
        setDirty(false);
        message.success(isEdit ? "Stage updated" : "Stage created");
        forcePop();
      } catch {
        /* transport error is rendered below */
      }
    },
    [
      clearErrors,
      createMutation,
      forcePop,
      isEdit,
      message,
      query,
      setDirty,
      setError,
      typed,
      updateMutation,
    ],
  );

  const remove = useCallback(async () => {
    if (!query.stage) return;
    const confirmed = await modal.confirm({
      title: "Delete fulfillment stage?",
      content: "The stage can be deleted only when it has no tickets.",
      okText: "Delete",
      okButtonProps: { danger: true },
    });
    if (!confirmed) return;
    try {
      const result = await deleteMutation.deleteStage({
        id: query.stage.id,
        expectedVersion: query.stage.version,
      });
      if (!result.deletedStageId || result.userErrors.length) {
        setGlobalErrors(result.userErrors.map((error) => error.message));
        return;
      }
      await typed.onSaved?.();
      setDirty(false);
      message.success("Stage deleted");
      forcePop();
    } catch {
      /* transport error is rendered below */
    }
  }, [deleteMutation, forcePop, message, modal, query.stage, setDirty, typed]);

  const transportError =
    query.error ?? createMutation.error ?? updateMutation.error ?? deleteMutation.error;
  const saving = createMutation.loading || updateMutation.loading;
  if (isEdit && query.loading)
    return (
      <ModalLayout
        name="fulfillment-stage"
        header={
          <ModalHeader
            title="Fulfillment stage"
            onClose={pop}
            submitButtonProps={{ disabled: true }}
          />
        }
      >
        <Skeleton active />
      </ModalLayout>
    );
  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="fulfillment-stage"
        header={
          <ModalHeader
            title={isEdit ? "Edit fulfillment stage" : "New fulfillment stage"}
            onClose={pop}
            submitButtonProps={{
              children: "Save",
              loading: saving,
              disabled: saving || !isValid || (isEdit && !isDirty),
              onClick: handleSubmit(submit),
            }}
          />
        }
      >
        <div className={styles.fields}>
          {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
          {globalErrors.length ? (
            <Alert
              type="error"
              showIcon
              message="Could not save stage"
              description={globalErrors.join(" ")}
            />
          ) : null}
          <label>
            <Typography.Text className={styles.label}>Title</Typography.Text>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  status={errors.title ? "error" : undefined}
                  maxLength={80}
                  autoFocus
                />
              )}
            />
            {errors.title ? (
              <Typography.Text className={styles.error}>{errors.title.message}</Typography.Text>
            ) : null}
          </label>
          <label>
            <Typography.Text className={styles.label}>Handle</Typography.Text>
            <Controller
              name="handle"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  status={errors.handle ? "error" : undefined}
                  maxLength={80}
                  onChange={(event) => {
                    handleChanged.current = true;
                    field.onChange(slugify(event.target.value));
                  }}
                />
              )}
            />
            {errors.handle ? (
              <Typography.Text className={styles.error}>{errors.handle.message}</Typography.Text>
            ) : (
              <Typography.Text className={styles.help}>
                Used as the stable API handle.
              </Typography.Text>
            )}
          </label>
          {isEdit ? (
            <Button
              className={styles.delete}
              danger
              loading={deleteMutation.loading}
              onClick={remove}
            >
              Delete stage
            </Button>
          ) : null}
        </div>
      </ModalLayout>
    </FormProvider>
  );
}
