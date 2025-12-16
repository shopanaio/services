import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { Resolvers, Customer } from "../../generated/types.js";
import {
  CustomerCreateScript,
  CustomerUpdateScript,
  CustomerDeleteScript,
} from "../../../../scripts/customer/index.js";
import { CustomerResolver } from "../../../../resolvers/admin/CustomerResolver.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const customerMutationResolvers: Resolvers = {
  CustomersMutation: {
    customerCreate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ customer: null });
      }

      const result = await ctx.kernel.runScript(CustomerCreateScript, {
        email: input.email,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customer
          ? ((await CustomerResolver.load(
              result.customer.id,
              customerFieldInfo,
              requireContext(ctx)
            )) as Customer)
          : null,
        userErrors: result.userErrors,
      };
    },

    customerUpdate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ customer: null });
      }

      const result = await ctx.kernel.runScript(CustomerUpdateScript, {
        id: input.id,
        email: input.email ?? undefined,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customer
          ? ((await CustomerResolver.load(
              result.customer.id,
              customerFieldInfo,
              requireContext(ctx)
            )) as Customer)
          : null,
        userErrors: result.userErrors,
      };
    },

    customerDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedCustomerId: null });
      }

      const result = await ctx.kernel.runScript(CustomerDeleteScript, {
        id: input.id,
        permanent: input.permanent ?? undefined,
      });

      return {
        deletedCustomerId: result.deletedCustomerId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
