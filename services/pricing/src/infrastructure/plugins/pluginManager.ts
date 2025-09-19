import {
  PluginManager as CorePluginManager,
  ResilienceRunner,
} from "@shopana/plugin-core";
import type {
  ProviderContext,
  Discount,
  PluginModule,
  PricingProvider,
} from "@shopana/pricing-plugin-sdk";
import { CORE_API_VERSION } from "@shopana/pricing-plugin-sdk";
import type { PluginManager as IPluginManager } from "@src/kernel/types";
import { config } from "@src/config";

// Import discount plugins
import simplePromoPlugin from "@shopana/pricing-simple-promo-plugin";

/**
 * Registry of available discount plugins
 */
const plugins: PluginModule[] = [simplePromoPlugin as any];

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
 * Plugin Manager for pricing service
 *
 * Adapter over CorePluginManager with simplified interface
 */
export class PricingPluginManager
  extends CorePluginManager<
    Record<string, unknown>,
    ProviderContext,
    PricingProvider
  >
  implements IPluginManager
{
  constructor(
    ctxFactory: (meta: {
      requestId?: string;
      userAgent?: string;
    }) => ProviderContext
  ) {
    super(plugins as any, ctxFactory, {
      coreApiVersion: CORE_API_VERSION,
      runner,
    });
  }

  /**
   * Get discounts from plugin
   */
  async getDiscounts(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
  }): Promise<Discount[]> {
    const { provider, plugin } = await this.createProvider({
      pluginCode: params.pluginCode,
      rawConfig: params.rawConfig,
    });

    // Hooks for telemetry
    const hooks = (plugin as any).hooks ?? {};

    return runner.execute(
      {
        pluginCode: plugin.manifest.code,
        operation: "getDiscounts",
        projectId: params.projectId,
      },
      async () => {
        try {
          const result = await provider.getDiscounts();
          hooks.onTelemetry?.("getDiscounts.success", {
            count: result.length,
            projectId: params.projectId,
          });
          return result;
        } catch (err) {
          hooks.onError?.(err, {
            operation: "getDiscounts",
            projectId: params.projectId,
          });
          throw err;
        }
      }
    );
  }

  /**
   * Validate discount through plugin
   */
  async validateDiscount(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    code: string;
    projectId: string;
  }): Promise<{ valid: boolean; discount?: Discount }> {
    const { provider, plugin } = await this.createProvider({
      pluginCode: params.pluginCode,
      rawConfig: params.rawConfig,
    });

    const hooks = (plugin as any).hooks ?? {};

    return runner.execute(
      {
        pluginCode: plugin.manifest.code,
        operation: "validateDiscount",
        projectId: params.projectId,
      },
      async () => {
        try {
          const result = await provider.validateDiscount(params.code);
          hooks.onTelemetry?.("validateDiscount.success", {
            code: params.code,
            valid: result.valid,
            projectId: params.projectId,
          });
          return result;
        } catch (err) {
          hooks.onError?.(err, {
            operation: "validateDiscount",
            projectId: params.projectId,
          });
          throw err;
        }
      }
    );
  }
}
