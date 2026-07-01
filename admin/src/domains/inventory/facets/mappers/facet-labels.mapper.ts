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
    tags: "Product Tags",
  },
};

export const FACET_TYPE_LABELS: Record<FacetType, string> = {
  [FacetType.Price]: "Standard",
  [FacetType.InStock]: "Standard",
  [FacetType.Tag]: "Standard",
  [FacetType.Option]: "Product Option",
  [FacetType.Feature]: "Product Feature",
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
