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
  const { broker, logger } = services;

  try {
    // 1. Determine list of services to query via Moleculer
    const servicesToQuery = ["shipping"]; // Call shipping service directly via Moleculer

    logger.debug(
      {
        servicesToQuery,
        projectId,
      },
      "Fetching available apps"
    );

    // 2. Parallel data fetching from all services via Moleculer
    const fetchPromises = servicesToQuery.map(async (serviceName) => {
      try {
        const response = await broker.call(`${serviceName}.plugins`, {
          projectId,
        });

        const json = response as {
          manifests?: {
            manifest: {
              code: string;
              displayName?: string;
              title?: string;
              name?: string;
            };
            compatible: boolean;
            allowed: boolean;
          }[];
        };

        // 3. Filter and transform results
        const manifests = json.manifests ?? [];
        return manifests
          .filter((m) => m.allowed && m.compatible)
          .map((m) => {
            const man = m.manifest;
            const code = man.code;
            const name = String(
              man.displayName ?? man.title ?? man.name ?? man.code
            );
            return { code, name };
          });
      } catch (error) {
        logger.error(
          { serviceName, error },
          "Failed to fetch plugins from service"
        );
        return [];
      }
    });

    // 4. Wait for all requests and merge results
    const results = await Promise.all(fetchPromises);
    const flatResults = results.flat();

    // 5. Deduplicate results by app code
    const uniqueApps = new Map<string, AvailableApp>();
    for (const app of flatResults) {
      if (!uniqueApps.has(app.code)) {
        uniqueApps.set(app.code, app);
      }
    }

    const apps = Array.from(uniqueApps.values());

    logger.info(
      {
        count: apps.length,
        projectId,
      },
      "Retrieved available apps"
    );

    return { apps };
  } catch (error) {
    console.log("\n\nerror", error);
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
