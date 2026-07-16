"use client";

import { Button, Descriptions, Empty, Flex, List, Statistic, Tag, Timeline, Typography } from "antd";
import { LuHistory as HistoryOutlined, LuBadgeCheck as SafetyCertificateOutlined, LuShare2 as ShareAltOutlined, LuUsers as TeamOutlined } from "react-icons/lu";
import type { ApiReviewContent } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";

interface ContentDetailsSectionsProps {
  content: ApiReviewContent;
  onCreateCase?: () => void;
  onRestoreRevision?: (revision: number) => void;
  onManageExternalReferences?: () => void;
}

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export function ContentDetailsSections({
  content,
  onCreateCase,
  onRestoreRevision,
  onManageExternalReferences,
}: ContentDetailsSectionsProps) {
  const reports = content.reports.edges.map((edge) => edge.node);
  const cases = content.moderationCases.edges.map((edge) => edge.node);
  const events = content.moderationEvents.edges.map((edge) => edge.node);
  const revisions = content.revisions.edges.map((edge) => edge.node);
  const signals = content.moderationSignals.edges.map((edge) => edge.node);
  const references = content.externalReferences.edges.map((edge) => edge.node);

  return (
    <>
      <Paper>
        <PaperHeader title="Author & source" icon={<TeamOutlined />} />
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: "author", label: "Author", children: content.author.displayName },
          { key: "author-type", label: "Author type", children: content.author.type.toLowerCase() },
          { key: "email", label: "Email", children: content.author.email ?? "—" },
          { key: "customer", label: "Customer", children: content.author.customer?.id ? <Typography.Text copyable>{content.author.customer.id}</Typography.Text> : "—" },
          { key: "principal", label: "Principal", children: content.author.principalId ?? "—" },
          { key: "source", label: "Source", children: content.sourceChannel },
          { key: "idempotency", label: "Idempotency key", children: content.idempotencyKey ? <Typography.Text copyable>{content.idempotencyKey}</Typography.Text> : "—" },
        ]} />
        {Object.keys(content.sourceMetadata).length ? <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{pretty(content.sourceMetadata)}</pre> : null}
      </Paper>

      <Paper>
        <PaperHeader title="Distribution" icon={<ShareAltOutlined />} />
        <Typography.Title level={5}>Translations ({content.translations.length})</Typography.Title>
        {content.translations.length ? <List size="small" dataSource={content.translations} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.locale} · ${item.source.toLowerCase()}`} description={item.body} /><Tag>{item.status.toLowerCase()}</Tag></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No translations" />}
        <Typography.Title level={5} style={{ marginTop: 20 }}>Publications ({content.publications.length})</Typography.Title>
        {content.publications.length ? <List size="small" dataSource={content.publications} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.channel}${item.locale ? ` · ${item.locale}` : ""}`} description={item.lastError ?? `Scheduled ${formatDate(item.scheduledAt)}`} /><Tag>{item.status.toLowerCase()}</Tag></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No publication destinations" />}
      </Paper>

      <Paper>
        <PaperHeader title="Engagement & reports" />
        <Flex gap="large" wrap="wrap">
          <Statistic title="Likes" value={content.metrics.likeCount} />
          <Statistic title="Dislikes" value={content.metrics.dislikeCount} />
          <Statistic title="Reports" value={content.metrics.reportCount} />
          <Statistic title="Open reports" value={content.metrics.openReportCount} />
        </Flex>
        {reports.length ? <List style={{ marginTop: 16 }} dataSource={reports} renderItem={(report) => <List.Item><List.Item.Meta title={<Flex gap={6}><Tag color="red">{report.reason.toLowerCase().replaceAll("_", " ")}</Tag><span>{report.reporterCustomer?.displayName ?? "Anonymous"}</span></Flex>} description={report.details ?? report.resolutionNote ?? "No details"} /><Tag>{report.status.toLowerCase().replaceAll("_", " ")}</Tag></List.Item>} /> : null}
      </Paper>

      <Paper>
        <PaperHeader title={`Moderation cases (${content.moderationCases.totalCount})`} icon={<SafetyCertificateOutlined />} actions={onCreateCase ? <Button size="small" onClick={onCreateCase}>Create case</Button> : undefined} />
        {cases.length ? <List dataSource={cases} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.reasonCode} · priority ${item.priority}`} description={`Due ${formatDate(item.dueAt)}${item.resolutionNote ? ` · ${item.resolutionNote}` : ""}`} /><Tag>{item.status.toLowerCase().replaceAll("_", " ")}</Tag></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No moderation cases" />}
        {signals.length ? <><Typography.Title level={5} style={{ marginTop: 20 }}>Automated signals</Typography.Title><List size="small" dataSource={signals} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.provider} · ${item.signalType}`} description={`Score ${item.score ?? "—"} · model ${item.modelVersion ?? "—"}`} /><Tag>{item.verdict.toLowerCase()}</Tag></List.Item>} /></> : null}
      </Paper>

      <Paper>
        <PaperHeader title="Moderation timeline" icon={<HistoryOutlined />} />
        {events.length ? <Timeline items={events.map((item) => ({ children: <Flex vertical><Typography.Text strong>{item.action.toLowerCase().replaceAll("_", " ")}</Typography.Text><Typography.Text type="secondary">{formatDate(item.createdAt)} · {item.actorType}{item.note ? ` · ${item.note}` : ""}</Typography.Text></Flex> }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No moderation events" />}
      </Paper>

      <Paper>
        <PaperHeader title={`Revisions (${content.revisions.totalCount})`} />
        {revisions.length ? <List dataSource={revisions} renderItem={(item) => <List.Item actions={onRestoreRevision && item.revision !== content.revision ? [<Button key="restore" size="small" onClick={() => onRestoreRevision(item.revision)}>Restore</Button>] : undefined}><List.Item.Meta title={`Revision ${item.revision}`} description={`${formatDate(item.createdAt)} · ${item.changedByType}${item.changeReason ? ` · ${item.changeReason}` : ""}`} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No revision snapshots" />}
      </Paper>

      <Paper>
        <PaperHeader title={`External references (${content.externalReferences.totalCount})`} actions={onManageExternalReferences ? <Button size="small" onClick={onManageExternalReferences}>Manage</Button> : undefined} />
        {references.length ? <List dataSource={references} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.externalSystem} · ${item.externalType} · ${item.externalId}`} description={item.lastError ?? item.externalUrl ?? `Last synced ${formatDate(item.lastSyncedAt)}`} /><Tag>{item.syncStatus.toLowerCase()}</Tag></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No external references" />}
      </Paper>

      <Paper>
        <PaperHeader title="Lifecycle & audit" />
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: "id", label: "Content ID", children: <Typography.Text copyable>{content.id}</Typography.Text> },
          { key: "kind", label: "Kind", children: content.kind.toLowerCase().replaceAll("_", " ") },
          { key: "revision", label: "Revision", children: content.revision },
          { key: "created", label: "Created", children: formatDate(content.createdAt) },
          { key: "updated", label: "Updated", children: formatDate(content.updatedAt) },
          { key: "published", label: "Published", children: formatDate(content.publishedAt) },
          { key: "unpublished", label: "Unpublished", children: formatDate(content.unpublishedAt) },
          { key: "deleted", label: "Deleted", children: formatDate(content.deletedAt) },
          { key: "redacted", label: "Redacted", children: formatDate(content.redactedAt) },
        ]} />
      </Paper>
    </>
  );
}
