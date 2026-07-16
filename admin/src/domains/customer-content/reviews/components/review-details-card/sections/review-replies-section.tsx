"use client";

import { useState } from "react";
import { Button, Flex, Tag, Typography } from "antd";
import type { ApiReview, ApiReviewReply } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useReviewDetailsStyles } from "../review-details-card.styles";
import { formatReviewDateTime, humanizeEnum } from "../review-details-card.utils";

function ReplyRow({ reply }: { reply: ApiReviewReply }) {
  const { styles, cx } = useReviewDetailsStyles();
  const [expanded, setExpanded] = useState(false);
  const canExpand = reply.body.length > 240;
  return (
    <div className={styles.replyRow}>
      <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap">
        <Flex gap={8} align="center" wrap="wrap">
          <Typography.Text strong>{reply.author.displayName || "Anonymous"}</Typography.Text>
          <Tag color={reply.isOfficial ? "blue" : undefined}>{reply.isOfficial ? "Official" : humanizeEnum(reply.author.type)}</Tag>
          <Tag color={reply.status === "PUBLISHED" ? "green" : reply.status === "REJECTED" ? "red" : "gold"}>
            {humanizeEnum(reply.status)}
          </Tag>
        </Flex>
        <Typography.Text type="secondary">{formatReviewDateTime(reply.createdAt)}</Typography.Text>
      </Flex>
      <Typography.Paragraph className={cx(!expanded && canExpand && styles.replyBodyCollapsed)} style={{ margin: "8px 0 0" }}>
        {reply.body}
      </Typography.Paragraph>
      {canExpand ? <Button type="link" style={{ padding: 0 }} onClick={() => setExpanded((current) => !current)}>{expanded ? "Show less" : "Show more"}</Button> : null}
      <Typography.Text type="secondary">
        {reply.metrics.likeCount} helpful · {reply.metrics.reportCount} {reply.metrics.reportCount === 1 ? "report" : "reports"}
      </Typography.Text>
    </div>
  );
}

export function ReviewRepliesSection({ review }: { review: ApiReview }) {
  const [showAll, setShowAll] = useState(false);
  const replies = review.replies.edges.map((edge) => edge.node);
  const visibleReplies = showAll ? replies : replies.slice(0, 5);
  return (
    <Paper data-testid="review-replies-section">
      <PaperHeader title={`Replies (${review.replies.totalCount})`} />
      {visibleReplies.length ? visibleReplies.map((reply) => <ReplyRow key={reply.id} reply={reply} />) : (
        <EntityDetailsEmptyState state={{ title: "No replies yet", description: "No customer or official replies have been added." }} />
      )}
      {replies.length > 5 ? (
        <Flex justify="center" style={{ marginTop: 12 }}>
          <Button onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show fewer replies" : `Show all replies (${review.replies.totalCount})`}
          </Button>
        </Flex>
      ) : null}
    </Paper>
  );
}
