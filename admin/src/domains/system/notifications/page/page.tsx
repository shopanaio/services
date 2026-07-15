"use client";

import { Alert, Typography } from "antd";
import { createStyles } from "antd-style";
import { useCallback } from "react";
import { DataLayout } from "@/layouts/data";
import { EmailTemplatesTable } from "../../email-templates/components";
import { useEmailSettings, useEmailTemplates } from "../../email/hooks";
import { EmailInformation, SmtpSettings } from "../components";

const useStyles = createStyles(({ token }) => ({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXL,
    paddingBottom: token.padding,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
  },
  sectionTitle: {
    margin: 0,
  },
  settings: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
  },
}));

export default function NotificationSettingsPage() {
  const { styles } = useStyles();
  const {
    error: settingsError,
    loading: settingsLoading,
    profile,
    refetch: refetchSettings,
    settings,
  } = useEmailSettings();
  const {
    error: templatesError,
    loading: templatesLoading,
    refetch: refetchTemplates,
    templates,
  } = useEmailTemplates();
  const refreshSettings = useCallback(async () => {
    await refetchSettings();
  }, [refetchSettings]);
  const refreshTemplates = useCallback(async () => {
    await refetchTemplates();
  }, [refetchTemplates]);

  return (
    <DataLayout
      loading={settingsLoading}
      name="notifications"
      title="Notifications"
    >
      <DataLayout.Content className={styles.content}>
        <section aria-labelledby="email-settings-title" className={styles.section}>
          <Typography.Title
            className={styles.sectionTitle}
            id="email-settings-title"
            level={5}
          >
            Email Settings
          </Typography.Title>
          {settingsError ? (
            <Alert message={settingsError.message} showIcon type="error" />
          ) : null}
          <div className={styles.settings}>
            <EmailInformation onSaved={refreshSettings} settings={settings} />
            <SmtpSettings onSaved={refreshSettings} profile={profile} />
          </div>
        </section>
        <section aria-labelledby="email-templates-title" className={styles.section}>
          <Typography.Title
            className={styles.sectionTitle}
            id="email-templates-title"
            level={5}
          >
            Email Templates
          </Typography.Title>
          {templatesError ? (
            <Alert message={templatesError.message} showIcon type="error" />
          ) : null}
          <EmailTemplatesTable
            loading={templatesLoading}
            onSaved={refreshTemplates}
            templates={templates}
          />
        </section>
      </DataLayout.Content>
    </DataLayout>
  );
}
