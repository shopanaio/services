import { FacetType } from "@/graphql/types";

export const FACET_SOURCE_HANDLE_LABELS: Partial<
  Record<FacetType, Record<string, string>>
> = {
  [FacetType.Price]: {
    price: "Price",
  },
  [FacetType.InStock]: {
    availability: "Availability",
  },
  [FacetType.Tag]: {
    tags: "Tags",
  },
};

export const FACET_TYPE_LABELS: Record<FacetType, string> = {
  [FacetType.Price]: "Price",
  [FacetType.InStock]: "Availability",
  [FacetType.Tag]: "Tags",
  [FacetType.Option]: "Options",
  [FacetType.Feature]: "Features",
};

export function getFacetTypeLabel(facetType: FacetType): string {
  return FACET_TYPE_LABELS[facetType];
}

export function getFacetSourceHandleLabel(
  facetType: FacetType,
  handle: string,
): string | null {
  return FACET_SOURCE_HANDLE_LABELS[facetType]?.[handle] ?? null;
}
