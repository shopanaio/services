import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ProductReference } from "./ListingQueryTypes.js";

export function toProductReference(productId: string): ProductReference {
  return {
    __typename: "Product",
    id: encodeGlobalIdByType(productId, GlobalIdEntity.Product),
  };
}
