"use client";

import { Image, Flex } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { FeaturedBadge } from "@/ui-kit/featured-badge";
import { MediaPreview, useMediaPreview } from "@/domains/media/components/media-preview";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { MediaFilePlaceholder } from "@/domains/inventory/products/components/media-file-placeholder";
import { useMediaStyles } from "../category-details-card.styles";
import type { ApiFile } from "@/graphql/types";

interface IMediaSectionProps {
  gallery: ApiFile[];
  onEdit: () => void;
}

export const MediaSection = ({ gallery, onEdit }: IMediaSectionProps) => {
  const { styles } = useMediaStyles();
  const mediaPreview = useMediaPreview(gallery);

  const showMore = gallery.length > 12;
  const gallerySlice = gallery.slice(0, showMore ? 11 : 12);
  const overlayItemsCount = gallerySlice.length + (showMore ? 1 : 0) + 1;

  return (
    <Paper>
      <PaperHeader
        title="Media"
        actions={<EditAction onEdit={onEdit} label="Edit media" />}
      />
      <div className={styles.mediaGrid}>
        {gallerySlice.map((media, index) =>
          index === 0 ? (
            <div key={media.id} className={styles.mediaFeaturedWrapper}>
              <Image
                src={media.url}
                alt={media.altText || media.originalName || ""}
                className={styles.mediaImage}
                preview={{
                  visible: false,
                  mask: (
                    <Flex gap={4} className={styles.mediaPreview}>
                      <EyeOutlined />
                      Preview
                    </Flex>
                  ),
                }}
                onClick={() => mediaPreview.open(index)}
              />
              <FeaturedBadge />
            </div>
          ) : (
            <Image
              key={media.id}
              src={media.url}
              alt={media.altText || media.originalName || ""}
              className={styles.mediaImage}
              preview={{
                visible: false,
                mask: (
                  <Flex gap={4} className={styles.mediaPreview}>
                    <EyeOutlined />
                    Preview
                  </Flex>
                ),
              }}
              onClick={() => mediaPreview.open(index)}
            />
          )
        )}
        {showMore && (
          <Flex
            align="center"
            justify="center"
            className={styles.mediaMoreButton}
            onClick={() => mediaPreview.open(11)}
          >
            +{gallery.length - 11}
          </Flex>
        )}
        <div className={styles.uploadCell}>
          <div
            className={styles.uploadArea}
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

      <MediaPreview
        items={gallery}
        visible={mediaPreview.visible}
        currentIndex={mediaPreview.currentIndex}
        onClose={mediaPreview.close}
        onIndexChange={mediaPreview.setCurrentIndex}
      />
    </Paper>
  );
};
