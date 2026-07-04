"use client";

import { Select } from "antd";
import type { ApiListingOrderByInput } from "@/graphql/types";
import { ListingSortBy, ListingSortDirection } from "@/graphql/types";
import type { ListingPreviewSortOption } from "./types";

export const LISTING_PREVIEW_SORT_OPTIONS: ListingPreviewSortOption[] = [
  { key: "manual", label: "Manual", orderBy: { by: ListingSortBy.Manual } },
  {
    key: "relevance",
    label: "Relevance",
    orderBy: { by: ListingSortBy.Relevance },
  },
  {
    key: "newest-desc",
    label: "Newest first",
    orderBy: { by: ListingSortBy.Newest, direction: ListingSortDirection.Desc },
  },
  {
    key: "name-asc",
    label: "Name A to Z",
    orderBy: { by: ListingSortBy.Name, direction: ListingSortDirection.Asc },
  },
  {
    key: "name-desc",
    label: "Name Z to A",
    orderBy: { by: ListingSortBy.Name, direction: ListingSortDirection.Desc },
  },
  {
    key: "price-asc",
    label: "Price low to high",
    orderBy: { by: ListingSortBy.Price, direction: ListingSortDirection.Asc },
  },
  {
    key: "price-desc",
    label: "Price high to low",
    orderBy: { by: ListingSortBy.Price, direction: ListingSortDirection.Desc },
  },
];

const serializeOrderBy = (value: ApiListingOrderByInput) =>
  `${value.by}:${value.direction ?? ""}`;

export const getListingPreviewSortKey = (value: ApiListingOrderByInput) => {
  const serialized = serializeOrderBy(value);
  return (
    LISTING_PREVIEW_SORT_OPTIONS.find(
      (option) => serializeOrderBy(option.orderBy) === serialized,
    )?.key ?? "manual"
  );
};

interface ListingPreviewSortProps {
  value: ApiListingOrderByInput;
  onChange: (orderBy: ApiListingOrderByInput) => void;
}

export const ListingPreviewSort = ({
  value,
  onChange,
}: ListingPreviewSortProps) => (
  <Select
    aria-label="Sort products"
    value={getListingPreviewSortKey(value)}
    style={{ minWidth: 176 }}
    data-testid="category-listing-preview-sort"
    options={LISTING_PREVIEW_SORT_OPTIONS.map((option) => ({
      value: option.key,
      label: option.label,
    }))}
    onChange={(key) => {
      const option = LISTING_PREVIEW_SORT_OPTIONS.find((item) => item.key === key);
      if (option) {
        onChange(option.orderBy);
      }
    }}
  />
);
