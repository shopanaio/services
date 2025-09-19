import { Service, ServiceSchema, Context } from "moleculer";

import { MoleculerLogger } from "@src/infrastructure/logger/logger";
import { InventoryPluginManager } from "@src/infrastructure/plugins/pluginManager";
import { createProviderContext } from "@shopana/plugin-core";

import {
  getOffers,
  GetOffersParams,
  GetOffersResult,
} from "@src/scripts/getOffers";
import { Kernel } from "@src/kernel/Kernel";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
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

    /**
     * Get plugin information
     */
    async pluginInfo(this: ServiceThis): Promise<any> {
      return this.kernel.getPluginInfo();
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    // Create Plugin Manager with context factory using Moleculer logger
    const ctxFactory = () =>
      createProviderContext(new MoleculerLogger(this.logger));

    const pluginManager = new InventoryPluginManager(ctxFactory);

    // Create kernel with Moleculer logger
    this.kernel = new Kernel(
      pluginManager,
      new MoleculerLogger(this.logger)
    );
  },

  async started() {
    try {
      // Check plugin health
      try {
        const pluginInfo = await this.kernel.getPluginInfo();
        this.logger.info("Plugin info loaded successfully", {
          pluginCount: pluginInfo.count,
        });
      } catch (error) {
        this.logger.warn(
          { error: error instanceof Error ? error.message : String(error) },
          "Plugin health check failed, but continuing..."
        );
      }

      this.logger.info("Inventory service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
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
