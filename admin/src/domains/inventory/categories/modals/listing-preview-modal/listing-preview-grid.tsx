"use client";

import { Empty, Skeleton } from "antd";
import type { CategoryListingPreviewItem } from "../../graphql/operation-types";
import { useListingPreviewStyles } from "./listing-preview-modal.styles";
import { ListingPreviewProductCard } from "./listing-preview-product-card";

interface ListingPreviewGridProps {
  items: CategoryListingPreviewItem[];
  loading: boolean;
  hasInitialData: boolean;
}

export const ListingPreviewGrid = ({ items, loading, hasInitialData }: ListingPreviewGridProps) => {
  const { styles } = useListingPreviewStyles();

  if (loading && !hasInitialData) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton.Node key={index} active style={{ width: "100%", height: 220 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty
        description={
          <>
            <div>No products match this preview</div>
            <div>Try removing filters or changing the sort.</div>
          </>
        }
      />
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <ListingPreviewProductCard key={item.id} item={item} />
      ))}
    </div>
  );
};
