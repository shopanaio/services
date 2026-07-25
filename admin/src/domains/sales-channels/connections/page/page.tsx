"use client";

import { useState } from "react";
import { App, Button, Card, Dropdown, Flex, Space, Table, Tag, Typography } from "antd";
import { LuPlus, LuEllipsis } from "react-icons/lu";
import type { ApiSalesChannelConnection } from "@/graphql/types";
import { useSalesChannelConnections, useSalesChannelMutations } from "../hooks";
import { CreateConnectionModal } from "../modals/create-connection-modal";

export default function SalesChannelConnectionsPage() {
  const { message, modal } = App.useApp();
  const [creating, setCreating] = useState(false);
  const data = useSalesChannelConnections();
  const mutations = useSalesChannelMutations();

  const act = async (
    action: "suspend" | "resume" | "disconnect",
    row: ApiSalesChannelConnection,
  ) => {
    if (action === "disconnect") {
      const accepted = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: `Disconnect ${row.displayName}?`,
          content:
            "Linked markets and publications will be retained as historical records and marked stale. The App remains installed.",
          okText: "Disconnect",
          okButtonProps: { danger: true },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!accepted) return;
    }
    await mutations.action(action, {
      connectionId: row.id,
      clientMutationId: crypto.randomUUID(),
    });
    message.success(`${action} operation accepted`);
  };

  return (
    <main style={{ padding: 24 }}>
      <Flex vertical gap={20}>
        <Flex justify="space-between" align="start">
          <div>
            <Typography.Title level={2}>Sales channel connections</Typography.Title>
            <Typography.Text type="secondary">
              Operational channel instances created by installed Apps.
            </Typography.Text>
          </div>
          <Button type="primary" icon={<LuPlus />} onClick={() => setCreating(true)}>
            Add connection
          </Button>
        </Flex>
        <Card>
          <Table<ApiSalesChannelConnection>
            rowKey="id"
            loading={data.loading}
            dataSource={data.connections}
            pagination={false}
            columns={[
              {
                title: "Connection",
                dataIndex: "displayName",
                render: (value, row) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{value}</Typography.Text>
                    <Typography.Text type="secondary">
                      {row.externalAccountLabel ?? "Onboarding not completed"}
                    </Typography.Text>
                  </Space>
                ),
              },
              { title: "App", render: (_, row) => row.installation.appCode },
              { title: "Specification", render: (_, row) => row.specification.label },
              {
                title: "Lifecycle",
                render: (_, row) => <Tag>{row.status}</Tag>,
              },
              {
                title: "Availability",
                render: (_, row) => (
                  <Tag color={row.effectiveActive ? "green" : "default"}>
                    {row.effectiveActive ? "Active" : "Unavailable"}
                  </Tag>
                ),
              },
              {
                title: "Health",
                render: (_, row) => <Tag>{row.healthStatus}</Tag>,
              },
              { title: "Markets", render: (_, row) => row.markets.length },
              { title: "Publications", render: (_, row) => row.publications.length },
              {
                title: "",
                width: 48,
                render: (_, row) => (
                  <Dropdown
                    menu={{
                      items: [
                        row.status === "ACTIVE"
                          ? { key: "suspend", label: "Suspend" }
                          : null,
                        row.status === "SUSPENDED"
                          ? { key: "resume", label: "Resume" }
                          : null,
                        { key: "disconnect", label: "Disconnect", danger: true },
                      ].filter(Boolean) as { key: string; label: string; danger?: boolean }[],
                      onClick: ({ key }) =>
                        act(key as "suspend" | "resume" | "disconnect", row),
                    }}
                  >
                    <Button type="text" icon={<LuEllipsis />} />
                  </Dropdown>
                ),
              },
            ]}
          />
        </Card>
      </Flex>
      <CreateConnectionModal
        open={creating}
        apps={data.availableApps}
        loading={mutations.loading}
        onCancel={() => setCreating(false)}
        onSubmit={(input) => mutations.create(input)}
      />
    </main>
  );
}
