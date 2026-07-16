"use client";

import { Button, Flex, Tag, Typography } from "antd";
import { LuExternalLink as ExportOutlined, LuLink as LinkOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import type { ApiReview, ApiReviewContentExternalReference } from "@/graphql/types";
import { ReviewExternalSyncStatus } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useReviewDetailsStyles } from "../review-details-card.styles";
import { formatReviewDateTime, humanizeEnum } from "../review-details-card.utils";

interface ReviewExternalReferencesSectionProps {
  review: ApiReview;
  onAdd: () => void;
  onEdit: (reference: ApiReviewContentExternalReference) => void;
}

const syncColor: Record<ReviewExternalSyncStatus, string | undefined> = {
  [ReviewExternalSyncStatus.Synced]: "green",
  [ReviewExternalSyncStatus.Failed]: "red",
  [ReviewExternalSyncStatus.Pending]: "gold",
  [ReviewExternalSyncStatus.Disabled]: undefined,
};

export function ReviewExternalReferencesSection({ review, onAdd, onEdit }: ReviewExternalReferencesSectionProps) {
  const { styles } = useReviewDetailsStyles();
  const references = review.externalReferences.edges.map((edge) => edge.node);
  return (
    <Paper data-testid="review-external-references-section">
      <PaperHeader
        title={`External references (${review.externalReferences.totalCount})`}
        actions={<Button size="small" icon={<PlusOutlined />} onClick={onAdd}>Add</Button>}
      />
      {references.length ? references.map((reference) => (
        <div key={reference.id} className={styles.externalRow}>
          <Tag color={syncColor[reference.syncStatus]}>{humanizeEnum(reference.syncStatus).toUpperCase()}</Tag>
          <Flex vertical gap={4}>
            <Typography.Text strong>
              {reference.externalSystem} · {reference.externalType} · {reference.externalId}
            </Typography.Text>
            <Flex gap={8} align="center" wrap="wrap">
              <Typography.Text type="secondary">
                {reference.syncStatus === ReviewExternalSyncStatus.Failed ? "Sync failed" : "Last synced"} {formatReviewDateTime(reference.lastSyncedAt ?? reference.updatedAt)}
              </Typography.Text>
              {reference.externalUrl ? (
                <Typography.Link href={reference.externalUrl} target="_blank" rel="noreferrer">
                  Open external link <ExportOutlined aria-label="Opens in a new tab" />
                </Typography.Link>
              ) : null}
            </Flex>
            {reference.lastError ? <Typography.Text type="danger">{reference.lastError}</Typography.Text> : null}
          </Flex>
          <EditAction onEdit={() => onEdit(reference)} label="Edit external reference" testId={`review-external-${reference.id}`} />
        </div>
      )) : (
        <EntityDetailsEmptyState
          icon={<LinkOutlined />}
          state={{ title: "No external references", description: "Connect this review to an external review system." }}
        />
      )}
      {!references.length ? <Button type="link" icon={<PlusOutlined />} onClick={onAdd}>Add external reference</Button> : null}
    </Paper>
  );
}
