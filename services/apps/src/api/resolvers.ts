import type {
  QueryResolvers,
  MutationResolvers,
  AppsQueryResolvers,
  AppsMutationResolvers,
  Resolvers,
  AppsQuery,
  AppsMutation,
} from "../generated/types";
import type { Kernel } from "@src/kernel/Kernel";
import {
  getAvailableAppsScript,
  getInstalledAppsScript,
  installAppScript,
  uninstallAppScript,
} from "@src/scripts/index";

/**
 * GraphQL Resolvers - direct script execution
 * No Moleculer action calls - scripts are executed directly via kernel
 */
export function createResolvers(kernel: Kernel): Resolvers {
  return {
    Query: {
      appsQuery: (): AppsQuery => ({} as AppsQuery),
    } satisfies QueryResolvers,
    Mutation: {
      appsMutation: (): AppsMutation => ({} as AppsMutation),
    } satisfies MutationResolvers,
    AppsQuery: {
      // Getting available apps
      apps: async (_p, _a, ctx) => {
        const result = await kernel.executeScript(getAvailableAppsScript, {
          projectId: ctx.project.id,
        });

        return result.apps.map((a) => ({
          code: a.code,
          name: a.name,
          meta: a.meta ?? null,
        }));
      },

      // Getting installed apps
      installedApps: async (_p, _a, ctx) => {
        const result = await kernel.executeScript(getInstalledAppsScript, {
          projectId: ctx.project.id,
        });

        return result.apps.map((a) => ({
          id: a.id,
          projectID: a.projectID,
          appCode: a.appCode,
          domain: a.domain,
          baseURL: a.baseURL,
          enabled: a.enabled,
          meta: a.meta ?? null,
        }));
      },
    } satisfies AppsQueryResolvers,
    AppsMutation: {
      // App installation
      install: async (_p, args: { code: string }, ctx) => {
        const result = await kernel.executeScript(installAppScript, {
          appCode: args.code,
          projectId: ctx.project.id,
        });

        return result.success;
      },

      // App removal
      uninstall: async (_p, args: { code: string }, ctx) => {
        const result = await kernel.executeScript(uninstallAppScript, {
          appCode: args.code,
          projectId: ctx.project.id,
        });

        return result.success;
      },

      publishEvent: async () => {
        return true;
      },
    } satisfies AppsMutationResolvers,
  };
}
