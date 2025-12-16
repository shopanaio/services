import type { Resolvers } from "../../generated/types.js";
import { ApiKeyCreateScript } from "../../../../scripts/apiKey/ApiKeyCreateScript.js";
import { ApiKeyRevokeScript } from "../../../../scripts/apiKey/ApiKeyRevokeScript.js";
import { ApiKeyDeleteScript } from "../../../../scripts/apiKey/ApiKeyDeleteScript.js";

export const apiKeyMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    apiKeyCreate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ApiKeyCreateScript, {
        projectId: ctx.project.id,
        name: input.name,
        createdById: ctx.user.id,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      });

      return {
        apiKey: result.apiKey ?? null,
        userErrors: result.userErrors,
      };
    },

    apiKeyRevoke: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ApiKeyRevokeScript, { id: input.id });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    apiKeyDelete: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(ApiKeyDeleteScript, { id: input.id });

      return {
        deletedApiKeyId: result.deletedApiKeyId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
