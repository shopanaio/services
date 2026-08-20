"use client";

import { useMemo, useState } from "react";
import { Button, Flex, Tag, Typography } from "antd";
import { LuShieldCheck as SafetyCertificateOutlined } from "react-icons/lu";
import type { ApiReview, ApiReviewContentReport } from "@/graphql/types";
import { ReviewContentReportStatus, ReviewVerificationStatus } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewEditSection } from "../../../modals";
import { useReviewDetailsStyles } from "../review-details-card.styles";
import {
  formatReviewDateTime,
  humanizeEnum,
  ReviewStatusStrip,
} from "../review-details-card.utils";

interface ReviewModerationSectionProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
}

const reportStatusColor: Record<ReviewContentReportStatus, string | undefined> = {
  [ReviewContentReportStatus.Open]: "red",
  [ReviewContentReportStatus.UnderReview]: "gold",
  [ReviewContentReportStatus.Actioned]: "green",
  [ReviewContentReportStatus.Dismissed]: undefined,
};

const openStatuses = new Set<ReviewContentReportStatus>([
  ReviewContentReportStatus.Open,
  ReviewContentReportStatus.UnderReview,
]);

function compareReports(a: ApiReviewContentReport, b: ApiReviewContentReport) {
  const group = Number(openStatuses.has(a.status)) - Number(openStatuses.has(b.status));
  if (group !== 0) return -group;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function ReportRow({ report }: { report: ApiReviewContentReport }) {
  const { styles } = useReviewDetailsStyles();
  const reporter = report.reporterCustomer;
  return (
    <div className={styles.reportRow}>
      <Flex vertical gap={4}>
        <Flex gap={8} align="center" wrap="wrap">
          <Tag color={reportStatusColor[report.status]}>
            {humanizeEnum(report.status).toUpperCase()}
          </Tag>
          <Typography.Text strong>{humanizeEnum(report.reason)}</Typography.Text>
        </Flex>
        <Typography.Text type="secondary">
          {reporter
            ? `${reporter.displayName}${reporter.email ? ` · ${reporter.email}` : ""}`
            : "Anonymous reporter"}
        </Typography.Text>
        {report.details ? <Typography.Text>“{report.details}”</Typography.Text> : null}
      </Flex>
      <Typography.Text type="secondary">{formatReviewDateTime(report.createdAt)}</Typography.Text>
    </div>
  );
}

export function ReviewModerationSection({ review, onEdit }: ReviewModerationSectionProps) {
  const { styles } = useReviewDetailsStyles();
  const [showAll, setShowAll] = useState(false);
  const reports = useMemo(
    () => review.reports.edges.map((edge) => edge.node).sort(compareReports),
    [review.reports.edges],
  );
  const visibleReports = showAll ? reports : reports.slice(0, 3);
  const verificationColor =
    review.verificationStatus === ReviewVerificationStatus.Verified
      ? "green"
      : review.verificationStatus === ReviewVerificationStatus.Revoked
        ? "red"
        : undefined;

  return (
    <Paper data-testid="review-moderation-section">
      <PaperHeader
        title="Moderation"
        actions={
          <EditAction
            onEdit={() => onEdit("moderation")}
            label="Review moderation"
            testId="review-moderation-actions"
            items={[
              {
                key: "moderation",
                label: "Review moderation",
                "data-testid": "review-moderation-edit",
                onClick: () => onEdit("moderation"),
              },
              {
                key: "verification",
                label: "Edit purchase verification",
                "data-testid": "review-verification-edit",
                onClick: () => onEdit("verification"),
              },
            ]}
          />
        }
      />
      <Flex vertical gap="middle">
        <div>
          <Typography.Text type="secondary">Moderation status</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <ReviewStatusStrip status={review.status} />
          </div>
          {review.moderatedAt ? (
            <Typography.Text type="secondary">
              Moderated {formatReviewDateTime(review.moderatedAt)}
              {review.moderatedByPrincipalId ? ` by ${review.moderatedByPrincipalId}` : ""}
            </Typography.Text>
          ) : null}
        </div>
        <div>
          <Typography.Text strong>Internal note</Typography.Text>
          <div className={styles.noteBlock} style={{ marginTop: 8 }}>
            <Typography.Text type={review.moderationNote ? undefined : "secondary"}>
              {review.moderationNote || "No internal note"}
            </Typography.Text>
          </div>
        </div>
        <Flex gap={12} align="center" wrap="wrap" className={styles.verificationRow}>
          <SafetyCertificateOutlined />
          <Typography.Text strong>Purchase verification</Typography.Text>
          <Tag color={verificationColor}>
            {humanizeEnum(review.verificationStatus).toUpperCase()}
          </Tag>
          {review.verificationMethod ? (
            <Typography.Text type="secondary">{review.verificationMethod}</Typography.Text>
          ) : null}
          {review.verifiedAt ? (
            <Typography.Text type="secondary">
              · {formatReviewDateTime(review.verifiedAt)}
            </Typography.Text>
          ) : null}
        </Flex>
        <div>
          <Flex justify="space-between" align="center" gap={12} className={styles.reportsHeader}>
            <Typography.Text strong>Abuse reports</Typography.Text>
            <Typography.Text type="secondary">
              {review.metrics.openReportCount} open / {review.metrics.reportCount} total
            </Typography.Text>
          </Flex>
          {visibleReports.length ? (
            visibleReports.map((report) => <ReportRow key={report.id} report={report} />)
          ) : (
            <EntityDetailsEmptyState
              state={{
                title: "No abuse reports",
                description: "No customers have reported this review.",
              }}
            />
          )}
          {reports.length > 3 ? (
            <Button type="link" onClick={() => setShowAll((current) => !current)}>
              {showAll ? "Show fewer reports" : `Show all reports (${reports.length})`}
            </Button>
          ) : null}
        </div>
      </Flex>
    </Paper>
  );
}
