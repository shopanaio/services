import type { ServiceBroker } from "moleculer";
import type {
  QueryResolvers,
  MutationResolvers,
  AppsQueryResolvers,
  AppsMutationResolvers,
  Resolvers,
  AppsQuery,
  AppsMutation,
} from "../generated/types";
import type {
  GetAvailableAppsParams,
  InstallAppParams,
  UninstallAppParams,
  GetInstalledAppsParams,
  GetAvailableAppsResult,
  InstallAppResult,
  UninstallAppResult,
  GetInstalledAppsResult,
} from "@src/scripts/index";

/**
 * GraphQL Resolvers - thin layer over Moleculer actions
 * Uses Moleculer's built-in tracing (ctx.requestID, ctx.parentID)
 * No external correlation dependencies
 */
export function createResolvers(broker: ServiceBroker): Resolvers {
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
        const params: GetAvailableAppsParams = {
          projectId: ctx.project.id,
        };

        const result: GetAvailableAppsResult = await broker.call("apps.getAvailable", params);

        return result.apps.map((a) => ({
          code: a.code,
          name: a.name,
          meta: a.meta ?? null,
        }));
      },

      // Getting installed apps
      installedApps: async (_p, _a, ctx) => {
        const params: GetInstalledAppsParams = {
          projectId: ctx.project.id,
        };

        const result: GetInstalledAppsResult = await broker.call("apps.getInstalled", params);

        return result.apps.map((a) => ({
          id: a.id,
          projectID: a.projectID,
          appCode: a.appCode,
          baseURL: a.baseURL,
          enabled: a.enabled,
          meta: a.meta ?? null,
        }));
      },
    } satisfies AppsQueryResolvers,
    AppsMutation: {
      // App installation
      install: async (_p, args: { code: string }, ctx) => {
        const params: InstallAppParams = {
          appCode: args.code,
          projectId: ctx.project.id,
        };

        const result: InstallAppResult = await broker.call("apps.install", params);

        return result.success;
      },

      // App removal
      uninstall: async (_p, args: { code: string }, ctx) => {
        const params: UninstallAppParams = {
          appCode: args.code,
          projectId: ctx.project.id,
        };

        const result: UninstallAppResult = await broker.call("apps.uninstall", params);

        return result.success;
      },

      publishEvent: async () => {
        return true;
      },
    } satisfies AppsMutationResolvers,
  };
}
