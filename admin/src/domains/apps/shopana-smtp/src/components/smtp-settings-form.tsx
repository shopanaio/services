"use client";

import { useState } from "react";
import { Button, Input, InputNumber, Select, Typography } from "antd";
import { createStyles } from "antd-style";
import { SmtpConnectionProvider, SmtpConnectionSecurity } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { SmtpProviderPreset } from "../graphql/operation-types";

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

export interface SmtpSettings {
  displayName: string;
  provider: SmtpConnectionProvider;
  host: string;
  port: number;
  security: SmtpConnectionSecurity;
  username?: string;
  password?: string;
}

interface SmtpSettingsFormProps {
  disabled?: boolean;
  hasStoredPassword: boolean;
  initialValue: SmtpSettings;
  loading: boolean;
  presets: SmtpProviderPreset[];
  submitLabel: string;
  onSubmit: (settings: SmtpSettings) => Promise<boolean>;
}

export function SmtpSettingsForm({
  disabled = false,
  hasStoredPassword,
  initialValue,
  loading,
  presets,
  submitLabel,
  onSubmit,
}: SmtpSettingsFormProps) {
  const { styles, cx } = useStyles();
  const [settings, setSettings] = useState(initialValue);
  const [initialSettings, setInitialSettings] = useState(() => JSON.stringify(initialValue));
  const isDirty = JSON.stringify(settings) !== initialSettings;
  const canSubmit = Boolean(
    !disabled &&
    isDirty &&
    settings.displayName.trim() &&
    settings.host.trim() &&
    settings.port >= 1 &&
    settings.port <= 65535 &&
    (settings.provider === SmtpConnectionProvider.Custom || settings.username?.trim()) &&
    (!settings.username?.trim() || hasStoredPassword || settings.password?.trim()),
  );

  const update = <TKey extends keyof SmtpSettings>(key: TKey, value: SmtpSettings[TKey]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applyProvider = (provider: SmtpConnectionProvider) => {
    const preset = presets.find((candidate) => candidate.provider === provider);
    setSettings((current) => ({
      ...current,
      provider,
      host: preset?.host ?? "",
      port: preset?.port ?? 587,
      security: preset?.security ?? SmtpConnectionSecurity.Starttls,
      username: preset?.username ?? "",
    }));
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    const normalizedSettings = {
      ...settings,
      displayName: settings.displayName.trim(),
      host: settings.host.trim(),
      username: settings.username?.trim() || undefined,
      password: settings.password?.trim() || undefined,
    };
    if (await onSubmit(normalizedSettings)) {
      setSettings(normalizedSettings);
      setInitialSettings(JSON.stringify(normalizedSettings));
    }
  };

  return (
    <>
      <Paper>
        <PaperHeader
          description="Choose a preset, then adjust any provider-specific values."
          title="Provider"
        />
        <div className={styles.fields}>
          <label className={cx(styles.field, styles.fieldFull)}>
            <Typography.Text className={styles.label}>Connection name</Typography.Text>
            <Input
              disabled={disabled}
              placeholder="Primary transactional email"
              value={settings.displayName}
              onChange={({ target }) => update("displayName", target.value)}
            />
          </label>
          <label className={cx(styles.field, styles.fieldFull)}>
            <Typography.Text className={styles.label}>Provider</Typography.Text>
            <Select
              disabled={disabled}
              options={presets.map((preset) => ({
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
        <PaperHeader
          actions={
            disabled ? null : (
              <Button
                disabled={!canSubmit}
                loading={loading}
                size="small"
                type="primary"
                onClick={() => void submit()}
              >
                {submitLabel}
              </Button>
            )
          }
          title="SMTP server"
        />
        <div className={styles.fields}>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>SMTP host</Typography.Text>
            <Input
              disabled={disabled}
              value={settings.host}
              onChange={({ target }) => update("host", target.value)}
            />
          </label>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>Port</Typography.Text>
            <InputNumber
              disabled={disabled}
              max={65535}
              min={1}
              style={{ width: "100%" }}
              value={settings.port}
              onChange={(value) => update("port", value ?? 587)}
            />
          </label>
          <label className={styles.field}>
            <Typography.Text className={styles.label}>Security</Typography.Text>
            <Select
              disabled={disabled}
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
            <Typography.Text className={styles.label}>Username</Typography.Text>
            <Input
              autoComplete="username"
              disabled={disabled}
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
              disabled={disabled}
              value={settings.password}
              onChange={({ target }) => update("password", target.value)}
            />
            <Typography.Text className={styles.help}>
              {hasStoredPassword
                ? "Leave blank to keep the stored credential."
                : "The credential is encrypted and is never returned after saving."}
            </Typography.Text>
          </label>
        </div>
      </Paper>
    </>
  );
}
