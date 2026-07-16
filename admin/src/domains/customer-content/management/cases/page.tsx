"use client";

import { Alert, Button, Flex, Table, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import type { ColumnsType } from "antd/es/table";
import { DataLayout } from "@/layouts/data";
import { useModerationCaseModal } from "../modals";
import { useModerationCases } from "../hooks";
import type { ModerationCase } from "../types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";

export default function ModerationCasesPage() {
  const { backToUgc } = useUgcNavigation();
  const query = useModerationCases(); const connection = query.data?.reviewsQuery.moderationCases; const { push } = useModerationCaseModal();
  const columns: ColumnsType<ModerationCase> = [
    { title: "Content", key: "content", render: (_, item) => <Flex vertical><Typography.Text ellipsis style={{ maxWidth: 420 }}>{item.content.body}</Typography.Text><Typography.Text type="secondary">{item.content.__typename} · {item.content.author.displayName}</Typography.Text></Flex> },
    { title: "Reason", dataIndex: "reasonCode", width: 180 }, { title: "Priority", dataIndex: "priority", width: 90 },
    { title: "Status", dataIndex: "status", width: 120, render: (status) => <Tag color={status === "OPEN" ? "gold" : status === "RESOLVED" ? "green" : undefined}>{String(status).toLowerCase()}</Tag> },
    { title: "Assignee", dataIndex: "assignedToPrincipalId", width: 180, render: (value) => value ?? "Unassigned" },
    { title: "Due", dataIndex: "dueAt", width: 180, render: (value) => value ? new Date(value).toLocaleString() : "—" },
  ];
  return <DataLayout fullWidth name="moderation-cases" title="Moderation cases" count={connection?.totalCount ?? 0} onBack={backToUgc} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: query.refetch })}>Create moderation case</Button>}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}<Table rowKey="id" loading={query.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={{ pageSize: 20, showSizeChanger: true }} onRow={(moderationCase) => ({ onClick: () => push({ moderationCase, onSaved: query.refetch }), style: { cursor: "pointer" } })} />
  </DataLayout>;
}
