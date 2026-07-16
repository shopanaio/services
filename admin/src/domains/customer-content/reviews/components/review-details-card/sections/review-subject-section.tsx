"use client";

import { Button, Flex, Typography } from "antd";
import { LuExternalLink as ExportOutlined, LuShoppingBag as ShoppingOutlined } from "react-icons/lu";
import type { ApiReview } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewEditSection } from "../../../modals";
import { useReviewDetailsStyles } from "../review-details-card.styles";

interface ReviewSubjectSectionProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
  onOpenProduct: () => void;
}

export function ReviewSubjectSection({ review, onEdit, onOpenProduct }: ReviewSubjectSectionProps) {
  const { styles } = useReviewDetailsStyles();
  return (
    <Paper data-testid="review-subject-section">
      <PaperHeader
        title="Product & purchase"
        actions={<EditAction onEdit={() => onEdit("subject")} label="Edit product & purchase" testId="review-subject-actions" />}
      />
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" className={styles.subjectSummary}>
        <Flex gap={12} align="center">
          <div className={styles.subjectIcon}><ShoppingOutlined /></div>
          <Flex vertical gap={2}>
            <Typography.Text strong>{review.product.title}</Typography.Text>
            <Typography.Text type="secondary">
              Variant: {review.variant?.title ?? "No variant selected"}
            </Typography.Text>
          </Flex>
        </Flex>
        <Button icon={<ExportOutlined />} onClick={onOpenProduct}>Open product</Button>
      </Flex>
      <div className={styles.orderGrid}>
        <Flex vertical gap={6}>
          <Typography.Text type="secondary">Order ID</Typography.Text>
          {review.orderId ? <CopyableChip value={review.orderId} displayValue={review.orderId} mono /> : <Typography.Text>—</Typography.Text>}
        </Flex>
        <Flex vertical gap={6}>
          <Typography.Text type="secondary">Order line ID</Typography.Text>
          {review.orderLineId ? <CopyableChip value={review.orderLineId} displayValue={review.orderLineId} mono /> : <Typography.Text>—</Typography.Text>}
        </Flex>
      </div>
      <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0" }}>
        Purchase evidence is linked to this review but is not displayed publicly.
      </Typography.Paragraph>
    </Paper>
  );
}
