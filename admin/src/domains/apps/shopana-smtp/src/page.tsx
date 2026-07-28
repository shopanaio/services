"use client";

import { Alert } from "antd";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";

export default function SmtpAdminPage({ sdk }: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage
      description="Configure email delivery through the store SMTP server."
      title="SMTP"
    >
      <Alert
        description={`App code: ${sdk.app.code}`}
        message="SMTP configuration"
        showIcon
        type="info"
      />
    </sdk.ui.AppPage>
  );
}
