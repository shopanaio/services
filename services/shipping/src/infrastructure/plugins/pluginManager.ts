import {
  PluginManager as CorePluginManager,
  ResilienceRunner,
} from "@shopana/plugin-sdk";
import type {
  ProviderContext,
  ShippingMethod,
  PluginModule,
} from "@shopana/shipping-plugin-sdk";
import { CORE_API_VERSION } from "@shopana/shipping-plugin-sdk";
import type { PluginManager as IPluginManager } from "@src/kernel/types";
import { config } from "@src/config";

// Import plugins
import novaposhta from "@shopana/shipping-plugin-novaposhta";
import meest from "@shopana/shipping-plugin-meest-express";

/**
 * Registry of available plugins
 */
const plugins: PluginModule[] = [novaposhta as any, meest as any];

/**
 * Resilience Runner for plugins
 */
const runner = new ResilienceRunner({
  timeoutMs: config.pluginTimeoutMs,
  retries: config.pluginRetries,
  rateLimit: config.pluginRateLimit,
  cbThreshold: 5, // Circuit breaker threshold
  cbResetMs: 15000, // Circuit breaker reset time
});

/**
 * Plugin Manager for shipping service
 *
 * Adapter over CorePluginManager with simplified interface
 */
export class ShippingPluginManager
  extends CorePluginManager<
    Record<string, unknown>,
    ProviderContext,
    { getMethods(): Promise<ShippingMethod[]> }
  >
  implements IPluginManager
{
  constructor(ctxFactory: () => ProviderContext) {
    super(plugins as any, ctxFactory, {
      coreApiVersion: CORE_API_VERSION,
      runner,
    });
  }

  /**
   * Get delivery methods from plugin
   */
  async getMethods(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
  }): Promise<ShippingMethod[]> {
    const { provider, plugin } = await this.createProvider({
      pluginCode: params.pluginCode,
      rawConfig: params.rawConfig,
    });

    // Hooks for telemetry
    const hooks = (plugin as any).hooks ?? {};

    return runner.execute(
      {
        pluginCode: plugin.manifest.code,
        operation: "getMethods",
        projectId: params.projectId,
      },
      async () => {
        try {
          const result = await provider.getMethods();
          hooks.onTelemetry?.("getMethods.success", {
            count: result.length,
            projectId: params.projectId,
          });
          return result;
        } catch (err) {
          hooks.onError?.(err, {
            operation: "getMethods",
            projectId: params.projectId,
          });
          throw err;
        }
      }
    );
  }
}
