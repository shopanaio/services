"use client";

import { Typography, Rate, Progress, Flex } from "antd";
import { StarFilled } from "@ant-design/icons";
import { Paper } from "../../paper";
import { PaperHeader } from "../../paper-header";
import { EditAction } from "../../edit-action";
import { useReviewsStyles } from "../product-details-card.styles";
import type { IReviewBreakdown } from "../types";

interface IReviewsSectionProps {
  rating: number;
  reviewsCount: number;
  breakdown: IReviewBreakdown[];
  onEdit: () => void;
}

export const ReviewsSection = ({
  rating,
  reviewsCount,
  breakdown,
  onEdit,
}: IReviewsSectionProps) => {
  const { styles } = useReviewsStyles();

  return (
    <Paper>
      <PaperHeader
        title="Reviews"
        actions={<EditAction onEdit={onEdit} label="Edit reviews" />}
      />
      <div className={styles.reviewsGrid}>
        {/* Left side - Average rating */}
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
            defaultValue={rating}
            className={styles.reviewsRate}
          />
          <Typography.Text type="secondary" className={styles.reviewsCount}>
            {reviewsCount} reviews
          </Typography.Text>
        </Flex>

        {/* Right side - Rating breakdown */}
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
                percent={item.percent}
                showInfo={false}
                strokeWidth={4}
                strokeColor="#1677ff"
                trailColor="var(--ant-color-fill-tertiary)"
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
    </Paper>
  );
};

// Default mock data for reviews
export const defaultReviewsData = {
  rating: 4.2,
  reviewsCount: 128,
  breakdown: [
    { stars: 5, count: 89, percent: 70 },
    { stars: 4, count: 24, percent: 19 },
    { stars: 3, count: 8, percent: 6 },
    { stars: 2, count: 4, percent: 3 },
    { stars: 1, count: 3, percent: 2 },
  ],
};
