import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Repository } from "../../repositories/Repository.js";
import type {
  ListingNodeReference,
  ProductEntityType,
} from "./ListingQueryTypes.js";

export async function loadProductEntityTypeMap(
  repository: Repository,
  productIds: readonly string[]
): Promise<Map<string, ProductEntityType>> {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await repository.productListingIndex.getByProductIds(uniqueIds);
  return new Map(
    rows.map((row) => [row.productId, row.entityType as ProductEntityType])
  );
}

export function toListingNodeReference(
  productId: string,
  entityType: ProductEntityType | undefined
): ListingNodeReference {
  return {
    __typename: entityType === "bundle" ? "Bundle" : "Product",
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
