import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Repository } from "../../repositories/Repository.js";
import type {
  ListingNodeReference,
  ProductKind,
} from "./ListingQueryTypes.js";

export async function loadProductKindMap(
  repository: Repository,
  productIds: readonly string[]
): Promise<Map<string, ProductKind>> {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await repository.productListingIndex.getByProductIds(uniqueIds);
  return new Map(rows.map((row) => [row.productId, row.kind as ProductKind]));
}

export function toListingNodeReference(
  productId: string,
  kind: ProductKind | undefined
): ListingNodeReference {
  return {
    __typename: kind === "BUNDLE" ? "Bundle" : "Product",
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
