"use client";

import { Alert, App, Button, DatePicker, Flex, Input, Select, Typography } from "antd";
import { createStyles } from "antd-style";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useCreateApiKey } from "../../hooks";
import type { CreateApiKeyModalPayload } from "../../modals";

type ExpirationPreset = "1m" | "6m" | "1y" | "custom" | "never";

interface ApiKeyFormValues {
  name: string;
  expiration: ExpirationPreset;
  customDate: Dayjs | null;
}

const useStyles = createStyles(({ token }) => ({
  form: { display: "flex", flexDirection: "column", gap: token.margin },
  field: { display: "flex", flexDirection: "column", gap: token.marginXXS },
  label: { fontWeight: 500 },
  expiration: { display: "flex", gap: token.marginSM },
  key: {
    background: token.colorFillQuaternary,
    borderRadius: token.borderRadius,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    wordBreak: "break-all",
  },
}));

export const CreateApiKeyModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as CreateApiKeyModalPayload;
  const mutation = useCreateApiKey();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<ApiKeyFormValues>({
    defaultValues: {
      name: "",
      expiration: "1m",
      customDate: dayjs(),
    },
  });
  const expiration = useWatch({ control, name: "expiration" });
  const options = useMemo(
    () => [
      { label: `1 month (${dayjs().add(1, "month").format("MMM DD, YYYY")})`, value: "1m" },
      { label: `6 months (${dayjs().add(6, "month").format("MMM DD, YYYY")})`, value: "6m" },
      { label: `1 year (${dayjs().add(1, "year").format("MMM DD, YYYY")})`, value: "1y" },
      { label: "Custom", value: "custom" },
      { label: "Never", value: "never" },
    ],
    [],
  );

  useEffect(() => setDirty(!createdKey && isDirty), [createdKey, isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    const dueDate =
      values.expiration === "never"
        ? null
        : values.expiration === "custom"
          ? values.customDate?.toISOString()
          : dayjs()
              .add(
                values.expiration === "1m"
                  ? 1
                  : values.expiration === "6m"
                    ? 6
                    : 1,
                values.expiration === "1y" ? "year" : "month",
              )
              .toISOString();
    if (values.expiration === "custom" && !dueDate) return;

    const result = await mutation.createApiKey({
      name: values.name.trim(),
      dueDate,
    });
    if (!result.data) return;
    await typedPayload.onSaved?.();
    setCreatedKey(result.data.key);
    message.success("API key created");
  });

  if (createdKey) {
    return (
      <ModalLayout
        name="created-api-key"
        header={<ModalHeader onClose={pop} submitButtonProps={null} title="API key" />}
      >
        <Paper>
          <Flex gap={16} vertical>
            <Typography.Text>Your API key has been created.</Typography.Text>
            <Typography.Text className={styles.key} copyable>
              {createdKey}
            </Typography.Text>
            <Alert
              description="Save this API key in a safe place. You will not be able to see it again."
              showIcon
              type="info"
            />
            <Button block onClick={forcePop} type="primary">
              I have saved my API key
            </Button>
          </Flex>
        </Paper>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout
      name="create-api-key"
      header={
        <ModalHeader
          name="create-api-key"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Create API key"
        />
      }
    >
      {mutation.error ? <Alert message={mutation.error.message} showIcon type="error" /> : null}
      <Paper>
        <div className={styles.form}>
          <div className={styles.field}>
            <Typography.Text className={styles.label}>Token name</Typography.Text>
            <Controller
              control={control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  data-testid="api-key-name-input"
                  placeholder="Enter name"
                  status={errors.name ? "error" : undefined}
                />
              )}
            />
          </div>
          <div className={styles.field}>
            <Typography.Text className={styles.label}>Expiration</Typography.Text>
            <div className={styles.expiration}>
              <Controller
                control={control}
                name="expiration"
                render={({ field }) => (
                  <Select {...field} options={options} style={{ minWidth: 260 }} />
                )}
              />
              {expiration === "custom" ? (
                <Controller
                  control={control}
                  name="customDate"
                  render={({ field }) => (
                    <DatePicker allowClear={false} {...field} />
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
      </Paper>
    </ModalLayout>
  );
};
