import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel } from "@src/kernel/Kernel";
import {
  paymentMethods,
  type GetPaymentMethodsParams,
  type GetPaymentMethodsResult,
} from "@src/scripts/paymentMethods";

type ServiceThis = Service & { kernel: Kernel };

const PaymentsService: ServiceSchema<any> = {
  name: "payments",

  actions: {
    async getPaymentMethods(
      this: ServiceThis,
      ctx: Context<GetPaymentMethodsParams>
    ): Promise<GetPaymentMethodsResult> {
      console.log(ctx.params, "ctx.params");
      return this.kernel.executeScript(paymentMethods, ctx.params);
    },

  },

  created() {
    this.logger.info("Payments service creating...");
  },

  async started() {
    this.logger.info("Payments service starting...");

    // Create kernel with broker and logger
    // Plugin management is now centralized in apps service
    this.kernel = new Kernel(
      this.broker,
      this.logger as any
    );

    this.logger.info("Payments service started successfully");
  },

  async stopped() {
    this.logger.info("Payments service stopped successfully");
  },
};

export default PaymentsService;
