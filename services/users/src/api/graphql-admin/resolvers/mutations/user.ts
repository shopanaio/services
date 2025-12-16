import { parseGraphqlInfo } from "@shopana/type-resolver";
import { UserResolver } from "../../../../resolvers/admin/UserResolver.js";
import {
  UserCreateScript,
  UserUpdateScript,
  UserDeleteScript,
} from "../../../../scripts/user/index.js";
import type { ServiceContext } from "../../../../context/index.js";
import { noKernelError, requireContext } from "../utils.js";

interface UserCreateInput {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
  isAdmin?: boolean | null;
  roles?: string[] | null;
}

interface UserUpdateInput {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
  isAdmin?: boolean | null;
  isForbidden?: boolean | null;
  roles?: string[] | null;
}

interface UserDeleteInput {
  id: string;
  permanent?: boolean | null;
}

export const userMutationResolvers = {
  Mutation: {
    userCreate: async (
      _parent: unknown,
      { input }: { input: UserCreateInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ user: null });
      }

      const result = await ctx.kernel.runScript(UserCreateScript, {
        email: input.email,
        password: input.password,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        phone: input.phone ?? undefined,
        locale: input.locale as "uk" | "en" | "ru" | "de" | "fr" | "es" | "pl" | undefined,
        isAdmin: input.isAdmin ?? undefined,
        roles: input.roles ?? undefined,
      });

      const userFieldInfo = parseGraphqlInfo(info, "user");

      return {
        user: result.userId
          ? await UserResolver.load(result.userId, userFieldInfo, requireContext(ctx))
          : null,
        userErrors: result.userErrors,
      };
    },

    userUpdate: async (
      _parent: unknown,
      { input }: { input: UserUpdateInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ user: null });
      }

      const result = await ctx.kernel.runScript(UserUpdateScript, {
        id: input.id,
        email: input.email ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        phone: input.phone ?? undefined,
        locale: input.locale as "uk" | "en" | "ru" | "de" | "fr" | "es" | "pl" | undefined,
        isAdmin: input.isAdmin ?? undefined,
        isForbidden: input.isForbidden ?? undefined,
        roles: input.roles ?? undefined,
      });

      const userFieldInfo = parseGraphqlInfo(info, "user");

      return {
        user: result.userId
          ? await UserResolver.load(result.userId, userFieldInfo, requireContext(ctx))
          : null,
        userErrors: result.userErrors,
      };
    },

    userDelete: async (
      _parent: unknown,
      { input }: { input: UserDeleteInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ deletedUserId: null });
      }

      const result = await ctx.kernel.runScript(UserDeleteScript, {
        id: input.id,
        permanent: input.permanent ?? undefined,
      });

      return {
        deletedUserId: result.deletedUserId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
