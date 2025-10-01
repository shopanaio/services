import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
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
      return this.kernel.executeScript(paymentMethods, ctx.params);
    },
  },

  created() {
    this.logger.info("Payments service creating...");
  },

  async started() {
    this.logger.info("Payments service starting...");

    try {
      // Create kernel with broker and logger
      // Plugin management is now centralized in apps service
      const moleculerLogger = new MoleculerLogger(this.logger);
      this.kernel = new Kernel(this.broker, moleculerLogger);

      this.logger.info("Payments service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Payments service stopped successfully");
  },
};

export default PaymentsService;
