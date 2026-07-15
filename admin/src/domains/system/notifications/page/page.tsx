"use client";

import { Alert } from "antd";
import { createStyles } from "antd-style";
import { useCallback } from "react";
import { DataLayout } from "@/layouts/data";
import { useEmailSettings } from "../../email/hooks";
import { EmailInformation, SmtpSettings } from "../components";

const useStyles = createStyles(({ token }) => ({
  sections: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
    paddingBottom: token.padding,
  },
}));

export default function NotificationSettingsPage() {
  const { styles } = useStyles();
  const { error, loading, profile, refetch, settings } = useEmailSettings();
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DataLayout loading={loading} name="email-settings" title="Email Settings">
      <DataLayout.Content>
        {error ? <Alert message={error.message} showIcon type="error" /> : null}
        <div className={styles.sections}>
          <EmailInformation onSaved={refresh} settings={settings} />
          <SmtpSettings onSaved={refresh} profile={profile} />
        </div>
      </DataLayout.Content>
    </DataLayout>
  );
}
