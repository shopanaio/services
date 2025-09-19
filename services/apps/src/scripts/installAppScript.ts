import type {
  TransactionScript,
  KernelServices,
  ScriptContext,
} from "@src/kernel/types";

// Parameters for app installation
export interface InstallAppParams {
  readonly appCode: string;
  readonly projectId: string;
}

// Execution result
export interface InstallAppResult {
  success: boolean;
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: App installation
 */
export const installAppScript: TransactionScript<
  InstallAppParams,
  InstallAppResult
> = async (params, services, scriptContext) => {
  const { appCode, projectId } = params;
  const { slotsRepository, logger } = services;

  console.log("installAppScript", params);
  try {
    // 1. Input data validation
    if (!appCode || !appCode.trim()) {
      return {
        success: false,
        warnings: [
          { code: "VALIDATION_ERROR", message: "App code is required" },
        ],
      };
    }

    console.log("appCode", appCode);
    // 2. App code parsing
    const [domain, provider] = appCode.includes(":")
      ? appCode.split(":", 2)
      : ["", appCode];

    if (!domain || !provider) {
      return {
        success: false,
        warnings: [
          {
            code: "VALIDATION_ERROR",
            message:
              "Invalid app code format. Expected: domain:provider or provider",
          },
        ],
      };
    }

    // 3. Creating/updating slot in catalog
    const slot = await slotsRepository.upsertSlot({
      domain,
      projectId,
      provider,
      capabilities: [],
      data: {},
    });

    return { success: true };
  } catch (error) {
    console.log("\n\nerror", error);
    logger.error(
      {
        appCode,
        error,
        projectId,
      },
      "Failed to install app"
    );

    return {
      success: false,
      warnings: [
        {
          code: "INTERNAL_ERROR",
          message: "Failed to install app",
        },
      ],
    };
  }
};
