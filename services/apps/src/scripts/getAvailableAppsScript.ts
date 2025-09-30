import type { TransactionScript, AvailableApp } from "@src/kernel/types";

// Parameters for getting available apps
export interface GetAvailableAppsParams {
  readonly projectId: string;
}

// Execution result
export interface GetAvailableAppsResult {
  apps: AvailableApp[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Getting list of available apps
 */
export const getAvailableAppsScript: TransactionScript<
  GetAvailableAppsParams,
  GetAvailableAppsResult
> = async (params, services) => {
  const { projectId } = params;
  const { pluginManager, logger } = services;

  try {
    logger.debug({ projectId }, "Fetching available apps from plugin manager");

    // Get all plugin manifests from centralized plugin manager
    const manifests = pluginManager.listManifests();

    // Filter and transform to available apps
    const apps = manifests
      .filter((m: any) => m.allowed && m.compatible)
      .map((m: any) => ({
        code: m.manifest.code,
        name: m.manifest.displayName ?? m.manifest.code,
        meta: {
          domains: m.manifest.domains,
          version: m.manifest.version,
          priority: m.manifest.priority,
        },
      }));

    logger.info(
      {
        count: apps.length,
        projectId,
      },
      "Retrieved available apps from plugin manager"
    );

    return { apps };
  } catch (error) {
    logger.error({ error, projectId }, "Failed to get available apps");

    return {
      apps: [],
      warnings: [
        {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve available apps",
        },
      ],
    };
  }
};
