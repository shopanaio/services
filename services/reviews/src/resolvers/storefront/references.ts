import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

export const productReference = (id: string) => ({
  __typename: "Product" as const,
  id: encodeGlobalIdByType(id, GlobalIdEntity.Product),
});
export const variantReference = (id: string | null) => id ? ({
  __typename: "ProductVariant" as const,
  id: encodeGlobalIdByType(id, GlobalIdEntity.ProductVariant),
}) : null;
export const categoryReference = (id: string) => ({
  __typename: "Category" as const,
  id: encodeGlobalIdByType(id, GlobalIdEntity.Category),
});
export const customerReference = (id: string | null) => id ? ({
  __typename: "Customer" as const,
  id: encodeGlobalIdByType(id, GlobalIdEntity.Customer),
}) : null;
export const mediaReference = (id: string) => ({
  __typename: "MediaImage" as const,
  id: encodeGlobalIdByType(id, GlobalIdEntity.File),
});
