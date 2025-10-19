import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import {
  paymentMethods,
  type GetPaymentMethodsParams,
  type GetPaymentMethodsResult,
} from "@src/scripts/paymentMethods";
import { startHealthServer } from "@src/healthServer";
import type { Server } from "http";
import { config } from "@src/config";

type ServiceThis = Service & {
  kernel: Kernel;
  healthServer: Server;
};

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

      // Start health check server
      this.healthServer = await startHealthServer(config.port);

      this.logger.info("Payments service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Payments service stopping...");

    // Close health server
    if (this.healthServer) {
      try {
        this.logger.info("Closing health server...");
        await new Promise<void>((resolve, reject) => {
          this.healthServer.close((err?: Error) => (err ? reject(err) : resolve()));
        });
        this.logger.info("Health server closed successfully");
      } catch (error) {
        this.logger.error("Error closing health server:", error);
      }
    }

    this.logger.info("Payments service stopped successfully");
  },
};

export default PaymentsService;
