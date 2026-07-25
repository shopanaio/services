"use client";

import Link from "next/link";
import { Button, Card, Flex, Tag, Typography } from "antd";
import { usePathParams } from "@/registry";
import {
  installHelloWorld,
  resumeHelloWorld,
  suspendHelloWorld,
  uninstallHelloWorld,
  useHelloWorldInstallation,
} from "../../hello-world/store";

export function AppsManagementPage() {
  const { getParam } = usePathParams();
  const orgName = getParam("orgName") ?? "";
  const storeName = getParam("storeName") ?? "";
  const installation = useHelloWorldInstallation();
  const appUrl = `/${encodeURIComponent(orgName)}/${encodeURIComponent(
    storeName,
  )}/apps/hello-world`;

  return (
    <main style={{ padding: 24 }}>
      <Flex vertical gap="large">
        <div>
          <Typography.Title level={2}>Apps</Typography.Title>
          <Typography.Text type="secondary">
            Installed and available Apps for this store.
          </Typography.Text>
        </div>
        <Card
          title="Hello World"
          extra={
            <Tag color={installation.status === "ACTIVE" ? "green" : "default"}>
              {installation.status}
            </Tag>
          }
          actions={[
            installation.status === "ACTIVE" ? (
              <Link key="open" href={appUrl}>
                <Button type="link">Open App</Button>
              </Link>
            ) : (
              <Button
                key="activate"
                type="link"
                onClick={
                  installation.status === "SUSPENDED"
                    ? resumeHelloWorld
                    : installHelloWorld
                }
              >
                {installation.status === "SUSPENDED" ? "Resume" : "Install"}
              </Button>
            ),
            installation.status === "ACTIVE" ? (
              <Button key="suspend" type="link" onClick={suspendHelloWorld}>
                Suspend
              </Button>
            ) : null,
            installation.status !== "UNINSTALLED" ? (
              <Button
                key="uninstall"
                type="link"
                danger
                onClick={uninstallHelloWorld}
              >
                Uninstall
              </Button>
            ) : null,
          ]}
        >
          <Typography.Paragraph>
            Bundled example App used to validate the Admin Apps SDK, runtime
            page, navigation, notifications, and shared modal stack.
          </Typography.Paragraph>
          <Typography.Text type="secondary">
            Version 0.0.1 · SDK ^1.0.0
          </Typography.Text>
        </Card>
      </Flex>
    </main>
  );
}

export default AppsManagementPage;
