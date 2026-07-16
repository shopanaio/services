"use client";

import { App, Flex } from "antd";
import type { ApiReview, ApiReviewContentExternalReference, ApiReviewMedia } from "@/graphql/types";
import type { ReviewEditSection } from "../../modals";
import { ReviewInfoHeader } from "./review-info-header";
import {
  ReviewContentSection,
  ReviewExternalReferencesSection,
  ReviewMediaSection,
  ReviewModerationSection,
  ReviewRatingsSection,
  ReviewRepliesSection,
  ReviewSubjectSection,
} from "./sections";

interface ReviewDetailsCardProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
  onDelete: () => Promise<void> | void;
  onRedact: () => Promise<void> | void;
  onOpenTechnicalMetadata: () => void;
  onOpenProduct: () => void;
  onOpenMediaItem: (item: ApiReviewMedia) => void;
  onAddExternalReference: () => void;
  onEditExternalReference: (reference: ApiReviewContentExternalReference) => void;
}

export function ReviewDetailsCard({
  review,
  onEdit,
  onDelete,
  onRedact,
  onOpenTechnicalMetadata,
  onOpenProduct,
  onOpenMediaItem,
  onAddExternalReference,
  onEditExternalReference,
}: ReviewDetailsCardProps) {
  const { modal } = App.useApp();

  const confirmRedact = () => {
    modal.confirm({
      title: "Redact personal content?",
      content: "Personal author data and redactable review content will be irreversibly replaced. This action cannot be undone.",
      okText: "Redact",
      okButtonProps: { danger: true },
      onOk: onRedact,
    });
  };

  const confirmDelete = () => {
    modal.confirm({
      title: "Delete review?",
      content: "The review will be archived with a soft delete and removed from active review surfaces.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: onDelete,
    });
  };

  return (
    <Flex vertical gap={12} style={{ width: "100%" }} data-testid="review-details-card">
      <ReviewInfoHeader
        review={review}
        onEdit={onEdit}
        onOpenTechnicalMetadata={onOpenTechnicalMetadata}
        onRedact={confirmRedact}
        onDelete={confirmDelete}
      />
      <ReviewContentSection review={review} onEdit={onEdit} />
      <ReviewModerationSection review={review} onEdit={onEdit} />
      <ReviewSubjectSection review={review} onEdit={onEdit} onOpenProduct={onOpenProduct} />
      <ReviewRatingsSection review={review} onEdit={onEdit} />
      <ReviewMediaSection review={review} onEdit={onEdit} onOpenItem={onOpenMediaItem} />
      <ReviewRepliesSection review={review} />
      <ReviewExternalReferencesSection review={review} onAdd={onAddExternalReference} onEdit={onEditExternalReference} />
    </Flex>
  );
}
