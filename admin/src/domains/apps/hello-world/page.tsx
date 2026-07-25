"use client";

import { Button, Card, Flex, Tag, Typography } from "antd";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";

export default function HelloWorldAdminPage({
  sdk,
  route,
}: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage
      title="Hello World"
      description="A bundled Admin App rendered through the scoped Apps SDK."
      actions={<Tag color="green">SDK {sdk.app.version}</Tag>}
    >
      <Card>
        <Flex vertical gap="middle">
          <Typography.Title level={4}>Hello from Shopana Apps</Typography.Title>
          <Typography.Text>
            Store: {sdk.context.orgName}/{sdk.context.storeName}
          </Typography.Text>
          <Typography.Text type="secondary">
            App path: {route.appPath || "/"}
          </Typography.Text>
          <Flex gap="small">
            <Button
              type="primary"
              onClick={() =>
                sdk.modals.openApp("greeting", {
                  name: sdk.context.storeName,
                })
              }
            >
              Open App modal
            </Button>
            <Button
              onClick={() => sdk.navigation.openAppPath("deep-link/example")}
            >
              Open deep link
            </Button>
            <Button
              onClick={() =>
                sdk.notifications.success(
                  "Hello World",
                  "This notification uses the Admin host context.",
                )
              }
            >
              Notify
            </Button>
          </Flex>
        </Flex>
      </Card>
    </sdk.ui.AppPage>
  );
}
