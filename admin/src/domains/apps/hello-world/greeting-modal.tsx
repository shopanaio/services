"use client";

import { Button, Card, Flex, Typography } from "antd";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";

interface GreetingPayload {
  name?: string;
}

export default function HelloWorldGreetingModal({
  sdk,
  payload,
}: AdminAppModalProps<GreetingPayload>) {
  return (
    <sdk.ui.ModalLayout
      title="Hello World modal"
      actions={
        <Button
          size="small"
          type="primary"
          onClick={() => sdk.modals.closeCurrent({ greeted: true })}
        >
          Done
        </Button>
      }
    >
      <Card>
        <Flex vertical gap="small">
          <Typography.Title level={4}>
            Hello, {payload.name || "world"}!
          </Typography.Title>
          <Typography.Text type="secondary">
            This modal is owned by the App and rendered by the shared Admin
            modal stack.
          </Typography.Text>
        </Flex>
      </Card>
    </sdk.ui.ModalLayout>
  );
}
