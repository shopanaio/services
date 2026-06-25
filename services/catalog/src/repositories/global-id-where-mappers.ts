import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

function decodeGlobalIdOrReturnValue(
  id: unknown,
  entity: GlobalIdType
): unknown {
  if (typeof id !== "string") {
    return id;
  }

  try {
    return decodeGlobalIdByType(id, entity);
  } catch {
    return id;
  }
}

function createGlobalIdWhereFieldMapper(
  entity: GlobalIdType
): WhereFieldMapper {
  return (value) => decodeGlobalIdOrReturnValue(value, entity);
}

export const decodeProductGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Product
);

export const decodeInventoryItemGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.InventoryItem
);

export const decodeCategoryGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Category
);

export const decodeTagGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Tag
);

export const decodeVendorGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Vendor
);

export const decodeVariantGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Variant
);

export const decodeWarehouseGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Warehouse
);
