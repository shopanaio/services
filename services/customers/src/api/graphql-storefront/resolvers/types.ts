import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import {
  requireStorefrontPermission,
  STOREFRONT_PERMISSIONS,
} from "@shopana/shared-context";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { StorefrontCustomerResolver } from "../../../resolvers/storefront/StorefrontCustomerResolver.js";
import {
  CustomerWishlistConnectionResolver,
  CustomerWishlistItemConnectionResolver,
} from "../../../resolvers/storefront/WishlistConnectionResolvers.js";
import {
  CustomerWishlistItemResolver,
  CustomerWishlistResolver,
} from "../../../resolvers/storefront/WishlistResolvers.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value) => {
      if (value instanceof StorefrontCustomerResolver) return "Customer";
      if (value instanceof CustomerWishlistResolver) return "CustomerWishlist";
      if (value instanceof CustomerWishlistItemResolver) {
        return "CustomerWishlistItem";
      }
      return null;
    },
  },
  Connection: {
    __resolveType: (value) => {
      if (value instanceof CustomerWishlistConnectionResolver) {
        return "CustomerWishlistConnection";
      }
      if (value instanceof CustomerWishlistItemConnectionResolver) {
        return "CustomerWishlistItemConnection";
      }
      return null;
    },
  },
  DisplayableError: {
    __resolveType: () => "CustomerUserError",
  },
  Customer: {
    __resolveReference: async (reference, ctx, info) => {
      requireStorefrontPermission(
        ctx.storefrontAccess,
        STOREFRONT_PERMISSIONS.CUSTOMER_READ,
      );
      const customerId = ctx.customer?.id;
      if (
        !customerId ||
        customerId !== decodeReference(reference.id, GlobalIdEntity.Customer)
      ) {
        return null;
      }
      const row = await ctx.loaders.customer.load(customerId);
      return row?.lifecycleStatus === "ACTIVE"
        ? StorefrontCustomerResolver.load(row.id, parseGraphqlInfo(info), ctx)
        : null;
    },
  },
  CustomerWishlist: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.CustomerWishlist,
      (id, ctx) => ctx.loaders.wishlist.load(id),
      CustomerWishlistResolver,
    ),
  },
  CustomerWishlistItem: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.CustomerWishlistItem,
      (id, ctx) => ctx.loaders.wishlistItem.load(id),
      CustomerWishlistItemResolver,
    ),
  },
};

function referenceResolver(
  type: GlobalIdType,
  exists: (id: string, ctx: ServiceContext) => Promise<unknown>,
  Resolver: {
    load(
      value: string,
      query: ReturnType<typeof parseGraphqlInfo>,
      ctx: ServiceContext,
    ): Promise<unknown>;
  },
) {
  return async (
    reference: { id: string },
    ctx: ServiceContext,
    info: GraphQLResolveInfo,
  ) => {
    requireStorefrontPermission(
      ctx.storefrontAccess,
      STOREFRONT_PERMISSIONS.CUSTOMER_READ,
    );
    const id = decodeReference(reference.id, type);
    if (!id || !(await exists(id, ctx))) return null;
    return Resolver.load(id, parseGraphqlInfo(info), ctx);
  };
}

function decodeReference(id: string, type: GlobalIdType): string | null {
  try {
    return decodeGlobalIdByType(id, type);
  } catch {
    return null;
  }
}
