"use client";

import { Alert } from "antd";
import type { AdminExtensionProps } from "@shopana/admin-app-sdk";

export default function HelloWorldOrderNote({
  context,
}: AdminExtensionProps<"orders.details.sidebar.after">) {
  return (
    <Alert
      type="info"
      showIcon
      message="Hello World App"
      description={`Extension contribution for order ${context.orderId}`}
    />
  );
}
