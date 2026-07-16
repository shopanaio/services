"use client";

import { App, Button, Descriptions, Dropdown, Empty, Flex, List, Select, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, MessageOutlined, MoreOutlined, StopOutlined } from "@ant-design/icons";
import type { ApiProductQuestion } from "@/graphql/types";
import { ProductQuestionSubscriptionStatus, ReviewContentStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ContentDetailsSections } from "@/domains/customer-content/shared/components";
import type { QuestionEditSection } from "../../modals";

interface QuestionDetailsCardProps {
  question: ApiProductQuestion;
  onEdit: (section: QuestionEditSection) => void;
  onDelete: () => Promise<void> | void;
  onRedact: () => Promise<void> | void;
  onRestoreRevision?: (revision: number) => void;
  onCreateCase?: () => void;
  onManageExternalReferences?: () => void;
  onUpdateSubscription?: (subscriptionId: string, expectedUpdatedAt: string, status: ProductQuestionSubscriptionStatus) => Promise<void> | void;
}

const statusColor: Record<ReviewContentStatus, string> = {
  [ReviewContentStatus.Pending]: "gold",
  [ReviewContentStatus.Published]: "green",
  [ReviewContentStatus.Rejected]: "red",
};

export function QuestionDetailsCard({ question, onEdit, onDelete, onRedact, onRestoreRevision, onCreateCase, onManageExternalReferences, onUpdateSubscription }: QuestionDetailsCardProps) {
  const { modal } = App.useApp();
  const confirm = (kind: "delete" | "redact") => modal.confirm({ title: kind === "delete" ? "Delete question?" : "Redact question?", content: kind === "delete" ? "The question will be soft-deleted." : "Personal content will be irreversibly redacted.", okText: kind === "delete" ? "Delete" : "Redact", okButtonProps: { danger: true }, onOk: kind === "delete" ? onDelete : onRedact });
  return <Flex vertical gap={12} style={{ width: "100%" }} data-testid="question-details-card">
    <Paper><Flex justify="space-between" align="flex-start" gap="middle" wrap="wrap"><Flex vertical gap={6}><Flex gap={6}><Tag color={statusColor[question.status]}>{question.status.toLowerCase()}</Tag><Tag color={question.answerState === "ANSWERED" ? "green" : "gold"}>{question.answerState.toLowerCase()}</Tag></Flex><Typography.Title level={3} style={{ margin: 0 }}>Product question</Typography.Title><Typography.Text type="secondary">By {question.author.displayName} · {new Date(question.createdAt).toLocaleString()}</Typography.Text></Flex><Flex gap="small"><Button icon={<EditOutlined />} onClick={() => onEdit("content")}>Edit</Button><Dropdown menu={{ items: [{ key: "redact", label: "Redact content", danger: true, icon: <StopOutlined />, onClick: () => confirm("redact") }, { key: "delete", label: "Delete question", danger: true, icon: <DeleteOutlined />, onClick: () => confirm("delete") }] }}><Button icon={<MoreOutlined />} /></Dropdown></Flex></Flex></Paper>
    <Paper><PaperHeader title="Question" icon={<MessageOutlined />} actions={<Button size="small" onClick={() => onEdit("content")}>Edit</Button>} /><Typography.Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{question.body}</Typography.Paragraph><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: "product", label: "Product", children: question.product.title }, { key: "variant", label: "Variant", children: question.variant?.title ?? question.variant?.id ?? "—" }, { key: "locale", label: "Locale", children: question.locale }]} /></Paper>
    <Paper><PaperHeader title="Moderation" actions={<Button size="small" onClick={() => onEdit("moderation")}>Edit</Button>} /><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: "status", label: "Status", children: <Tag color={statusColor[question.status]}>{question.status.toLowerCase()}</Tag> }, { key: "note", label: "Internal note", children: question.moderationNote ?? "—" }, { key: "moderated", label: "Moderated at", children: question.moderatedAt ? new Date(question.moderatedAt).toLocaleString() : "—" }, { key: "moderator", label: "Moderator", children: question.moderatedByPrincipalId ?? "—" }]} /></Paper>
    <Paper><PaperHeader title={`Answers (${question.answers.totalCount})`} actions={<Button size="small" onClick={() => onEdit("answers")}>Edit</Button>} />{question.answers.edges.length ? <List dataSource={question.answers.edges.map((edge) => edge.node)} renderItem={(answer) => <List.Item><List.Item.Meta title={<Flex gap={6}><Typography.Text strong>{answer.author.displayName}</Typography.Text>{answer.isOfficial ? <Tag color="blue">Official</Tag> : null}{answer.isAccepted ? <Tag color="green">Accepted</Tag> : null}<Tag>{answer.status.toLowerCase()}</Tag></Flex>} description={<Flex vertical><span>{answer.body}</span><Typography.Text type="secondary">{answer.metrics.likeCount} likes · {answer.metrics.reportCount} reports</Typography.Text></Flex>} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No answers" />}</Paper>
    <Paper><PaperHeader title={`Subscriptions (${question.subscriptions.totalCount})`} />{question.subscriptions.edges.length ? <List dataSource={question.subscriptions.edges.map((edge) => edge.node)} renderItem={(item) => <List.Item><List.Item.Meta title={item.subscriberCustomer?.displayName ?? "Anonymous subscriber"} description={`${item.channel.toLowerCase()} · ${item.locale} · last notified ${item.lastNotifiedAt ? new Date(item.lastNotifiedAt).toLocaleString() : "never"}`} />{onUpdateSubscription ? <Select size="small" value={item.status} style={{ width: 140 }} options={Object.values(ProductQuestionSubscriptionStatus).map((status) => ({ value: status, label: status.toLowerCase() }))} onChange={(status) => void onUpdateSubscription(item.id, item.updatedAt, status)} /> : <Tag>{item.status.toLowerCase()}</Tag>}</List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No subscriptions" />}</Paper>
    <ContentDetailsSections content={question} onCreateCase={onCreateCase} onRestoreRevision={onRestoreRevision} onManageExternalReferences={onManageExternalReferences} />
  </Flex>;
}
