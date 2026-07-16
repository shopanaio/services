"use client";

import { Alert, Button, Flex, Table, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import type { ColumnsType } from "antd/es/table";
import { DataLayout } from "@/layouts/data";
import { useExternalReferenceModal } from "../modals";
import { useExternalReferences } from "../hooks";
import type { ExternalReference } from "../types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";

export default function ExternalReferencesPage() {
  const { backToUgc } = useUgcNavigation();
  const query = useExternalReferences(); const connection = query.data?.reviewsQuery.contentExternalReferences; const { push } = useExternalReferenceModal();
  const columns: ColumnsType<ExternalReference> = [
    { title: "Reference", key: "identity", render: (_, item) => <Flex vertical><Typography.Text strong>{item.externalSystem} · {item.externalType}</Typography.Text><Typography.Text copyable>{item.externalId}</Typography.Text></Flex> },
    { title: "Content", key: "content", render: (_, item) => <Flex vertical><Typography.Text ellipsis style={{ maxWidth: 400 }}>{item.content.body}</Typography.Text><Typography.Text type="secondary">{item.content.__typename} · {item.content.author.displayName}</Typography.Text></Flex> },
    { title: "Direction", dataIndex: "direction", width: 130, render: (value) => String(value).toLowerCase() },
    { title: "Status", dataIndex: "syncStatus", width: 120, render: (value) => <Tag color={value === "SYNCED" ? "green" : value === "FAILED" ? "red" : "gold"}>{String(value).toLowerCase()}</Tag> },
    { title: "Last sync", dataIndex: "lastSyncedAt", width: 180, render: (value) => value ? new Date(value).toLocaleString() : "Never" },
  ];
  return <DataLayout fullWidth name="external-references" title="External sync" count={connection?.totalCount ?? 0} onBack={backToUgc} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: query.refetch })}>Add reference</Button>}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}<Table rowKey="id" loading={query.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={{ pageSize: 20, showSizeChanger: true }} onRow={(externalReference) => ({ onClick: () => push({ externalReference, onSaved: query.refetch }), style: { cursor: "pointer" } })} />
  </DataLayout>;
}
