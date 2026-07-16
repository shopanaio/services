"use client";

import { Alert, App, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { ReviewDetailsCard } from "../../components/review-details-card";
import { useReview } from "../../hooks";
import { useReviewEditModal, type ReviewModalPayload } from "../../modals";
import { useContentActions } from "../../../shared/hooks";
import { useExternalReferenceModal, useModerationCaseModal } from "../../../management/modals";

export function ReviewModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as ReviewModalPayload;
  const query = useReview(value.entityId);
  const actions = useContentActions();
  const { push: openEdit } = useReviewEditModal();
  const { push: openCase } = useModerationCaseModal();
  const { push: openExternalReference } = useExternalReferenceModal();
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

  const handleRestore = async (revision: number) => {
    if (!review) return;
    const result = await actions.restoreRevision(review.id, revision, review.revision);
    if (!result.content || result.errors.length) return message.error(result.errors.map((item) => item.message).join(" ") || "Unable to restore revision");
    await refresh();
    message.success(`Revision ${revision} restored`);
  };

  return (
    <ModalLayout name="review-details" headerProps={{ title: review?.title || "Review details", onClose: pop, submitButtonProps: null }}>
      {query.loading && !review ? <Skeleton active paragraph={{ rows: 14 }} /> : null}
      {query.error || actions.error ? <Alert type="error" showIcon message={(query.error ?? actions.error)?.message} /> : null}
      {!query.loading && !review ? <Alert type="error" showIcon message="Review not found" /> : null}
      {review ? <ReviewDetailsCard review={review} onEdit={(section) => openEdit({ entityId: review.id, section, onSaved: refresh })} onDelete={handleDelete} onRedact={handleRedact} onRestoreRevision={handleRestore} onCreateCase={() => openCase({ contentId: review.id, onSaved: refresh })} onManageExternalReferences={() => openExternalReference({ contentId: review.id, onSaved: refresh })} /> : null}
    </ModalLayout>
  );
}
