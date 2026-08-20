"use client";

import { Button, Descriptions, Empty, Flex, List, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  LuFlag as FlagOutlined,
  LuThumbsDown as DislikeOutlined,
  LuThumbsUp as LikeOutlined,
  LuUsers as TeamOutlined,
} from "react-icons/lu";
import type { ApiReviewContent } from "@/graphql/types";
import { ReviewContentReportReason } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";

const useStyles = createStyles(({ token }) => ({
  engagementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: token.paddingSM,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  engagementMetric: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  metricIcon: { color: token.colorTextSecondary, fontSize: 18 },
  metricValue: { margin: "0 !important" },
  reportsList: {
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  reportRow: {
    padding: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
  },
}));

interface ContentDetailsSectionsProps {
  content: ApiReviewContent;
  onManageExternalReferences?: () => void;
}

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const reportReasonCopy: Record<ReviewContentReportReason, string> = {
  [ReviewContentReportReason.ConflictOfInterest]: "Conflict of interest",
  [ReviewContentReportReason.FraudOrScam]: "Fraud or scam",
  [ReviewContentReportReason.Harassment]: "Harassment",
  [ReviewContentReportReason.HateSpeech]: "Hate speech",
  [ReviewContentReportReason.IllegalContent]: "Illegal content",
  [ReviewContentReportReason.IntellectualProperty]: "Intellectual property",
  [ReviewContentReportReason.NotRelevant]: "Not relevant to product",
  [ReviewContentReportReason.Offensive]: "Offensive content",
  [ReviewContentReportReason.Other]: "Other",
  [ReviewContentReportReason.PersonalInformation]: "Personal information",
  [ReviewContentReportReason.Spam]: "Spam or promotion",
};
const reportDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ContentDetailsSections({
  content,
  onManageExternalReferences,
}: ContentDetailsSectionsProps) {
  const { styles } = useStyles();
  const reports = content.reports.edges.map((edge) => edge.node);
  const references = content.externalReferences.edges.map((edge) => edge.node);

  return (
    <>
      <Paper>
        <PaperHeader title="Author & source" icon={<TeamOutlined />} />
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            { key: "author", label: "Author", children: content.author.displayName },
            {
              key: "author-type",
              label: "Author type",
              children: content.author.type.toLowerCase(),
            },
            { key: "email", label: "Email", children: content.author.email ?? "—" },
            {
              key: "customer",
              label: "Customer",
              children: content.author.customer?.id ? (
                <Typography.Text copyable>{content.author.customer.id}</Typography.Text>
              ) : (
                "—"
              ),
            },
            { key: "principal", label: "Principal", children: content.author.principalId ?? "—" },
            { key: "source", label: "Source", children: content.sourceChannel },
            {
              key: "idempotency",
              label: "Idempotency key",
              children: content.idempotencyKey ? (
                <Typography.Text copyable>{content.idempotencyKey}</Typography.Text>
              ) : (
                "—"
              ),
            },
          ]}
        />
        {Object.keys(content.sourceMetadata).length ? (
          <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
            {pretty(content.sourceMetadata)}
          </pre>
        ) : null}
      </Paper>

      <Paper>
        <PaperHeader title="Engagement & abuse reports" />
        <Flex vertical gap="middle">
          <div className={styles.engagementGrid}>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <LikeOutlined className={styles.metricIcon} />
                <Typography.Text strong>Likes</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {content.metrics.likeCount}
              </Typography.Title>
              <Typography.Text type="secondary">
                Customers who found the review helpful.
              </Typography.Text>
            </Flex>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <DislikeOutlined className={styles.metricIcon} />
                <Typography.Text strong>Dislikes</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {content.metrics.dislikeCount}
              </Typography.Title>
              <Typography.Text type="secondary">
                Customers who found the review unhelpful.
              </Typography.Text>
            </Flex>
            <Flex vertical gap={4} className={styles.engagementMetric}>
              <Flex align="center" gap="small">
                <FlagOutlined className={styles.metricIcon} />
                <Typography.Text strong>Abuse reports</Typography.Text>
              </Flex>
              <Typography.Title level={4} className={styles.metricValue}>
                {content.metrics.reportCount}
              </Typography.Title>
              <Typography.Text type="secondary">
                Customers who asked to inspect this review.
              </Typography.Text>
            </Flex>
          </div>

          {reports.length > 0 ? (
            <div className={styles.reportsList}>
              {reports.map((report) => (
                <Flex vertical gap={4} className={styles.reportRow} key={report.id}>
                  <Flex align="center" justify="space-between" gap="small" wrap>
                    <Flex align="center" gap="small" wrap>
                      <Tag color="red">{reportReasonCopy[report.reason]}</Tag>
                      <Typography.Text>
                        {report.reporterCustomer?.displayName ?? "Anonymous reporter"}
                      </Typography.Text>
                      {report.reporterCustomer?.email ? (
                        <Typography.Text type="secondary">
                          {report.reporterCustomer.email}
                        </Typography.Text>
                      ) : null}
                    </Flex>
                    <Typography.Text type="secondary">
                      {reportDateFormatter.format(new Date(report.createdAt))}
                    </Typography.Text>
                  </Flex>
                  {report.details ? <Typography.Text>{report.details}</Typography.Text> : null}
                </Flex>
              ))}
            </div>
          ) : (
            <Typography.Text type="secondary">
              No abuse reports were submitted for this review.
            </Typography.Text>
          )}
        </Flex>
      </Paper>

      <Paper>
        <PaperHeader
          title={`External references (${content.externalReferences.totalCount})`}
          actions={
            onManageExternalReferences ? (
              <Button size="small" onClick={onManageExternalReferences}>
                Manage
              </Button>
            ) : undefined
          }
        />
        {references.length ? (
          <List
            dataSource={references}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`${item.externalSystem} · ${item.externalType} · ${item.externalId}`}
                  description={
                    item.lastError ??
                    item.externalUrl ??
                    `Last synced ${formatDate(item.lastSyncedAt)}`
                  }
                />
                <Tag>{item.syncStatus.toLowerCase()}</Tag>
              </List.Item>
            )}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No external references" />
        )}
      </Paper>
    </>
  );
}
