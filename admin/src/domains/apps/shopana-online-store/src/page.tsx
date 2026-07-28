"use client";

import { Alert } from "antd";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";

export default function OnlineStoreAdminPage({ sdk }: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage
      description="Manage the Shopana first-party online storefront sales channel."
      title="Online Store"
    >
      <Alert
        description={`App code: ${sdk.app.code}`}
        message="Online Store configuration"
        showIcon
        type="info"
      />
    </sdk.ui.AppPage>
  );
}
