import type { TransactionScript } from "@src/kernel/types";

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
> = async (params, services) => {
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
      if (
        provider.includes("pricing") ||
        provider.includes("promo") ||
        provider.includes("discount")
      ) {
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
