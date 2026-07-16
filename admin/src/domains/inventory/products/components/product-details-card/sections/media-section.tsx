"use client";

import type { ReactNode } from "react";
import { Image, Flex } from "antd";
import { LuEye as EyeOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { FeaturedBadge } from "@/ui-kit/featured-badge";
import { MediaPreview, useMediaPreview } from "@/domains/media/components/media-preview";
import { EntityMediaEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { EditAction } from "../../edit-action";
import { MediaFilePlaceholder } from "../../media-file-placeholder";
import { useMediaStyles } from "../product-details-card.styles";
import type { ApiFile } from "@/graphql/types";

interface IMediaSectionProps {
  mediaFiles: ApiFile[];
  onEdit: () => void;
  title?: string;
  editLabel?: string;
  hasFeatured?: boolean;
  testIdPrefix?: string;
  renderItemBadge?: (file: ApiFile, index: number) => ReactNode;
  onOpenItem?: (file: ApiFile, index: number) => void;
  footer?: ReactNode;
  emptyState?: ReactNode;
}

export const MediaSection = ({
  mediaFiles,
  onEdit,
  title = "Media",
  editLabel = "Edit media",
  hasFeatured = true,
  testIdPrefix = "product-media",
  renderItemBadge,
  onOpenItem,
  footer,
  emptyState,
}: IMediaSectionProps) => {
  const { styles } = useMediaStyles();
  const mediaPreview = useMediaPreview(mediaFiles);

  const showMore = mediaFiles.length > 12;
  const visibleMediaFiles = mediaFiles.slice(0, showMore ? 11 : 12);
  const overlayItemsCount = visibleMediaFiles.length + (showMore ? 1 : 0) + 1; // +1 for upload cell
  const hasMedia = mediaFiles.length > 0;

  return (
    <Paper>
      <PaperHeader
        title={title}
        actions={
          <EditAction
            onEdit={onEdit}
            label={editLabel}
            testId={`${testIdPrefix}-actions-button`}
          />
        }
      />
      {hasMedia ? (
        <div className={styles.mediaGrid} data-testid={`${testIdPrefix}-section`}>
          {visibleMediaFiles.map((media, index) => {
            const open = () => {
              if (onOpenItem) {
                onOpenItem(media, index);
                return;
              }
              mediaPreview.open(index);
            };
            return (
              <div key={media.id} className={styles.mediaFeaturedWrapper}>
                {media.mimeType?.startsWith("video/") ? (
                  <video
                    src={media.url}
                    aria-label={media.altText || media.originalName || "Video"}
                    className={styles.mediaImage}
                    data-testid={`${testIdPrefix}-item-${media.id}`}
                    muted
                    playsInline
                    preload="metadata"
                    onClick={open}
                  />
                ) : (
                  <Image
                    src={media.url}
                    alt={media.altText || media.originalName || ""}
                    className={styles.mediaImage}
                    data-testid={`${testIdPrefix}-item-${media.id}`}
                    preview={{
                      visible: false,
                      mask: (
                        <Flex gap={4} className={styles.mediaPreview}>
                          <EyeOutlined />
                          Preview
                        </Flex>
                      ),
                    }}
                    onClick={open}
                  />
                )}
                {index === 0 && hasFeatured ? <FeaturedBadge /> : null}
                {renderItemBadge ? (
                  <div className={styles.mediaItemBadge}>
                    {renderItemBadge(media, index)}
                  </div>
                ) : null}
              </div>
            );
          })}
          {showMore && (
            <Flex
              align="center"
              justify="center"
              className={styles.mediaMoreButton}
              onClick={() => mediaPreview.open(11)}
            >
              +{mediaFiles.length - 11}
            </Flex>
          )}
          <div className={styles.uploadCell}>
            <div
              className={styles.uploadArea}
              data-testid={`${testIdPrefix}-upload-area`}
              onClick={onEdit}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onEdit();
                }
              }}
            >
              <PlusOutlined className={styles.uploadIcon} />
            </div>
          </div>
          <div className={styles.mediaOverlay}>
            {Array.from({ length: overlayItemsCount }).map((_, idx) => (
              <div key={`spacer-${idx}`} style={{ aspectRatio: "1/1" }} />
            ))}
            {Array.from({ length: Math.max(0, 13 - overlayItemsCount) }).map((_, idx) => (
              <MediaFilePlaceholder key={`placeholder-${idx}`} />
            ))}
          </div>
        </div>
      ) : (
        <div data-testid={`${testIdPrefix}-section`}>
          {emptyState ?? <EntityMediaEmptyState />}
        </div>
      )}

      {footer}

      <MediaPreview
        items={mediaFiles}
        visible={mediaPreview.visible}
        currentIndex={mediaPreview.currentIndex}
        onClose={mediaPreview.close}
        onIndexChange={mediaPreview.setCurrentIndex}
      />
    </Paper>
  );
};
