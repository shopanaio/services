import type { ApiProduct } from "@/graphql/types";

export type ProductStatus = "archived" | "draft" | "published";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  archived: "Archived",
  draft: "Draft",
  published: "Published",
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  archived: "error",
  draft: "default",
  published: "success",
};

export const PRODUCT_STATUS_HINTS: Record<ProductStatus, string | null> = {
  archived: "Product is archived",
  draft: "Not visible on storefront",
  published: null,
};

export const PRODUCT_STATUS_OPTIONS: Array<{
  label: string;
  value: ProductStatus;
}> = [
  { label: PRODUCT_STATUS_LABELS.published, value: "published" },
  { label: PRODUCT_STATUS_LABELS.draft, value: "draft" },
  { label: PRODUCT_STATUS_LABELS.archived, value: "archived" },
];

export const getProductStatus = (product: ApiProduct): ProductStatus => {
  if (product.deletedAt) {
    return "archived";
  }

  return product.isPublished ? "published" : "draft";
};

export const getProductStatusLabel = (product: ApiProduct): string =>
  PRODUCT_STATUS_LABELS[getProductStatus(product)];

export const getProductStatusColor = (product: ApiProduct): string =>
  PRODUCT_STATUS_COLORS[getProductStatus(product)];

export const getProductStatusHint = (product: ApiProduct): string | null =>
  PRODUCT_STATUS_HINTS[getProductStatus(product)];

export const isProductPublished = (product: ApiProduct): boolean =>
  getProductStatus(product) === "published";

export const isProductArchived = (product: ApiProduct): boolean =>
  getProductStatus(product) === "archived";
