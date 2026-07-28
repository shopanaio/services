"use client";

import { useEffect, useState } from "react";
import { Button, Input, InputNumber, Select, Typography } from "antd";
import { createStyles } from "antd-style";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";
import {
  SmtpConnectionProvider,
  SmtpConnectionSecurity,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type {
  SmtpSettings,
  SmtpSettingsModalPayload,
  SmtpSettingsModalResult,
} from ".";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gap: `${token.paddingSM}px ${token.padding}px`,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXXS,
    minWidth: 0,
  },
  fieldFull: {
    gridColumn: "1 / -1",
  },
  label: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  help: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
  },
}));

const emptySettings: SmtpSettings = {
  displayName: "",
  provider: SmtpConnectionProvider.Sendgrid,
  host: "smtp.sendgrid.net",
  port: 587,
  security: SmtpConnectionSecurity.Starttls,
  username: "apikey",
  password: "",
};

export default function SmtpSettingsModal({
  sdk,
  payload,
}: AdminAppModalProps<SmtpSettingsModalPayload>) {
  const { styles, cx } = useStyles();
  const [settings, setSettings] = useState<SmtpSettings>(() =>
    payload.connection
      ? {
          displayName: payload.connection.displayName,
          provider: payload.connection.provider,
          host: payload.connection.host,
          port: payload.connection.port,
          security: payload.connection.security,
          username: payload.connection.username ?? undefined,
          password: "",
        }
      : emptySettings,
  );
  const [initialSettings] = useState(() => JSON.stringify(settings));
  const isDirty = JSON.stringify(settings) !== initialSettings;
  const canSubmit = Boolean(
    settings.displayName.trim() &&
      settings.host.trim() &&
      settings.port >= 1 &&
      settings.port <= 65535 &&
      (settings.provider === SmtpConnectionProvider.Custom ||
        settings.username?.trim()) &&
      (!settings.username?.trim() ||
        payload.connection?.hasPassword ||
        settings.password?.trim()),
  );

  useEffect(() => {
    sdk.modals.setCurrentDirty(isDirty);
  }, [isDirty, sdk]);

  const update = <TKey extends keyof SmtpSettings>(
    key: TKey,
    value: SmtpSettings[TKey],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applyProvider = (provider: SmtpConnectionProvider) => {
    const preset = payload.presets.find(
      (candidate) => candidate.provider === provider,
    );
    setSettings((current) => ({
      ...current,
      provider,
      host: preset?.host ?? "",
      port: preset?.port ?? 587,
      security: preset?.security ?? SmtpConnectionSecurity.Starttls,
      username: preset?.username ?? "",
    }));
  };

  const submit = () => {
    if (!canSubmit) return;
    sdk.modals.setCurrentDirty(false);
    sdk.modals.closeCurrent<SmtpSettingsModalResult>({
      settings: {
        ...settings,
        displayName: settings.displayName.trim(),
        host: settings.host.trim(),
        username: settings.username?.trim() || undefined,
        password: settings.password?.trim() || undefined,
      },
    });
  };

  return (
    <sdk.ui.ModalLayout
      actions={
        <Button
          disabled={!canSubmit}
          size="small"
          type="primary"
          onClick={submit}
        >
          {payload.connection ? "Save changes" : "Add connection"}
        </Button>
      }
      title={
        payload.connection ? "Edit SMTP connection" : "Add SMTP connection"
      }
    >
      <Paper>
        <PaperHeader
          description="Choose a preset, then adjust any provider-specific values."
          title="Provider"
        />
        <div className={styles.fields}>
          <label className={cx(styles.field, styles.fieldFull)}>
            <Typography.Text className={styles.label}>
              Connection name
            </Typography.Text>
            <Input
              placeholder="Primary transactional email"
              value={settings.displayName}
              onChange={({ target }) =>
                update("displayName", target.value)
              }
            />
          </label>
          <label className={cx(styles.field, styles.fieldFull)}>
            <Typography.Text className={styles.label}>
              Provider
            </Typography.Text>
            <Select
              options={payload.presets.map((preset) => ({
                label: preset.label,
                value: preset.provider,
              }))}
              value={settings.provider}
              onChange={applyProvider}
            />
          </label>
        </div>
      </Paper>

      <Paper>
        <PaperHeader title="SMTP server" />
        <div className={styles.fields}>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>
              SMTP host
            </Typography.Text>
            <Input
              value={settings.host}
              onChange={({ target }) => update("host", target.value)}
            />
          </label>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>Port</Typography.Text>
            <InputNumber
              max={65535}
              min={1}
              style={{ width: "100%" }}
              value={settings.port}
              onChange={(value) => update("port", value ?? 587)}
            />
          </label>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>
              Security
            </Typography.Text>
            <Select
              options={[
                { label: "STARTTLS", value: SmtpConnectionSecurity.Starttls },
                { label: "TLS", value: SmtpConnectionSecurity.Tls },
                { label: "None", value: SmtpConnectionSecurity.None },
              ]}
              value={settings.security}
              onChange={(value) => update("security", value)}
            />
          </label>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>
              Username
            </Typography.Text>
            <Input
              autoComplete="username"
              value={settings.username}
              onChange={({ target }) => update("username", target.value)}
            />
          </label>
          <label className={cx(styles.field, styles.fieldFull)}>
            <Typography.Text className={styles.label}>
              {settings.provider === SmtpConnectionProvider.Sendgrid
                ? "API key"
                : "Password or API key"}
            </Typography.Text>
            <Input.Password
              autoComplete="new-password"
              value={settings.password}
              onChange={({ target }) => update("password", target.value)}
            />
            <Typography.Text className={styles.help}>
              {payload.connection?.hasPassword
                ? "Leave blank to keep the stored credential."
                : "The credential is encrypted and is never returned after saving."}
            </Typography.Text>
          </label>
        </div>
      </Paper>
    </sdk.ui.ModalLayout>
  );
}
