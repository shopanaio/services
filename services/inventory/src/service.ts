import { Service, ServiceSchema, Context } from "moleculer";

import { MoleculerLogger } from "@shopana/shared-kernel";

import {
  getOffers,
  GetOffersParams,
  GetOffersResult,
} from "@src/scripts/getOffers";
import { Kernel } from "@shopana/shared-kernel";
import { startHealthServer } from "@src/healthServer";
import type { Server } from "http";
import { config } from "@src/config";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
  healthServer: Server;
};

const InventoryService: ServiceSchema<any> = {
  name: "inventory",

  /**
   * Service actions
   * Exposes inventory operations through Moleculer actions
   */
  actions: {
    /**
     * Get inventory offers for specified items
     */
    async getOffers(
      this: ServiceThis,
      ctx: Context<GetOffersParams>
    ): Promise<GetOffersResult> {
      return this.kernel.executeScript(getOffers, ctx.params);
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    // Create kernel with Moleculer logger and broker only (apps.execute will be used)
    this.kernel = new Kernel(
      this.broker,
      new MoleculerLogger(this.logger)
    );
  },

  async started() {
    this.logger.info("Inventory service starting...");

    try {
      // Start health check server
      this.healthServer = await startHealthServer(config.port);

      this.logger.info("Inventory service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Inventory service stopping...");

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

    this.logger.info("Inventory service stopped successfully");
  },

  /**
   * Helper methods
   */
  methods: {
    generateRequestId(): string {
      return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
  },
};

export default InventoryService;
