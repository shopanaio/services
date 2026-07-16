"use client";

import { Alert, App, Button, Flex, Skeleton } from "antd";
import type { ApiReviewContentExternalReference } from "@/graphql/types";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useProductModal } from "@/domains/inventory/products/modals";
import { ReviewDetailsCard } from "../../components/review-details-card";
import { useReview } from "../../hooks";
import {
  useReviewEditModal,
  useReviewTechnicalMetadataModal,
  type ReviewModalPayload,
} from "../../modals";
import { useContentActions } from "../../../shared/hooks";
import { useExternalReferenceModal } from "../../../management/modals";

export function ReviewModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as ReviewModalPayload;
  const query = useReview(value.entityId);
  const actions = useContentActions();
  const { push: openEdit } = useReviewEditModal();
  const { push: openTechnicalMetadata } = useReviewTechnicalMetadataModal();
  const { push: openExternalReference } = useExternalReferenceModal();
  const { push: openProduct } = useProductModal();
  const review = query.review;

  const refresh = async () => {
    await query.refetch();
    await value.onSaved?.();
  };

  const handleDelete = async () => {
    if (!review) return;
    const result = await actions.deleteReview({ id: review.id, expectedRevision: review.revision });
    if (!result.id || result.errors.length) throw new Error(result.errors.map((item) => item.message).join(" ") || "Unable to delete review");
    await value.onSaved?.();
    message.success("Review deleted");
    forcePop();
  };

  const handleRedact = async () => {
    if (!review) return;
    const result = await actions.redact(review.id, review.revision);
    if (!result.content || result.errors.length) throw new Error(result.errors.map((item) => item.message).join(" ") || "Unable to redact review");
    await refresh();
    message.success("Review redacted");
  };

  const editExternalReference = (reference?: ApiReviewContentExternalReference) => {
    if (!review) return;
    openExternalReference({
      contentId: review.id,
      contentLabel: review.title || review.body,
      externalReference: reference,
      onSaved: refresh,
    });
  };

  return (
    <ModalLayout name="review-details" headerProps={{ title: "Review details", onClose: pop, submitButtonProps: null }}>
      {query.loading && !review ? (
        <Flex vertical gap={12}>
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 5 }} />
        </Flex>
      ) : null}
      {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}
      {actions.error ? <Alert type="error" showIcon message={actions.error.message} /> : null}
      {!query.loading && !query.error && !review ? (
        <Alert
          type="error"
          showIcon
          message="Review not found"
          description="It may have been deleted or is no longer available."
          action={<Button onClick={forcePop}>Close</Button>}
        />
      ) : null}
      {review && !query.error ? (
        <ReviewDetailsCard
          review={review}
          onEdit={(section) => openEdit({ entityId: review.id, section, onSaved: refresh })}
          onDelete={handleDelete}
          onRedact={handleRedact}
          onOpenTechnicalMetadata={() => openTechnicalMetadata({ entityId: review.id })}
          onOpenProduct={() => openProduct({ entityId: review.product.id })}
          onOpenMediaItem={(item) => openEdit({ entityId: review.id, section: "media", initialMediaFileId: item.file.id, onSaved: refresh })}
          onAddExternalReference={() => editExternalReference()}
          onEditExternalReference={editExternalReference}
        />
      ) : null}
    </ModalLayout>
  );
}
