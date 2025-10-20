import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import {
  getOffers,
  GetOffersParams,
  GetOffersResult,
} from "./scripts/getOffers.js";

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
    this.logger.info("Inventory service started successfully");
  },

  async stopped() {
    this.logger.info("Inventory service stopping...");
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
