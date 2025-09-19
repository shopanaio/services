import {
  PluginManager as CorePluginManager,
  ResilienceRunner,
} from "@shopana/plugin-core";
import type {
  ProviderContext,
  InventoryOffer,
  InventoryProvider,
  GetOffersInput,
  PluginModule,
} from "@shopana/inventory-plugin-kit";
import type { PluginManager as IPluginManager } from "@src/kernel/types";

import shopanaPlugin from "@shopana/inventory-shopana-plugin";

const plugins: PluginModule[] = [shopanaPlugin as any];

/**
 * Resilience Runner for plugins
 */
const runner = new ResilienceRunner({
  timeoutMs: 2000,
  retries: 1,
  rateLimit: 10,
  cbThreshold: 5, // Circuit breaker threshold
  cbResetMs: 15000, // Circuit breaker reset time
});

/**
 * Plugin Manager for inventory service
 *
 * Adapter over CorePluginManager with simplified interface
 */
export class InventoryPluginManager
  extends CorePluginManager<
    Record<string, unknown>,
    ProviderContext,
    InventoryProvider
  >
  implements IPluginManager
{
  constructor(ctxFactory: () => ProviderContext) {
    super(plugins as any, ctxFactory, { runner });
  }

  /**
   * Get inventory offers from plugin
   */
  async getOffers(params: {
    pluginCode: string;
    input: GetOffersInput;
    requestMeta?: { requestId?: string; userAgent?: string };
    projectId?: string;
  }): Promise<InventoryOffer[]> {
    const { provider, plugin } = await this.createProvider({
      pluginCode: params.pluginCode,
      rawConfig: {},
      requestMeta: params.requestMeta,
    });

    // Hooks for telemetry
    const hooks = (plugin as any).hooks ?? {};

    return runner.execute(
      {
        pluginCode: plugin.manifest.code,
        operation: "getOffers",
        projectId: params.projectId || "unknown",
      },
      async () => {
        try {
          const result = await provider.getOffers(params.input);
          hooks.onTelemetry?.("getOffers.success", {
            count: result.length,
            itemsRequested: params.input.items.length,
            projectId: params.projectId || "unknown",
          });
          return result;
        } catch (err) {
          hooks.onError?.(err, {
            operation: "getOffers",
            projectId: params.projectId || "unknown",
          });
          throw err;
        }
      }
    );
  }
}
