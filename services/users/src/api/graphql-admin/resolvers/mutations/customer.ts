import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { ServiceContext } from "../../../../context/index.js";
import { CustomerResolver } from "../../../../resolvers/admin/CustomerResolver.js";
import {
  CustomerCreateScript,
  CustomerDeleteScript,
  CustomerUpdateScript,
} from "../../../../scripts/customer/index.js";
import { noKernelError, requireContext } from "../utils.js";

interface CustomerCreateInput {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
}

interface CustomerUpdateInput {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
  isForbidden?: boolean | null;
}

interface CustomerDeleteInput {
  id: string;
  permanent?: boolean | null;
}

export const customerMutationResolvers = {
  Mutation: {
    customerCreate: async (
      _parent: unknown,
      { input }: { input: CustomerCreateInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ customer: null });
      }

      const result = await ctx.kernel.runScript(CustomerCreateScript, {
        email: input.email,
        password: input.password,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        phone: input.phone ?? undefined,
        language: input.locale ?? undefined,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    customerUpdate: async (
      _parent: unknown,
      { input }: { input: CustomerUpdateInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ customer: null });
      }

      const result = await ctx.kernel.runScript(CustomerUpdateScript, {
        id: input.id,
        email: input.email ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        phone: input.phone ?? undefined,
        language: input.locale ?? undefined,
        isForbidden: input.isForbidden ?? undefined,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    customerDelete: async (
      _parent: unknown,
      { input }: { input: CustomerDeleteInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ deletedCustomerId: null });
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
