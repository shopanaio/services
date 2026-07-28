"use client";

import { Alert } from "antd";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";

export default function OnlineStoreAdminPage({ sdk }: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage>
      <Alert
        description={`App code: ${sdk.app.code}`}
        message="Online Store configuration"
        showIcon
        type="info"
      />
    </sdk.ui.AppPage>
  );
}
