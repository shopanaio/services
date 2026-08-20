import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { DiscountTarget } from "../../repositories/models/index.js";

export function customerReference(customerId: string) {
  return {
    __typename: "Customer" as const,
    id: encodeGlobalIdByType(customerId, GlobalIdEntity.Customer),
  };
}

export function catalogTargetReference(target: Pick<DiscountTarget, "targetId" | "targetType">) {
  switch (target.targetType) {
    case "PRODUCTS":
      return {
        __typename: "Product" as const,
        id: encodeGlobalIdByType(target.targetId, GlobalIdEntity.Product),
      };
    case "VARIANTS":
      return {
        __typename: "Variant" as const,
        id: encodeGlobalIdByType(target.targetId, GlobalIdEntity.Variant),
      };
    case "CATEGORIES":
      return {
        __typename: "Category" as const,
        id: encodeGlobalIdByType(target.targetId, GlobalIdEntity.Category),
      };
    case "ALL_PRODUCTS":
      return null;
  }
}

export function encodeCatalogTargetId(
  target: Pick<DiscountTarget, "targetId" | "targetType">,
): string {
  const reference = catalogTargetReference(target);
  return reference?.id ?? target.targetId;
}

export function toGraphqlBigInt(value: bigint): string;
export function toGraphqlBigInt(value: bigint | null): string | null;
export function toGraphqlBigInt(value: bigint | null): string | null {
  return value === null ? null : String(value);
}
