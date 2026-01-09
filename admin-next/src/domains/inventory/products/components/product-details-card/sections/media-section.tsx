"use client";

import { Image, Flex } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { FeaturedBadge } from "@/ui-kit/featured-badge";
import { EditAction } from "../../edit-action";
import { MediaFilePlaceholder } from "../../media-file-placeholder";
import { useMediaStyles } from "../product-details-card.styles";
import type { IMediaFile } from "../../../mocks/types";

interface IMediaSectionProps {
  gallery: IMediaFile[];
  onEdit: () => void;
}

export const MediaSection = ({ gallery, onEdit }: IMediaSectionProps) => {
  const { styles } = useMediaStyles();

  const showMore = gallery.length > 13;
  const gallerySlice = gallery.slice(0, showMore ? 12 : 13);
  const overlayItemsCount = gallerySlice.length + (showMore ? 1 : 0);

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
                alt={media.name || ""}
                className={styles.mediaImage}
                preview={{
                  mask: (
                    <Flex gap={4} className={styles.mediaPreview}>
                      <EyeOutlined />
                      Preview
                    </Flex>
                  ),
                }}
              />
              <FeaturedBadge />
            </div>
          ) : (
            <Image
              key={media.id}
              src={media.url}
              alt={media.name || ""}
              className={styles.mediaImage}
              preview={{
                mask: (
                  <Flex gap={4} className={styles.mediaPreview}>
                    <EyeOutlined />
                    Preview
                  </Flex>
                ),
              }}
            />
          )
        )}
        {showMore && (
          <Flex
            align="center"
            justify="center"
            className={styles.mediaMoreButton}
          >
            +{gallery.length - 12}
          </Flex>
        )}
        <div className={styles.mediaOverlay}>
          {Array.from({ length: overlayItemsCount }).map((_, idx) => (
            <div key={`spacer-${idx}`} style={{ aspectRatio: "1/1" }} />
          ))}
          {Array.from({ length: 13 - gallerySlice.length }).map((_, idx) => (
            <MediaFilePlaceholder key={`placeholder-${idx}`} />
          ))}
        </div>
      </div>
    </Paper>
  );
};
