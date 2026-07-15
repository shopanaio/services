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
import { useUpdateEmailSettings } from "../../hooks";
import type { EditEmailSettingsModalPayload } from "../../modals";
import type { UpdateEmailSettingsInput } from "../../types";

const useStyles = createStyles(({ token }) => ({
  form: { display: "flex", flexDirection: "column", gap: token.margin },
  field: { display: "flex", flexDirection: "column", gap: token.marginXXS },
  label: { fontWeight: 500 },
}));

export const EditEmailSettingsModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditEmailSettingsModalPayload;
  const mutation = useUpdateEmailSettings();
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<UpdateEmailSettingsInput>({
    defaultValues: {
      from: typedPayload.settings.from,
      replyTo: typedPayload.settings.replyTo,
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    const result = await mutation.updateEmailSettings(values);
    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success("Email settings updated");
    forcePop();
  });

  return (
    <ModalLayout
      name="edit-email-settings"
      header={
        <ModalHeader
          name="edit-email-settings"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Email settings"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <div className={styles.form}>
          {(["from", "replyTo"] as const).map((name) => (
            <div className={styles.field} key={name}>
              <Typography.Text className={styles.label}>
                {name === "from" ? "From" : "Reply to"}
              </Typography.Text>
              <Controller
                control={control}
                name={name}
                rules={{
                  pattern: {
                    message: "Enter a valid email value",
                    value: /.+@.+\..+/,
                  },
                  required: name === "from" ? "From is required" : false,
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    status={errors[name] ? "error" : undefined}
                  />
                )}
              />
              {errors[name] ? (
                <Typography.Text type="danger">
                  {errors[name]?.message}
                </Typography.Text>
              ) : null}
            </div>
          ))}
        </div>
      </Paper>
    </ModalLayout>
  );
};
