"use client";

import { useState } from "react";
import { Button, Divider, Dropdown, Flex, Rate, Tag, Tooltip, Typography } from "antd";
import {
  LuCheck as CheckOutlined,
  LuEllipsis as MoreOutlined,
  LuLink as LinkOutlined,
  LuShieldCheck as SafetyCertificateOutlined,
} from "react-icons/lu";
import type { ApiReview } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewEditSection } from "../../modals";
import { useReviewDetailsStyles } from "./review-details-card.styles";
import { formatReviewDate, humanizeEnum, reviewStatusConfig } from "./review-details-card.utils";

interface ReviewInfoHeaderProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
  onOpenTechnicalMetadata: () => void;
  onRedact: () => void;
  onDelete: () => void;
}

export function ReviewInfoHeader({
  review,
  onEdit,
  onOpenTechnicalMetadata,
  onRedact,
  onDelete,
}: ReviewInfoHeaderProps) {
  const { styles } = useReviewDetailsStyles();
  const [linkCopied, setLinkCopied] = useState(false);
  const status = reviewStatusConfig[review.status];
  const authorName = review.author.displayName || "Anonymous reviewer";
  const audit = [
    `Created ${formatReviewDate(review.createdAt)}`,
    review.updatedAt ? `Updated ${formatReviewDate(review.updatedAt)}` : null,
    humanizeEnum(review.sourceChannel),
  ]
    .filter(Boolean)
    .join(" · ");

  const copyAdminUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  };

  return (
    <Paper data-testid="review-info-header">
      <PaperHeader
        title={
          <Flex align="center" gap={8} wrap="wrap" className={styles.headerMeta}>
            <Tooltip title={status.hint}>
              <Tag
                color={status.color}
                icon={status.icon}
                className={styles.statusTag}
                data-testid="review-detail-status"
              >
                {status.label}
              </Tag>
            </Tooltip>
            <Typography.Text type="secondary" className={styles.auditText}>
              {audit}
            </Typography.Text>
          </Flex>
        }
        actions={
          <Flex gap={8} align="center">
            <Tooltip title={linkCopied ? "Copied" : "Copy Admin URL"}>
              <Button
                size="small"
                type="text"
                icon={linkCopied ? <CheckOutlined /> : <LinkOutlined />}
                aria-label="Copy current Admin URL"
                className={styles.actionButton}
                onClick={() => void copyAdminUrl()}
              />
            </Tooltip>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "content",
                    label: "Edit review content",
                    "data-testid": "review-header-edit-content",
                    onClick: () => onEdit("content"),
                  },
                  {
                    key: "reviewer",
                    label: "Edit reviewer",
                    "data-testid": "review-header-edit-reviewer",
                    onClick: () => onEdit("reviewer"),
                  },
                  {
                    key: "subject",
                    label: "Edit product & purchase",
                    "data-testid": "review-header-edit-subject",
                    onClick: () => onEdit("subject"),
                  },
                  {
                    key: "ratings",
                    label: "Edit ratings",
                    "data-testid": "review-header-edit-ratings",
                    onClick: () => onEdit("ratings"),
                  },
                  { type: "divider" as const },
                  {
                    key: "moderation",
                    label: "Review moderation",
                    "data-testid": "review-header-edit-moderation",
                    onClick: () => onEdit("moderation"),
                  },
                  {
                    key: "verification",
                    label: "Edit purchase verification",
                    "data-testid": "review-header-edit-verification",
                    onClick: () => onEdit("verification"),
                  },
                  {
                    key: "incentive",
                    label: "Edit incentive disclosure",
                    "data-testid": "review-header-edit-incentive",
                    onClick: () => onEdit("incentive"),
                  },
                  {
                    key: "technical",
                    label: "View technical metadata",
                    "data-testid": "review-header-technical",
                    onClick: onOpenTechnicalMetadata,
                  },
                  { type: "divider" as const },
                  {
                    key: "redact",
                    label: "Redact personal content",
                    danger: true,
                    "data-testid": "review-header-redact",
                    onClick: onRedact,
                  },
                  {
                    key: "delete",
                    label: "Delete review",
                    danger: true,
                    "data-testid": "review-header-delete",
                    onClick: onDelete,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<MoreOutlined />}
                aria-label="Review actions"
                data-testid="review-header-actions"
              />
            </Dropdown>
          </Flex>
        }
      />

      <Flex vertical gap={8}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: review.title || "Untitled review" }}
          className={styles.reviewTitle}
          data-testid="review-detail-title"
        >
          {review.title || "Untitled review"}
        </Typography.Title>
        <Flex align="center" gap={12} wrap="wrap" className={styles.ratingLine}>
          <Rate disabled value={review.rating} aria-label={`${review.rating} out of 5`} />
          <Typography.Text strong>{review.rating} / 5</Typography.Text>
        </Flex>
        <Flex align="center" gap={8} wrap="wrap">
          <Typography.Text type="secondary">By</Typography.Text>
          <Typography.Text strong>{authorName}</Typography.Text>
          <Tag>{humanizeEnum(review.author.type)}</Tag>
          {review.isVerifiedPurchase ? (
            <Tag color="green" icon={<SafetyCertificateOutlined />}>
              Verified purchase
            </Tag>
          ) : null}
        </Flex>
        <CopyableChip
          label="ID"
          value={review.id}
          displayValue={review.id.slice(0, 8)}
          mono
          data-testid="review-detail-id"
        />
      </Flex>

      <Divider className={styles.divider} />

      <div className={styles.kpiGrid}>
        <KPITile label="Helpful" value={review.metrics.likeCount} tooltip="Helpful votes" />
        <KPITile label="Unhelpful" value={review.metrics.dislikeCount} tooltip="Unhelpful votes" />
        <KPITile
          label="Open reports"
          value={review.metrics.openReportCount}
          variant={review.metrics.openReportCount ? "warning" : "default"}
        />
        <KPITile label="Replies" value={review.replies.totalCount} />
      </div>
    </Paper>
  );
}
