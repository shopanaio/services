"use client";

import { Alert, Descriptions, Skeleton, Typography } from "antd";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useReview } from "../../hooks";
import type { ReviewModalPayload } from "../../modals";
import { humanizeEnum } from "../../components/review-details-card/review-details-card.utils";
import { useReviewDetailsStyles } from "../../components/review-details-card/review-details-card.styles";

function hasMetadata(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value as object).length);
}

export function ReviewTechnicalMetadataModal() {
  const { styles } = useReviewDetailsStyles();
  const { payload, pop } = useModalStackContext();
  const value = payload as ReviewModalPayload;
  const query = useReview(value.entityId);
  const review = query.review;
  return (
    <ModalLayout name="review-technical-metadata" headerProps={{ title: "Technical metadata", onClose: pop, submitButtonProps: null }}>
      {query.loading && !review ? <Skeleton active paragraph={{ rows: 5 }} /> : null}
      {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}
      {!query.loading && !review ? <Alert type="error" showIcon message="Review not found" /> : null}
      {review ? (
        <Paper>
          <PaperHeader title="Source audit data" />
          <Descriptions
            column={1}
            items={[
              {
                key: "principal",
                label: "Principal ID",
                children: review.author.principalId ? <CopyableChip value={review.author.principalId} mono /> : <Typography.Text>—</Typography.Text>,
              },
              {
                key: "idempotency",
                label: "Idempotency key",
                children: review.idempotencyKey ? <CopyableChip value={review.idempotencyKey} mono /> : <Typography.Text>—</Typography.Text>,
              },
              { key: "source", label: "Source", children: humanizeEnum(review.sourceChannel) },
            ]}
          />
          {hasMetadata(review.sourceMetadata) ? (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>Source metadata</Typography.Text>
              <pre className={styles.technicalCode} style={{ marginTop: 8 }}>
                {JSON.stringify(review.sourceMetadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </Paper>
      ) : null}
    </ModalLayout>
  );
}
