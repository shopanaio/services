import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";

export function productReference(id: string) {
  return {
    __typename: "Product" as const,
    id: encodeGlobalIdByType(id, GlobalIdEntity.Product),
  };
}

export function variantReference(id: string | null) {
  return id
    ? {
        __typename: "Variant" as const,
        id: encodeGlobalIdByType(id, GlobalIdEntity.Variant),
      }
    : null;
}

export function categoryReference(id: string) {
  return {
    __typename: "Category" as const,
    id: encodeGlobalIdByType(id, GlobalIdEntity.Category),
  };
}

export function customerReference(id: string | null) {
  return id
    ? {
        __typename: "Customer" as const,
        id: encodeGlobalIdByType(id, GlobalIdEntity.Customer),
      }
    : null;
}

export function fileReference(id: string) {
  return {
    __typename: "File" as const,
    id: encodeGlobalIdByType(id, GlobalIdEntity.File),
  };
}
