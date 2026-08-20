import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

function createGlobalIdWhereFieldMapper(entity: GlobalIdType): WhereFieldMapper {
  return (value) => {
    if (typeof value !== "string") return value;

    try {
      return decodeGlobalIdByType(value, entity);
    } catch {
      return value;
    }
  };
}

export const mapGraphQlBigInt: WhereFieldMapper = (value) =>
  typeof value === "string" ? BigInt(value) : value;

export const decodeCustomerGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Customer);
export const decodeCustomerAddressGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerAddress,
);
export const decodeCustomerTaxIdentifierGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerTaxIdentifier,
);
export const decodeCustomerTaxExemptionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerTaxExemption,
);
export const decodeCustomerConsentGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerConsent,
);
export const decodeCustomerConsentEventGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerConsentEvent,
);
export const decodeCustomerGroupGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerGroup,
);
export const decodeCustomerGroupMembershipGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerGroupMembership,
);
export const decodeCustomerTagGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.CustomerTag);
export const decodeCustomerTagAssignmentGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerTagAssignment,
);
export const decodeCustomerSegmentGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerSegment,
);
export const decodeCustomerSegmentMembershipGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerSegmentMembership,
);
export const decodeCustomerMonetaryStatisticsGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerMonetaryStatistics,
);
export const decodeCustomerMergeGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerMerge,
);
export const decodeCustomerDataRequestGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.CustomerDataRequest,
);
