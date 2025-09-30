import type {
  TransactionScript,
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
    let domain: string;
    let provider: string;

    if (appCode.includes(":")) {
      const parts = appCode.split(":", 2);
      domain = parts[0];
      provider = parts[1];
    } else {
      // If no domain specified, try to determine from provider name or use default
      provider = appCode;
      // Determine domain based on provider naming convention or use shipping as default
      if (provider.includes("pricing") || provider.includes("promo") || provider.includes("discount")) {
        domain = "pricing";
      } else if (provider.includes("inventory") || provider.includes("stock")) {
        domain = "inventory";
      } else {
        domain = "shipping"; // Default domain
      }
    }

    if (!provider || provider.trim().length === 0) {
      return {
        success: false,
        warnings: [
          {
            code: "VALIDATION_ERROR",
            message: "Provider code cannot be empty",
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
