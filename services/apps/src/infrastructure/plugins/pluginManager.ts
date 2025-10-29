import {
  PluginManager as CorePluginManager,
  ResilienceRunner,
  createProviderContext,
} from "@shopana/plugin-sdk";
import type { CorePluginManifest } from "@shopana/plugin-sdk";
import type { Domain, shipping as ShippingSDK } from "@shopana/plugin-sdk";
import { config } from "@src/config";
import {
  shippingPlugins,
  paymentPlugins,
  pricingPlugins,
  inventoryPlugins,
  importPlugins,
} from "@src/infrastructure/plugins/registry";
import type { Logger } from "@shopana/shared-kernel";

// No aliasing: operation equals provider method name across domains (e.g., list, validate)

export class AppsPluginManager {
  private readonly runner: ResilienceRunner;
  private readonly corePM: CorePluginManager<
    Record<string, unknown>,
    ShippingSDK.ProviderContext,
    any
  >;

  constructor(private readonly logger: Logger) {
    this.runner = new ResilienceRunner({
      timeoutMs: config.pluginTimeoutMs,
      retries: config.pluginRetries,
      rateLimit: config.pluginRateLimit,
      cbThreshold: 5,
      cbResetMs: 15000,
    });
    const allModules = [
      ...shippingPlugins,
      ...paymentPlugins,
      ...pricingPlugins,
      ...inventoryPlugins,
      ...importPlugins,
    ];
    this.corePM = new CorePluginManager<
      Record<string, unknown>,
      ShippingSDK.ProviderContext,
      any
    >(allModules, () => createProviderContext(this.logger), {
      runner: this.runner,
    });
  }

  listManifests(): Array<{ manifest: CorePluginManifest; compatible: boolean; allowed: boolean }> {
    return this.corePM.listManifests();
  }

  /**
   * Dynamic execute on specific provider by operation.
   * Manager resolves method name at runtime (operation equals provider method name).
   */
  async executeOnProvider(params: {
    domain: Domain;
    operationId: string;
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
    input?: unknown;
  }): Promise<unknown> {
    try {
      const { provider, plugin } = await this.corePM.createProvider({
        pluginCode: params.pluginCode,
        rawConfig: params.rawConfig,
      });

      const hooks = (plugin as any).hooks ?? {};

      // Operation id must equal provider method name per SDK contract
      const method = params.operationId;

      const prov: any = provider as any;
      const domainApi = prov[params.domain];

      if (!domainApi || typeof domainApi[method] !== "function") {
        throw new Error(`Missing method ${method} for domain ${params.domain}`);
      }

      return this.runner.execute(
        {
          pluginCode: plugin.manifest.code,
          operation: method,
          projectId: params.projectId,
        },
        async () => {
          try {
            const result = await domainApi[method](params.input);
            hooks.onTelemetry?.(`${method}.success`, {
              projectId: params.projectId,
            });
            return result;
          } catch (err) {
            hooks.onError?.(err, { operation: method });
            throw err;
          }
        }
      );
    } catch (e) {
      this.logger.error({ error: e }, "Error executing on provider");
      throw e;
    }
  }

  /** Execute operation across all target slots sequentially; collect results and warnings. */
  async executeOnAll(params: {
    domain: Domain;
    operationId: string;
    slots: Array<{ provider: string; data: Record<string, unknown> }>;
    projectId: string;
    input?: unknown;
  }): Promise<{
    results: unknown[];
    warnings: Array<{ provider: string; message: string; error?: unknown }>;
  }> {
    const results: unknown[] = [];
    const warnings: Array<{
      provider: string;
      message: string;
      error?: unknown;
    }> = [];
    for (const s of params.slots) {
      try {
        const res = await this.executeOnProvider({
          domain: params.domain,
          operationId: params.operationId,
          pluginCode: s.provider,
          rawConfig: (s.data ?? {}) as any,
          projectId: params.projectId,
          input: params.input,
        });
        results.push(res);
      } catch (e) {
        warnings.push({
          provider: s.provider,
          message: `execute failed`,
          error: e,
        });
      }
    }
    return { results, warnings };
  }
}
