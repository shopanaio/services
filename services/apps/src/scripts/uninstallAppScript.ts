import type {
  TransactionScript,
  KernelServices,
  ScriptContext,
} from "@src/kernel/types";

// Parameters for app uninstallation
export interface UninstallAppParams {
  readonly appCode: string;
  readonly projectId: string;
}

// Execution result
export interface UninstallAppResult {
  success: boolean;
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: App uninstallation
 */
export const uninstallAppScript: TransactionScript<
  UninstallAppParams,
  UninstallAppResult
> = async (params, services, scriptContext) => {
  console.log("\n\n\nuninstallAppScript");
  const { appCode, projectId } = params;
  const { slotsRepository, logger } = services;

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

    // 2. App code parsing
    const [domain, provider] = appCode.includes(":")
      ? appCode.split(":", 2)
      : ["shipping", appCode];

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

    // 3. Slot removal from catalog
    // First find slot by domain and provider
    const slots = await slotsRepository.findAllSlots(projectId, domain);
    const slot = slots.find((s) => s.provider === provider);

    let wasRemoved = false;
    if (slot) {
      wasRemoved = await slotsRepository.deleteSlot(slot.id, projectId);
    }

    return { success: wasRemoved };
  } catch (error) {
    console.log("\n\nerror", error);
    logger.error(
      {
        appCode,
        error,
        projectId,
      },
      "Failed to uninstall app"
    );

    return {
      success: false,
      warnings: [
        {
          code: "INTERNAL_ERROR",
          message: "Failed to uninstall app",
        },
      ],
    };
  }
};
