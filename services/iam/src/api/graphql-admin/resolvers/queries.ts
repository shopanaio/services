import { ServiceContext } from "@src/context/types.js";
import type { Resolvers, User } from "../generated/types.js";

export const queryResolvers = {
  Query: {
    userQuery: () => ({} as any),
  },

  UserQuery: {
    current: async (_parent: unknown, _args: unknown, ctx: ServiceContext) => {
      // Return current user - type cast needed until codegen is updated
      return ctx.currentUser as any;
    },
  },

  // Federation resolver for User entity
  User: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext
    ): Promise<User | null> => {
      try {
        console.log("[User.__resolveReference] id:", reference.id);
        const user = await ctx.kernel.repository.user.findById(reference.id);
        if (!user) {
          console.warn("[User.__resolveReference] User not found:", reference.id);
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.name?.split(" ")[0] ?? null,
          lastName: user.name?.split(" ").slice(1).join(" ") ?? null,
          avatar: user.image,
          locale: null,
          isAdmin: false,
          isForbidden: false,
          isDeleted: false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          role: null, // Will be resolved by User.role resolver
        } as User;
      } catch (error) {
        console.error("[User.__resolveReference] Error:", error);
        return null;
      }
    },
  },
} satisfies Partial<Resolvers>;
