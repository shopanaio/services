"use client";

import { Flex, Tag, Typography } from "antd";
import { LuImage as PictureOutlined } from "react-icons/lu";
import type { CategoryListingPreviewItem } from "../../graphql/operation-types";
import { useListingPreviewStyles } from "./listing-preview-modal.styles";

const getFirstImage = (item: CategoryListingPreviewItem) =>
  [...item.media].sort((a, b) => a.sortIndex - b.sortIndex)[0]?.file ?? null;

const formatMinorAmount = (amount: string | number, currency: string) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return null;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(numericAmount / 100);
};

const formatPrice = (item: CategoryListingPreviewItem) => {
  const priceRange = item.priceRange;

  if (!priceRange) {
    return "No price";
  }

  const min = formatMinorAmount(priceRange.minPriceAmount, priceRange.currency);
  const max = formatMinorAmount(priceRange.maxPriceAmount, priceRange.currency);

  if (!min || !max) {
    return "No price";
  }

  return min === max ? min : `${min} - ${max}`;
};

interface ListingPreviewProductCardProps {
  item: CategoryListingPreviewItem;
}

export const ListingPreviewProductCard = ({ item }: ListingPreviewProductCardProps) => {
  const { styles } = useListingPreviewStyles();
  const image = getFirstImage(item);

  return (
    <article
      className={styles.card}
      data-testid={`category-listing-preview-product-card-${item.handle || item.id}`}
    >
      <div className={styles.imageWrap}>
        {image?.url ? (
          <img
            className={styles.image}
            src={image.url}
            alt={image.altText ?? item.title}
            loading="lazy"
          />
        ) : (
          <PictureOutlined style={{ fontSize: 28 }} />
        )}
      </div>
      <div className={styles.cardBody}>
        <Typography.Text strong className={styles.productTitle}>
          {item.title}
        </Typography.Text>
        <Typography.Text>{formatPrice(item)}</Typography.Text>
        <Flex gap={6} wrap="wrap">
          <Tag>Unknown availability</Tag>
          {!item.isPublished && <Tag color="gold">Draft</Tag>}
        </Flex>
      </div>
    </article>
  );
};
