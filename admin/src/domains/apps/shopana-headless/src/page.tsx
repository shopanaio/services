"use client";

import { Alert } from "antd";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";

export default function HeadlessAdminPage({ sdk }: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage
      description="Configure custom storefront access to the Shopana Storefront API."
      title="Headless"
    >
      <Alert
        description={`App code: ${sdk.app.code}`}
        message="Headless configuration"
        showIcon
        type="info"
      />
    </sdk.ui.AppPage>
  );
}
