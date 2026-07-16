"use client";

import { Button, Flex, Rate, Tag, Typography } from "antd";
import { LuPencil as EditOutlined } from "react-icons/lu";
import type { ApiReview } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewEditSection } from "../../../modals";
import { useReviewDetailsStyles } from "../review-details-card.styles";

interface ReviewRatingsSectionProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
}

export function ReviewRatingsSection({ review, onEdit }: ReviewRatingsSectionProps) {
  const { styles, cx } = useReviewDetailsStyles();
  return (
    <Paper data-testid="review-ratings-section">
      <PaperHeader
        title="Review rating"
        extra={<Typography.Text type="secondary">Submitted by the reviewer</Typography.Text>}
        actions={<Button size="small" icon={<EditOutlined />} onClick={() => onEdit("ratings")}>Edit</Button>}
      />
      <div className={styles.ratingsGrid}>
        <Flex vertical align="center" justify="center" gap={8} className={styles.overallRating}>
          <Typography.Text strong>Overall rating</Typography.Text>
          <span className={styles.overallValue}>{review.rating.toFixed(1)}</span>
          <Rate disabled value={review.rating} aria-label={`${review.rating} out of 5`} />
          <Typography.Text type="secondary">{review.rating} out of 5</Typography.Text>
        </Flex>
        <div className={styles.criteriaPanel}>
          <Flex justify="space-between" align="flex-start" gap={8} className={styles.criteriaHeader}>
            <Flex vertical gap={2}>
              <Typography.Text strong style={{ fontSize: 16 }}>Criteria breakdown</Typography.Text>
              <Typography.Text type="secondary">Individual scores for this review</Typography.Text>
            </Flex>
            {review.ratings.length ? <Tag>{review.ratings.length} criteria</Tag> : null}
          </Flex>
          {review.ratings.length ? review.ratings.map((item) => (
            <div key={item.criterion.id} className={styles.criterionRow}>
              <Typography.Text>{item.criterion.defaultTitle}</Typography.Text>
              <div className={styles.criterionScale} aria-label={`${item.value} out of 5`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index} className={cx(styles.criterionSegment, index < item.value && styles.criterionSegmentActive)} />
                ))}
              </div>
              <Typography.Text strong>{item.value.toFixed(1)}</Typography.Text>
            </div>
          )) : (
            <EntityDetailsEmptyState state={{ title: "No criterion ratings", description: "No criterion scores were submitted." }} />
          )}
        </div>
      </div>
    </Paper>
  );
}
