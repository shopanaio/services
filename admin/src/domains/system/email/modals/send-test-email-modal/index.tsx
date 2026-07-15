"use client";

import { Alert, App, Input, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { EMAIL_TEMPLATE_LABELS } from "../../constants";
import { useSendTestEmail } from "../../hooks";
import type { SendTestEmailModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  field: { display: "flex", flexDirection: "column", gap: token.marginXXS },
  label: { fontWeight: 500 },
  tag: { marginTop: token.marginSM },
}));

export const SendTestEmailModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as SendTestEmailModalPayload;
  const mutation = useSendTestEmail();
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<{ to: string }>({ defaultValues: { to: "" } });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async ({ to }) => {
    const result = await mutation.sendTestEmail({ to, type: typedPayload.type });
    if (!result.data) return;
    message.success("Test email sent");
    forcePop();
  });

  return (
    <ModalLayout
      name="send-test-email"
      header={
        <ModalHeader
          name="send-test-email"
          onClose={pop}
          submitButtonProps={{
            children: "Send",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Send test email"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>
            Destination email
          </Typography.Text>
          <Controller
            control={control}
            name="to"
            rules={{
              pattern: { message: "Email is invalid", value: /.+@.+\..+/ },
              required: "Destination email is required",
            }}
            render={({ field }) => (
              <Input
                {...field}
                data-testid="test-email-input"
                placeholder="customer@example.com"
                status={errors.to ? "error" : undefined}
              />
            )}
          />
          {errors.to ? (
            <Typography.Text type="danger">{errors.to.message}</Typography.Text>
          ) : null}
        </div>
        <Tag className={styles.tag} color="blue">
          {EMAIL_TEMPLATE_LABELS[typedPayload.type]}
        </Tag>
      </Paper>
    </ModalLayout>
  );
};
