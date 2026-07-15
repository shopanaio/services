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
import { useUpdateSmtpProfile } from "../../hooks";
import type { EditSmtpProfileModalPayload } from "../../modals";
import type { UpdateSmtpProfileInput } from "../../types";

const useStyles = createStyles(({ token }) => ({
  grid: {
    display: "grid",
    gap: token.margin,
    gridTemplateColumns: "minmax(0, 1fr) 120px",
  },
  credentials: {
    display: "grid",
    gap: token.margin,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: token.margin,
  },
  field: { display: "flex", flexDirection: "column", gap: token.marginXXS },
  label: { fontWeight: 500 },
}));

export const EditSmtpProfileModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditSmtpProfileModalPayload;
  const mutation = useUpdateSmtpProfile();
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<UpdateSmtpProfileInput>({
    defaultValues: {
      host: typedPayload.profile.host,
      port: typedPayload.profile.port,
      username: typedPayload.profile.username,
      password: "",
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    const result = await mutation.updateSmtpProfile(values);
    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success("SMTP profile updated");
    forcePop();
  });

  const field = (
    name: keyof UpdateSmtpProfileInput,
    label: string,
    input: "text" | "number" | "password" = "text",
  ) => (
    <div className={styles.field}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: name === "password" ? false : `${label} is required` }}
        render={({ field: controllerField }) => {
          const props = {
            ...controllerField,
            status: errors[name] ? ("error" as const) : undefined,
          };
          return input === "password" ? (
            <Input.Password {...props} />
          ) : (
            <Input {...props} type={input} />
          );
        }}
      />
      {errors[name] ? (
        <Typography.Text type="danger">{errors[name]?.message}</Typography.Text>
      ) : null}
    </div>
  );

  return (
    <ModalLayout
      name="edit-smtp-profile"
      header={
        <ModalHeader
          name="edit-smtp-profile"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="SMTP settings"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <div className={styles.grid}>
          {field("host", "SMTP host")}
          {field("port", "Port", "number")}
        </div>
        <div className={styles.credentials}>
          {field("username", "Username")}
          {field("password", "Password", "password")}
        </div>
      </Paper>
    </ModalLayout>
  );
};
