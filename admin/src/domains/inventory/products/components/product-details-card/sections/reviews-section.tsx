"use client";

import { Flex, Progress, Rate, Skeleton, Typography } from "antd";
import { LuStar as StarFilled } from "react-icons/lu";
import type { ApiProductReviewSummary } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useReviewsStyles } from "../product-details-card.styles";

interface ReviewsSectionProps {
  summary: ApiProductReviewSummary | null;
  loading?: boolean;
  error?: Error | null;
  onEdit?: () => void;
}

export const ReviewsSection = ({
  summary,
  loading = false,
  error = null,
  onEdit,
}: ReviewsSectionProps) => {
  const { styles } = useReviewsStyles();
  const reviewCount = summary?.reviewCount ?? 0;
  const rating = summary?.averageRating ?? 0;
  const breakdown = summary
    ? [
        { stars: 5, count: summary.ratingBreakdown.rating5Count },
        { stars: 4, count: summary.ratingBreakdown.rating4Count },
        { stars: 3, count: summary.ratingBreakdown.rating3Count },
        { stars: 2, count: summary.ratingBreakdown.rating2Count },
        { stars: 1, count: summary.ratingBreakdown.rating1Count },
      ]
    : [];

  return (
    <Paper>
      <PaperHeader
        title="Reviews"
        actions={onEdit ? <EditAction onEdit={onEdit} label="Edit reviews" /> : undefined}
      />
      {loading && !summary ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : error && !summary ? (
        <Typography.Text type="danger">{error.message}</Typography.Text>
      ) : (
        <div className={styles.reviewsGrid}>
          <Flex
            vertical
            align="center"
            justify="center"
            className={styles.reviewsLeft}
          >
            <Typography.Text className={styles.reviewsAverage}>
              {rating.toFixed(1)}
            </Typography.Text>
            <Rate
              disabled
              allowHalf
              value={rating}
              className={styles.reviewsRate}
            />
            <Typography.Text type="secondary" className={styles.reviewsCount}>
              {reviewCount} reviews
            </Typography.Text>
          </Flex>

          <Flex vertical gap={4}>
            {breakdown.map((item) => (
              <Flex
                key={item.stars}
                align="center"
                gap={8}
                className={styles.reviewBarRow}
              >
                <Flex align="center" gap={4} style={{ minWidth: 28 }}>
                  <span>{item.stars}</span>
                  <StarFilled className={styles.reviewStarIcon} />
                </Flex>
                <Progress
                  percent={reviewCount > 0 ? (item.count / reviewCount) * 100 : 0}
                  showInfo={false}
                  strokeWidth={4}
                  railColor="var(--ant-color-fill-tertiary)"
                  size="small"
                  className={styles.reviewProgress}
                />
                <Typography.Text
                  type="secondary"
                  className={styles.reviewCountText}
                >
                  {item.count}
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        </div>
      )}
    </Paper>
  );
};
