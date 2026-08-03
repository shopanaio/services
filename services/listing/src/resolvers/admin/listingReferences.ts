import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ListingNodeReference } from "./ListingQueryTypes.js";

export function toListingNodeReference(
  productId: string
): ListingNodeReference {
  return {
    __typename: "Product",
    id: encodeGlobalIdByType(productId, GlobalIdEntity.Product),
  };
}

export function toFacetSwatchReference(swatchId: string | null | undefined) {
  if (!swatchId) return null;

  return {
    __typename: "FacetSwatch" as const,
    id: encodeGlobalIdByType(swatchId, GlobalIdEntity.FacetSwatch),
  };
}
