import { z } from "zod";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { Resolvers, Store } from "../../generated/types.js";
import { StoreUpdateScript } from "../../../../scripts/store/StoreUpdateScript.js";
import { StoreDeleteScript } from "../../../../scripts/store/StoreDeleteScript.js";
import { StoreResolver } from "../../../../resolvers/admin/StoreType.js";
import { requireContext } from "../utils.js";
import type { StoreCreateWorkflow } from "../../../../workflows/index.js";
import { checkAuthorization } from "../../decorators/authorize.js";

const StoreCreateInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  locales: z.array(z.string()).min(1, "At least one locale is required"),
  currencies: z.array(z.string()).min(1, "At least one currency is required"),
  defaultCurrency: z.string(),
  status: z.enum(["active", "inactive"]).optional(),
  timezone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().nullable(),
});

function zodErrorsToUserErrors(error: z.ZodError) {
  return error.errors.map((e) => ({
    message: e.message,
    code: "VALIDATION_ERROR",
    field: e.path.map(String),
  }));
}

export const storeMutationResolvers: Partial<Resolvers> = {
  StoreMutation: {
    storeCreate: async (_parent, { input }, ctx, info) => {
      // Validate input with Zod
      const validation = StoreCreateInputSchema.safeParse(input);

      if (!validation.success) {
        return {
          store: null,
          userErrors: zodErrorsToUserErrors(validation.error),
        };
      }

      if (!ctx.kernel.workflow) {
        return {
          store: null,
          userErrors: [
            {
              message: "Workflow not available",
              code: "WORKFLOW_UNAVAILABLE",
              field: null,
            },
          ],
        };
      }

      if (!ctx.user?.id) {
        return {
          store: null,
          userErrors: [
            {
              message: "Authentication required",
              code: "UNAUTHENTICATED",
              field: null,
            },
          ],
        };
      }

      try {
        const workflow =
          ctx.kernel.workflow.get<StoreCreateWorkflow>("storeCreate");
        const result = await workflow.run({
          name: input.name,
          slug: input.slug,
          locales: input.locales as any,
          currencies: input.currencies as any,
          defaultCurrency: input.defaultCurrency as any,
          status: input.status ?? undefined,
          timezone: input.timezone ?? undefined,
          email: input.email ?? undefined,
          userId: ctx.user.id, // Creator gets owner role
        });

        const storeFieldInfo = parseGraphqlInfo(info, "store");

        return {
          store: (await StoreResolver.load(
            result.storeId,
            storeFieldInfo,
            ctx
          )) as Store,
          userErrors: [],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          store: null,
          userErrors: [{ message, code: "WORKFLOW_ERROR", field: null }],
        };
      }
    },

    storeUpdate: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "store", "update");
      if (authError) {
        return {
          store: null,
          userErrors: [authError],
        };
      }

      const result = await ctx.kernel.runScript(StoreUpdateScript, {
        id: ctx.store.id,
        name: input.name ?? undefined,
        email: input.email ?? undefined,
        timezone: input.timezone ?? undefined,
        defaultWeightUnit: input.defaultWeightUnit ?? undefined,
        defaultDimensionUnit: input.defaultDimensionUnit ?? undefined,
      });

      return {
        store: result.store ?? null,
        userErrors: result.userErrors,
      };
    },

    storeDelete: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "store", "delete");
      if (authError) {
        return {
          deletedStoreId: null,
          userErrors: [authError],
        };
      }

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
