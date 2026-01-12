"use client";

import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Alert, message } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IChangeEmailModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  currentEmail: {
    marginBottom: token.marginMD,
  },
  info: {
    marginTop: token.marginMD,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IEmailForm {
  newEmail: string;
}

export const ChangeEmailModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IChangeEmailModalPayload;
  const { currentEmail } = typedPayload;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IEmailForm>({
    defaultValues: {
      newEmail: "",
    },
  });

  const onSubmit = (values: IEmailForm) => {
    typedPayload.onSave?.(values.newEmail);
    message.success("Verification email sent to " + values.newEmail);
    pop();
  };

  return (
    <ModalLayout
      name="change-email"
      header={
        <ModalHeader
          name="change-email"
          title="Change Email Address"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            children: "Send Verification Email",
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Email Address" />
        <div className={styles.currentEmail}>
          <Typography.Text type="secondary">Current email: </Typography.Text>
          <Typography.Text strong>{currentEmail}</Typography.Text>
        </div>

        <form>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              New Email Address
            </Typography.Text>
            <Controller
              name="newEmail"
              control={control}
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
                validate: (value) =>
                  value !== currentEmail || "New email must be different",
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter new email address"
                  status={errors.newEmail ? "error" : undefined}
                  autoFocus
                />
              )}
            />
            {errors.newEmail && (
              <Typography.Text className={styles.error}>
                {errors.newEmail.message}
              </Typography.Text>
            )}
          </div>
        </form>

        <Alert
          className={styles.info}
          type="info"
          message="We'll send a verification link to your new email. Your email won't change until you verify the new address."
          showIcon
        />
      </Paper>
    </ModalLayout>
  );
};
