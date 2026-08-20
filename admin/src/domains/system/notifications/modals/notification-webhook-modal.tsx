"use client";

import { Alert, App, Input, Select, Skeleton, Typography } from "antd";
import { createStyles } from "antd-style";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { NotificationWebhookFormat } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useCreateWebhook, useUpdateWebhook, useWebhooks } from "../hooks";
import type { NotificationWebhookModalPayload } from "../modals";

interface WebhookFormValues {
  eventType: string;
  format: NotificationWebhookFormat;
  url: string;
  apiVersion: string;
}

const useStyles = createStyles(({ token }) => ({
  form: {
    boxSizing: "border-box",
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: 16,
    padding: 24,
    background: token.colorBgContainer,
  },
  description: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    "@media (max-width: 680px)": {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: token.colorText,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "19px",
  },
  error: {
    color: token.colorError,
    fontSize: 12,
    lineHeight: "18px",
  },
  info: {
    fontSize: 12,
  },
}));

function validateWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || "Webhook URL must use HTTPS.";
  } catch {
    return "Enter a valid webhook URL.";
  }
}

export function NotificationWebhookModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const { webhook, onSaved } = payload as NotificationWebhookModalPayload;
  const webhooksQuery = useWebhooks();
  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const activeMutation = webhook ? updateMutation : createMutation;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isDirty, isValid },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<WebhookFormValues>({
    defaultValues: {
      eventType: webhook?.eventType ?? "",
      format: webhook?.format ?? NotificationWebhookFormat.Json,
      url: webhook?.url ?? "",
      apiVersion: webhook?.apiVersion ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    if (webhook) void trigger();
  }, [trigger, webhook]);

  useEffect(() => {
    if (webhook || !webhooksQuery.capabilities) return;
    const defaultVersion =
      webhooksQuery.capabilities.apiVersions.find((version) => version.isDefault) ??
      webhooksQuery.capabilities.apiVersions[0];
    const defaultEvent = webhooksQuery.capabilities.events[0];
    if (defaultEvent) {
      setValue("eventType", defaultEvent.eventType, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    if (defaultVersion) {
      setValue("apiVersion", defaultVersion.version, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [setValue, webhook, webhooksQuery.capabilities]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    activeMutation.reset();

    const result = webhook
      ? await updateMutation.updateWebhook({
          id: webhook.id,
          expectedVersion: webhook.version,
          eventType: values.eventType,
          format: values.format,
          url: values.url.trim(),
          apiVersion: values.apiVersion,
        })
      : await createMutation.createWebhook({
          eventType: values.eventType,
          format: values.format,
          url: values.url.trim(),
          apiVersion: values.apiVersion,
        });

    if (!result.data || result.userErrors.length > 0) {
      setSubmitError(
        result.userErrors.map((error) => error.message).join(" ") ||
          "The webhook could not be saved.",
      );
      return;
    }

    setDirty(false);
    message.success(webhook ? "Webhook updated" : "Webhook created");
    forcePop();
    void Promise.resolve(onSaved?.()).catch(() => undefined);
  });

  const eventOptions =
    webhooksQuery.capabilities?.events.map((event) => ({
      label: event.title,
      value: event.eventType,
    })) ?? [];
  const versionOptions =
    webhooksQuery.capabilities?.apiVersions.map((version) => ({
      label: version.version,
      value: version.version,
    })) ?? [];
  const errorMessage = submitError ?? webhooksQuery.error?.message ?? activeMutation.error?.message;
  const loading = activeMutation.loading || (webhooksQuery.loading && !webhooksQuery.capabilities);

  return (
    <ModalLayout
      name="notification-webhook"
      header={
        <ModalHeader
          name="notification-webhook"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isValid || Boolean(webhook && !isDirty),
            loading,
            onClick: () => void submit(),
          }}
          title={webhook ? "Update webhook" : "Add webhook"}
        />
      }
    >
      {webhooksQuery.loading && !webhooksQuery.capabilities ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <Typography.Text className={styles.description}>
            Choose the event and endpoint that should receive signed notifications.
          </Typography.Text>

          {errorMessage ? <Alert message={errorMessage} showIcon type="error" /> : null}

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Event</span>
              <Controller
                control={control}
                name="eventType"
                rules={{ required: "Select an event." }}
                render={({ field }) => (
                  <Select
                    {...field}
                    aria-label="Webhook event"
                    options={eventOptions}
                    placeholder="Cart creation"
                    status={errors.eventType ? "error" : undefined}
                  />
                )}
              />
              {errors.eventType ? (
                <span className={styles.error}>{errors.eventType.message}</span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Format</span>
              <Controller
                control={control}
                name="format"
                render={({ field }) => (
                  <Select
                    {...field}
                    aria-label="Webhook format"
                    options={[
                      { label: "JSON", value: NotificationWebhookFormat.Json },
                      { label: "XML", value: NotificationWebhookFormat.Xml },
                    ]}
                  />
                )}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>URL</span>
            <Controller
              control={control}
              name="url"
              rules={{
                required: "Webhook URL is required.",
                validate: validateWebhookUrl,
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  aria-label="Webhook URL"
                  placeholder="https://hooks.example.com/shopana/cart"
                  status={errors.url ? "error" : undefined}
                />
              )}
            />
            {errors.url ? <span className={styles.error}>{errors.url.message}</span> : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Webhook API version</span>
            <Controller
              control={control}
              name="apiVersion"
              rules={{ required: "Select an API version." }}
              render={({ field }) => (
                <Select
                  {...field}
                  aria-label="Webhook API version"
                  options={versionOptions}
                  placeholder="unstable"
                  status={errors.apiVersion ? "error" : undefined}
                />
              )}
            />
            {errors.apiVersion ? (
              <span className={styles.error}>{errors.apiVersion.message}</span>
            ) : null}
          </label>

          <Alert
            className={styles.info}
            message="Shopana signs each request. Verify the signature using your store webhook secret."
            showIcon
            type="info"
          />
        </form>
      )}
    </ModalLayout>
  );
}
