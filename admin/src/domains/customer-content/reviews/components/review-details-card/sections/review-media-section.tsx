"use client";

import { Flex, Typography } from "antd";
import { LuInfo as InfoCircleOutlined, LuImage as PictureOutlined } from "react-icons/lu";
import type { ApiFile, ApiReview, ApiReviewMedia } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { MediaSection } from "@/domains/inventory/products/components/product-details-card/sections";
import type { ReviewEditSection } from "../../../modals";
import { useReviewDetailsStyles } from "../review-details-card.styles";
import { MediaStatusBadge } from "../review-details-card.utils";

interface ReviewMediaSectionProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
  onOpenItem: (item: ApiReviewMedia) => void;
}

export function ReviewMediaSection({ review, onEdit, onOpenItem }: ReviewMediaSectionProps) {
  const { styles } = useReviewDetailsStyles();
  const metadataByFileId = new Map(review.media.map((item) => [item.file.id, item]));
  const openFile = (file: ApiFile) => {
    const item = metadataByFileId.get(file.id);
    if (item) onOpenItem(item);
  };

  return (
    <MediaSection
      mediaFiles={review.media.map((item) => item.file)}
      onEdit={() => onEdit("media")}
      onOpenItem={openFile}
      renderItemBadge={(file) => {
        const item = metadataByFileId.get(file.id);
        return item ? <MediaStatusBadge status={item.status} /> : null;
      }}
      title={`Customer media (${review.media.length})`}
      editLabel="Edit customer media"
      hasFeatured={false}
      testIdPrefix="review-media"
      emptyState={(
        <EntityDetailsEmptyState
          icon={<PictureOutlined />}
          state={{ title: "No customer media", description: "This review has no attached photos or videos." }}
        />
      )}
      footer={review.media.length ? (
        <Flex gap={8} align="center" className={styles.mediaFooter}>
          <InfoCircleOutlined />
          <Typography.Text type="secondary">Select an item to preview or moderate it.</Typography.Text>
        </Flex>
      ) : null}
    />
  );
}
