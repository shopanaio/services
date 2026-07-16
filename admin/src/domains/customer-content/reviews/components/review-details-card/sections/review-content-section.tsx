"use client";

import { Flex, Tag, Typography } from "antd";
import { LuGift as GiftOutlined, LuLanguages as GlobalOutlined } from "react-icons/lu";
import type { ApiReview } from "@/graphql/types";
import { shopLocalesRecord } from "@/defs/localization";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ReviewEditSection } from "../../../modals";
import { useReviewDetailsStyles } from "../review-details-card.styles";

interface ReviewContentSectionProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
}

export function ReviewContentSection({ review, onEdit }: ReviewContentSectionProps) {
  const { styles } = useReviewDetailsStyles();
  const localeName = shopLocalesRecord[review.locale]?.name ?? review.locale;
  const menuItems = [
    { key: "content", label: "Edit review content", "data-testid": "review-content-edit", onClick: () => onEdit("content") },
    ...(review.isIncentivized
      ? [{ key: "incentive", label: "Edit incentive disclosure", "data-testid": "review-incentive-edit", onClick: () => onEdit("incentive") }]
      : []),
  ];

  return (
    <Paper data-testid="review-content-section">
      <PaperHeader
        title="Review content"
        actions={<EditAction onEdit={() => onEdit("content")} label="Edit review content" items={menuItems} testId="review-content-actions" />}
      />
      <Typography.Paragraph className={styles.reviewBody}>
        {review.body}
      </Typography.Paragraph>
      {review.isIncentivized ? (
        <Flex gap={12} align="flex-start" className={styles.disclosure}>
          <GiftOutlined className={styles.disclosureIcon} />
          <Flex vertical gap={2}>
            <Flex gap={8} align="center" wrap="wrap">
              <Typography.Text type="secondary">Incentive disclosure</Typography.Text>
              <Tag color="blue">DISCLOSED</Tag>
            </Flex>
            <Typography.Text>{review.incentiveDisclosure}</Typography.Text>
          </Flex>
        </Flex>
      ) : null}
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" className={styles.sectionMeta}>
        <Flex gap={8} align="center">
          <GlobalOutlined />
          <Typography.Text type="secondary">{localeName} ({review.locale})</Typography.Text>
        </Flex>
        <Typography.Text type="secondary">{review.body.length} characters</Typography.Text>
      </Flex>
    </Paper>
  );
}
