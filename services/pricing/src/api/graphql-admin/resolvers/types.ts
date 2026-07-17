import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import {
  DiscountCodeResolver,
  DiscountExternalReferenceResolver,
  DiscountRedemptionAllocationResolver,
  DiscountRedemptionResolver,
  DiscountUsageReservationResolver,
} from "../../../resolvers/admin/DiscountEntityResolver.js";
import { DiscountResolver } from "../../../resolvers/admin/DiscountResolver.js";
import {
  DiscountAmountOffRuleResolver,
  DiscountBuyXGetYRuleResolver,
  DiscountFreeShippingRuleResolver,
} from "../../../resolvers/admin/DiscountValueResolver.js";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

type LoadableResolver = {
  load(
    value: string,
    query: ReturnType<typeof parseGraphqlInfo>,
    ctx: ServiceContext,
  ): Promise<unknown>;
};

function referenceResolver(entity: GlobalIdType, Resolver: LoadableResolver) {
  return (
    reference: { id: string },
    ctx: ServiceContext,
    info: GraphQLResolveInfo,
  ) => {
    const id = decodeGlobalIdByType(reference.id, entity);
    return Resolver.load(id, parseGraphqlInfo(info), ctx);
  };
}

function resolveNodeType(value: unknown): string | null {
  if (value instanceof DiscountResolver) return "Discount";
  if (value instanceof DiscountCodeResolver) return "DiscountCode";
  if (value instanceof DiscountUsageReservationResolver) {
    return "DiscountUsageReservation";
  }
  if (value instanceof DiscountRedemptionResolver) {
    return "DiscountRedemption";
  }
  if (value instanceof DiscountRedemptionAllocationResolver) {
    return "DiscountRedemptionAllocation";
  }
  if (value instanceof DiscountExternalReferenceResolver) {
    return "DiscountExternalReference";
  }

  const typename = (value as { __typename?: unknown })?.__typename;
  return typeof typename === "string" ? typename : null;
}

export const typeResolvers = {
  Node: { __resolveType: resolveNodeType },
  UserError: { __resolveType: () => "GenericUserError" },
  DiscountRule: {
    __resolveType: (value: unknown) => {
      if (value instanceof DiscountAmountOffRuleResolver) {
        return "DiscountAmountOffRule";
      }
      if (value instanceof DiscountBuyXGetYRuleResolver) {
        return "DiscountBuyXGetYRule";
      }
      if (value instanceof DiscountFreeShippingRuleResolver) {
        return "DiscountFreeShippingRule";
      }
      return null;
    },
  },
  DiscountCatalogTarget: {
    __resolveType: (value: unknown) => {
      const typename = (value as { __typename?: unknown })?.__typename;
      return typename === "Product" ||
        typename === "Variant" ||
        typename === "Category"
        ? typename
        : null;
    },
  },
  Discount: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.Discount,
      DiscountResolver,
    ),
  },
  DiscountCode: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.DiscountCode,
      DiscountCodeResolver,
    ),
  },
  DiscountUsageReservation: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.DiscountUsageReservation,
      DiscountUsageReservationResolver,
    ),
  },
  DiscountRedemption: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.DiscountRedemption,
      DiscountRedemptionResolver,
    ),
  },
  DiscountRedemptionAllocation: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.DiscountRedemptionAllocation,
      DiscountRedemptionAllocationResolver,
    ),
  },
  DiscountExternalReference: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.DiscountExternalReference,
      DiscountExternalReferenceResolver,
    ),
  },
} as unknown as Partial<Resolvers>;
