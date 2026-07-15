"use client";

import { Alert, App, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUpdateGeneralSettings } from "../../hooks";
import type { EditStoreInformationModalPayload } from "../../modals";

interface StoreInformationFormValues {
  displayName: string;
}

const useStyles = createStyles(({ token }) => ({
  formItem: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXXS,
  },
  label: {
    fontWeight: 500,
  },
}));

export const EditStoreInformationModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditStoreInformationModalPayload;
  const mutation = useUpdateGeneralSettings();
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<StoreInformationFormValues>({
    defaultValues: { displayName: typedPayload.displayName },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async ({ displayName }) => {
    const result = await mutation.updateStore({
      id: typedPayload.storeId,
      organizationId: typedPayload.organizationId,
      displayName: displayName.trim(),
    });

    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success("Store information updated");
    forcePop();
  });

  return (
    <ModalLayout
      name="edit-store-information"
      header={
        <ModalHeader
          name="edit-store-information"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Information"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Name</Typography.Text>
          <Controller
            control={control}
            name="displayName"
            rules={{
              maxLength: {
                message: "Name cannot be longer than 32 characters",
                value: 32,
              },
              minLength: {
                message: "Name cannot be shorter than 3 characters",
                value: 3,
              },
              required: "Name is required",
            }}
            render={({ field }) => (
              <Input
                {...field}
                count={{ max: 32, show: true }}
                data-testid="name-input"
                placeholder="Enter store name"
                status={errors.displayName ? "error" : undefined}
              />
            )}
          />
          {errors.displayName ? (
            <Typography.Text type="danger">
              {errors.displayName.message}
            </Typography.Text>
          ) : null}
        </div>
      </Paper>
    </ModalLayout>
  );
};
