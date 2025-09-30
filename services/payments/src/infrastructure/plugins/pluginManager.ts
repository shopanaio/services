import { PluginManager as CorePluginManager, ResilienceRunner } from "@shopana/plugin-sdk";
import type {
  PaymentMethod,
  GetPaymentMethodsInput,
  PaymentPluginModule,
  ProviderContext,
} from "@shopana/plugin-sdk/payment";
import bankTransfer from "@shopana/payment-plugin-bank-transfer";

// Registry of available payment plugins
const plugins: PaymentPluginModule<any>[] = [bankTransfer as any];

export class PaymentsPluginManager extends CorePluginManager<
  Record<string, unknown>,
  ProviderContext,
  { getPaymentMethods?(input?: GetPaymentMethodsInput): Promise<PaymentMethod[]> }
> {
  constructor(ctxFactory: () => ProviderContext, runner: ResilienceRunner) {
    super(plugins as any, ctxFactory, { runner, coreApiVersion: "1.0.0" });
  }

  async getPaymentMethods(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
    input?: GetPaymentMethodsInput;
  }): Promise<PaymentMethod[]> {
    const { provider, plugin } = await this.createProvider({
      pluginCode: params.pluginCode,
      rawConfig: params.rawConfig,
    });
    const hooks = (plugin as any).hooks ?? {};
    return (this as any).runner.execute(
      { pluginCode: plugin.manifest.code, operation: "getPaymentMethods", projectId: params.projectId },
      async () => {
        try {
          if (typeof provider.getPaymentMethods !== "function") return [];
          const result = await provider.getPaymentMethods(params.input);
          hooks.onTelemetry?.("getPaymentMethods.success", { count: result.length, projectId: params.projectId });
          return result;
        } catch (err) {
          hooks.onError?.(err, { operation: "getPaymentMethods", projectId: params.projectId });
          throw err;
        }
      }
    );
  }
}
