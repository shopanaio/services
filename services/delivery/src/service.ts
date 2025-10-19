import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import {
  createDeliveryGroups,
  type CreateDeliveryGroupsParams,
  type CreateDeliveryGroupsResult,
} from "@src/scripts/createDeliveryGroups";
import {
  GetShippingMethodsParams,
  GetShippingMethodsResult,
  shippingMethods,
} from "@src/scripts/shippingMethods";
import { startHealthServer } from "@src/healthServer";
import type { Server } from "http";
import { config } from "@src/config";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
  healthServer: Server;
};

const ShippingService: ServiceSchema<any> = {
  name: "shipping",

  /**
   * Service actions
   * Exposes shipping operations through Moleculer actions
   */
  actions: {
    /**
     * Get all shipping methods for project
     */
    shippingMethods: {
      params: {
        projectId: { type: "string", min: 1 },
        requestId: { type: "string", optional: true },
        userAgent: { type: "string", optional: true }
      },
      handler(
        this: ServiceThis,
        ctx: Context<GetShippingMethodsParams>
      ): Promise<GetShippingMethodsResult> {
        return this.kernel.executeScript(shippingMethods, ctx.params);
      }
    },

    /**
     * Create delivery groups for checkout
     */
    createDeliveryGroups: {
      params: {
        projectId: { type: "string", min: 1 },
        items: { type: "array", optional: true }
      },
      handler(
        this: ServiceThis,
        ctx: Context<CreateDeliveryGroupsParams>
      ): Promise<CreateDeliveryGroupsResult> {
        return this.kernel.executeScript(
          createDeliveryGroups,
          ctx.params
        );
      }
    },

  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Shipping service creating...");
  },

  async started() {
    this.logger.info("Shipping service starting...");

    try {
      // Create kernel with broker and logger
      // Plugin management is now centralized in apps service
      const moleculerLogger = new MoleculerLogger(this.logger);
      this.kernel = new Kernel(
        this.broker,
        moleculerLogger
      );

      // Start health check server
      this.healthServer = await startHealthServer(config.port);

      this.logger.info("Shipping service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Shipping service stopping...");

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

    this.logger.info("Shipping service stopped successfully");
  },
};

export default ShippingService;
