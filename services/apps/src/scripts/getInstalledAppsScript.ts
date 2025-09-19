import type {
  TransactionScript,
  KernelServices,
  ScriptContext,
  InstalledApp,
} from "@src/kernel/types";

// Parameters for getting installed apps
export interface GetInstalledAppsParams {
  readonly projectId: string;
}

// Execution result
export interface GetInstalledAppsResult {
  apps: InstalledApp[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Getting list of installed apps
 */
export const getInstalledAppsScript: TransactionScript<
  GetInstalledAppsParams,
  GetInstalledAppsResult
> = async (params, services) => {
  const { projectId } = params;
  const { slotsRepository, logger } = services;

  try {
    // 1. Getting all slots (shipping domain only for now)
    const slots = await slotsRepository.findAllSlots(projectId, "shipping");

    // 2. Transform slots to InstalledApp format
    const installedApps: InstalledApp[] = slots.map((slot) => ({
      id: slot.id,
      projectID: projectId,
      appCode: slot.provider,
      baseURL: String((slot.data as any)?.baseUrl ?? ""),
      enabled: true, // all installed apps are considered active
      meta: slot.data as Record<string, unknown> | null,
    }));

    // 3. Logging for debugging
    logger.info(
      {
        count: installedApps.length,
        projectId,
      },
      "Retrieved installed apps"
    );

    return { apps: installedApps };
  } catch (error) {
    console.log("\n\nerror", error);
    logger.error({ error, projectId }, "Failed to get installed apps");

    return {
      apps: [],
      warnings: [
        {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve installed apps",
        },
      ],
    };
  }
};
