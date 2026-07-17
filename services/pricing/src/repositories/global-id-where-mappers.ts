import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

function createGlobalIdWhereFieldMapper(
  entity: GlobalIdType,
): WhereFieldMapper {
  return (value) => {
    if (typeof value !== "string") return value;

    try {
      return decodeGlobalIdByType(value, entity);
    } catch {
      return value;
    }
  };
}

export const mapGraphqlBigInt: WhereFieldMapper = (value) =>
  typeof value === "string" ? BigInt(value) : value;

export const decodeDiscountGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Discount,
);
export const decodeDiscountCodeGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.DiscountCode,
);
export const decodeDiscountUsageReservationGlobalId =
  createGlobalIdWhereFieldMapper(GlobalIdEntity.DiscountUsageReservation);
export const decodeDiscountRedemptionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.DiscountRedemption,
);
export const decodeDiscountExternalReferenceGlobalId =
  createGlobalIdWhereFieldMapper(GlobalIdEntity.DiscountExternalReference);
export const decodeCustomerGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Customer,
);
export const decodeCustomerSegmentGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerSegment,
);
export const decodeCheckoutGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Checkout,
);
export const decodeOrderGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.Order,
);
