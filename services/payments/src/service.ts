import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel } from "@src/kernel/Kernel";
import { ResilienceRunner, createProviderContext } from "@shopana/plugin-sdk";
import { PaymentsPluginManager } from "@src/infrastructure/plugins/pluginManager";
import { paymentMethods, type GetPaymentMethodsParams, type GetPaymentMethodsResult } from "@src/scripts/paymentMethods";

type ServiceThis = Service & { kernel: Kernel };

const PaymentsService: ServiceSchema<any> = {
  name: "payments",

  actions: {
    paymentMethods: {
      params: {
        projectId: { type: "string", min: 1 },
        requestId: { type: "string", optional: true },
        userAgent: { type: "string", optional: true },
        shippingMethodCode: { type: "string", optional: true },
        amountMinor: { type: "number", optional: true },
        currency: { type: "string", optional: true },
        locale: { type: "string", optional: true },
      },
      handler(this: ServiceThis, ctx: Context<GetPaymentMethodsParams>): Promise<GetPaymentMethodsResult> {
        return this.kernel.executeScript(paymentMethods, ctx.params);
      }
    },
    async pluginInfo(this: ServiceThis): Promise<any> {
      return this.kernel.getPluginInfo();
    },
  },

  created() {
    this.logger.info("Payments service creating...");
  },

  async started() {
    this.logger.info("Payments service starting...");
    const runner = new ResilienceRunner({ timeoutMs: 3000, retries: 1, rateLimit: 10, cbThreshold: 5, cbResetMs: 15000 });
    const ctxFactory = () => createProviderContext({
      info: (...args: any[]) => this.logger.info(...args),
      warn: (...args: any[]) => this.logger.warn(...args),
      error: (...args: any[]) => this.logger.error(...args),
      debug: (...args: any[]) => this.logger.debug(...args),
    } as any);
    const pluginManager = new PaymentsPluginManager(ctxFactory, runner);
    this.kernel = new Kernel(pluginManager as any, this.broker, this.logger as any, runner);
    this.logger.info("Payments service started successfully");
  },

  async stopped() {
    this.logger.info("Payments service stopped successfully");
  },
};

export default PaymentsService;
