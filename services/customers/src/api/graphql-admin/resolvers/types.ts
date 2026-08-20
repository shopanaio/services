import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import { createIsoDateTimeScalar } from "../../graphql/scalars.js";
import type { ServiceContext } from "../../../context/types.js";
import { CustomerAddressResolver } from "../../../resolvers/admin/CustomerAddressResolver.js";
import { CustomerConsentEventResolver } from "../../../resolvers/admin/CustomerConsentEventResolver.js";
import { CustomerConsentResolver } from "../../../resolvers/admin/CustomerConsentResolver.js";
import {
  CustomerComparisonItemResolver,
  CustomerComparisonResolver,
} from "../../../resolvers/admin/CustomerComparisonResolver.js";
import { CustomerDataRequestResolver } from "../../../resolvers/admin/CustomerDataRequestResolver.js";
import { CustomerExternalReferenceResolver } from "../../../resolvers/admin/CustomerExternalReferenceResolver.js";
import { CustomerGroupMembershipResolver } from "../../../resolvers/admin/CustomerGroupMembershipResolver.js";
import { CustomerGroupResolver } from "../../../resolvers/admin/CustomerGroupResolver.js";
import { CustomerMergeResolver } from "../../../resolvers/admin/CustomerMergeResolver.js";
import { CustomerMonetaryStatisticsResolver } from "../../../resolvers/admin/CustomerMonetaryStatisticsResolver.js";
import { CustomerResolver } from "../../../resolvers/admin/CustomerResolver.js";
import { CustomerSegmentMembershipResolver } from "../../../resolvers/admin/CustomerSegmentMembershipResolver.js";
import { CustomerSegmentResolver } from "../../../resolvers/admin/CustomerSegmentResolver.js";
import { CustomerTagAssignmentResolver } from "../../../resolvers/admin/CustomerTagAssignmentResolver.js";
import { CustomerTagResolver } from "../../../resolvers/admin/CustomerTagResolver.js";
import { CustomerTaxExemptionResolver } from "../../../resolvers/admin/CustomerTaxExemptionResolver.js";
import { CustomerTaxIdentifierResolver } from "../../../resolvers/admin/CustomerTaxIdentifierResolver.js";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  DateTime: createIsoDateTimeScalar("DateTime"),

  Node: {
    __resolveType: (obj: unknown) => {
      const explicitTypeName =
        typeof obj === "object" && obj !== null
          ? (obj as { __typename?: unknown }).__typename
          : undefined;
      if (typeof explicitTypeName === "string" && isNodeTypeName(explicitTypeName)) {
        return explicitTypeName;
      }
      if (obj instanceof CustomerResolver) return "Customer";
      if (obj instanceof CustomerAddressResolver) return "CustomerAddress";
      if (obj instanceof CustomerTaxIdentifierResolver) {
        return "CustomerTaxIdentifier";
      }
      if (obj instanceof CustomerTaxExemptionResolver) {
        return "CustomerTaxExemption";
      }
      if (obj instanceof CustomerConsentResolver) return "CustomerConsent";
      if (obj instanceof CustomerComparisonResolver) {
        return "CustomerComparison";
      }
      if (obj instanceof CustomerComparisonItemResolver) {
        return "CustomerComparisonItem";
      }
      if (obj instanceof CustomerConsentEventResolver) {
        return "CustomerConsentEvent";
      }
      if (obj instanceof CustomerGroupResolver) return "CustomerGroup";
      if (obj instanceof CustomerGroupMembershipResolver) {
        return "CustomerGroupMembership";
      }
      if (obj instanceof CustomerTagResolver) return "CustomerTag";
      if (obj instanceof CustomerTagAssignmentResolver) {
        return "CustomerTagAssignment";
      }
      if (obj instanceof CustomerSegmentResolver) return "CustomerSegment";
      if (obj instanceof CustomerSegmentMembershipResolver) {
        return "CustomerSegmentMembership";
      }
      if (obj instanceof CustomerMonetaryStatisticsResolver) {
        return "CustomerMonetaryStatistics";
      }
      if (obj instanceof CustomerMergeResolver) return "CustomerMerge";
      if (obj instanceof CustomerDataRequestResolver) {
        return "CustomerDataRequest";
      }
      if (obj instanceof CustomerExternalReferenceResolver) {
        return "CustomerExternalReference";
      }
      // The type-resolver executor may proxy or copy resolver instances before
      // Apollo asks for the concrete Node type. In that case `instanceof` is
      // not stable across the execution boundary, while the resolver class
      // name remains an explicit, closed discriminator.
      const constructorName =
        typeof obj === "object" && obj !== null
          ? (obj as { constructor?: { name?: unknown } }).constructor?.name
          : undefined;
      return typeof constructorName === "string" && constructorName in NODE_RESOLVER_TYPES
        ? NODE_RESOLVER_TYPES[constructorName as keyof typeof NODE_RESOLVER_TYPES]
        : null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  Customer: {
    __resolveReference: (
      reference: { __typename: "Customer"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const customerId = decodeGlobalIdByType(reference.id, GlobalIdEntity.Customer);
      return CustomerResolver.load(customerId, parseGraphqlInfo(info), ctx);
    },
  },
  CustomerComparison: {
    __resolveReference: (
      reference: { __typename: "CustomerComparison"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.CustomerComparison);
      return CustomerComparisonResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },
  CustomerComparisonItem: {
    __resolveReference: (
      reference: { __typename: "CustomerComparisonItem"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.CustomerComparisonItem);
      return CustomerComparisonItemResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },
  CustomerExternalReference: {
    __resolveReference: (
      reference: { __typename: "CustomerExternalReference"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.CustomerExternalReference);
      return CustomerExternalReferenceResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },
};

const NODE_RESOLVER_TYPES = Object.freeze({
  CustomerResolver: "Customer",
  CustomerAddressResolver: "CustomerAddress",
  CustomerTaxIdentifierResolver: "CustomerTaxIdentifier",
  CustomerTaxExemptionResolver: "CustomerTaxExemption",
  CustomerConsentResolver: "CustomerConsent",
  CustomerComparisonResolver: "CustomerComparison",
  CustomerComparisonItemResolver: "CustomerComparisonItem",
  CustomerConsentEventResolver: "CustomerConsentEvent",
  CustomerGroupResolver: "CustomerGroup",
  CustomerGroupMembershipResolver: "CustomerGroupMembership",
  CustomerTagResolver: "CustomerTag",
  CustomerTagAssignmentResolver: "CustomerTagAssignment",
  CustomerSegmentResolver: "CustomerSegment",
  CustomerSegmentMembershipResolver: "CustomerSegmentMembership",
  CustomerMonetaryStatisticsResolver: "CustomerMonetaryStatistics",
  CustomerMergeResolver: "CustomerMerge",
  CustomerDataRequestResolver: "CustomerDataRequest",
  CustomerExternalReferenceResolver: "CustomerExternalReference",
});

const NODE_TYPE_NAMES = new Set(Object.values(NODE_RESOLVER_TYPES));

type NodeTypeName = (typeof NODE_RESOLVER_TYPES)[keyof typeof NODE_RESOLVER_TYPES];

function isNodeTypeName(value: unknown): value is NodeTypeName {
  return typeof value === "string" && NODE_TYPE_NAMES.has(value as NodeTypeName);
}
