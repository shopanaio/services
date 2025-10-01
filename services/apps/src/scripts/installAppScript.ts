import type { TransactionScript, ScriptContext } from "@src/kernel/types";

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
 * Supports multi-domain plugins - creates one slot per domain from plugin manifest
 */
export const installAppScript: TransactionScript<
  InstallAppParams,
  InstallAppResult
> = async (params, services, scriptContext) => {
  const { appCode, projectId } = params;
  const { slotsRepository, logger, pluginManager } = services;
  const provider = appCode.trim();

  try {
    // 1. Input data validation
    if (!provider) {
      return {
        success: false,
        warnings: [
          {
            code: "VALIDATION_ERROR",
            message: "App code is required",
          },
        ],
      };
    }

    // 2. Get plugin manifest to determine supported domains
    const manifests = pluginManager.listManifests();
    const descriptor = manifests.find((m) => m.manifest.code === provider);

    console.log("installAppScript", descriptor);
    if (!descriptor) {
      return {
        success: false,
        warnings: [
          {
            code: "PLUGIN_NOT_FOUND",
            message: `Plugin '${provider}' not found in registry`,
          },
        ],
      };
    }

    const domains = descriptor.manifest.domains || [];
    if (domains.length === 0) {
      return {
        success: false,
        warnings: [
          {
            code: "NO_DOMAINS",
            message: `Plugin '${provider}' has no domains specified`,
          },
        ],
      };
    }

    logger.info(
      { provider, domains, projectId },
      `Installing plugin for ${domains.length} domain(s)`
    );

    // 3. Create/update slot for EACH domain
    // This allows multi-domain plugins (e.g., novaposhta with shipping + payment)
    // to share the same provider_config but have separate slots
    for (const domain of domains) {
      await slotsRepository.upsertSlot({
        domain,
        projectId,
        provider,
        capabilities: [],
        data: {}, // Configuration shared via provider_configs table
      });

      logger.info(
        { provider, domain, projectId },
        `Created/updated slot for domain '${domain}'`
      );
    }

    return { success: true };
  } catch (error) {
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
