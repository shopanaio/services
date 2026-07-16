"use client";

import { Alert, App, Button, Flex, Table, Tag, Typography } from "antd";
import { FolderAddOutlined, StopOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { DataLayout } from "@/layouts/data";
import { useReviewModal } from "@/domains/customer-content/reviews/modals";
import { useQuestionModal } from "@/domains/customer-content/questions/modals";
import { useContentActions } from "@/domains/customer-content/shared/hooks";
import { useModerationContents } from "../hooks";
import { useModerationCaseModal } from "../modals";
import type { ContentSummary } from "../types";

export default function ModerationQueuePage() {
  const { message, modal } = App.useApp(); const query = useModerationContents(); const connection = query.data?.reviewsQuery.contents;
  const actions = useContentActions(); const reviewModal = useReviewModal(); const questionModal = useQuestionModal(); const caseModal = useModerationCaseModal();
  const open = (content: ContentSummary) => { if (content.__typename === "Review") reviewModal.push({ entityId: content.id, onSaved: query.refetch }); else if (content.__typename === "ProductQuestion") questionModal.push({ entityId: content.id, onSaved: query.refetch }); };
  const redact = async (content: ContentSummary) => {
    const confirmed = await modal.confirm({ title: "Redact content?", content: "Personal content will be irreversibly redacted.", okText: "Redact", okButtonProps: { danger: true } }); if (!confirmed || content.revision == null) return;
    const result = await actions.redact(content.id, content.revision); if (result.errors.length) return message.error(result.errors.map((item) => item.message).join(" ")); await query.refetch(); message.success("Content redacted");
  };
  const columns: ColumnsType<ContentSummary> = [
    { title: "Content", key: "content", render: (_, item) => <Flex vertical><Typography.Text strong>{item.title || item.__typename}</Typography.Text><Typography.Text ellipsis style={{ maxWidth: 520 }}>{item.body}</Typography.Text><Typography.Text type="secondary">{item.author.displayName} · {item.locale}</Typography.Text></Flex> },
    { title: "Status", dataIndex: "status", width: 120, render: (status) => <Tag color={status === "PUBLISHED" ? "green" : status === "REJECTED" ? "red" : "gold"}>{String(status).toLowerCase()}</Tag> },
    { title: "Reports", key: "reports", width: 90, render: (_, item) => item.metrics?.reportCount ?? 0 },
    { title: "Updated", dataIndex: "updatedAt", width: 180, render: (value) => new Date(value).toLocaleString() },
    { title: "Actions", key: "actions", width: 190, render: (_, item) => <Flex gap="small"><Button size="small" icon={<FolderAddOutlined />} onClick={(event) => { event.stopPropagation(); caseModal.push({ contentId: item.id, onSaved: query.refetch }); }}>Case</Button><Button size="small" danger icon={<StopOutlined />} disabled={!!item.redactedAt || item.revision == null} onClick={(event) => { event.stopPropagation(); void redact(item); }}>Redact</Button></Flex> },
  ];
  return <DataLayout fullWidth name="moderation" title="Moderation" count={connection?.totalCount ?? 0}>{query.error || actions.error ? <Alert type="error" showIcon message={(query.error ?? actions.error)?.message} /> : null}<Table rowKey="id" loading={query.loading || actions.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={{ pageSize: 20, showSizeChanger: true }} onRow={(content) => ({ onClick: () => open(content), style: { cursor: ["Review", "ProductQuestion"].includes(content.__typename ?? "") ? "pointer" : "default" } })} /></DataLayout>;
}
