import type { Resolvers, Store } from "../../generated/types.js";
import { StoreCreateScript } from "../../../../scripts/store/StoreCreateScript.js";
import { StoreUpdateScript } from "../../../../scripts/store/StoreUpdateScript.js";
import { StoreDeleteScript } from "../../../../scripts/store/StoreDeleteScript.js";

export const storeMutationResolvers: Partial<Resolvers> = {
  StoreMutation: {
    storeCreate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(StoreCreateScript, {
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        locales: input.locales as any,
        currencies: input.currencies as any,
        defaultCurrency: input.defaultCurrency as any,
        status: input.status ?? undefined,
        timezone: input.timezone ?? undefined,
        email: input.email,
      });

      return {
        store: (result.store as unknown as Store) ?? null,
        userErrors: result.userErrors,
      };
    },

    storeUpdate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(StoreUpdateScript, {
        id: ctx.store.id,
        name: input.name ?? undefined,
        email: input.email ?? undefined,
        timezone: input.timezone ?? undefined,
        defaultWeightUnit: (input.defaultWeightUnit as any) ?? undefined,
        defaultDimensionUnit: (input.defaultDimensionUnit as any) ?? undefined,
      });

      return {
        store: (result.store as unknown as Store) ?? null,
        userErrors: result.userErrors,
      };
    },

    storeDelete: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(StoreDeleteScript, {
        id: input.id,
      });

      return {
        deletedStoreId: result.deletedStoreId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
