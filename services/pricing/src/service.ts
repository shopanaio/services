import { Service, ServiceSchema, Context } from "moleculer";
import { Knex } from "knex";

import { Kernel } from "@src/kernel/Kernel";
import { PricingPluginManager } from "@src/infrastructure/plugins/pluginManager";
import { createProviderContext } from "@shopana/plugin-sdk";
import { MoleculerLogger } from "@src/infrastructure/logger/logger";

import {
  getAllDiscounts,
  validateDiscount,
  evaluateDiscounts,
  type GetAllDiscountsParams,
  type GetAllDiscountsResult,
  type ValidateDiscountParams,
  type ValidateDiscountResult,
  type EvaluateDiscountsParams,
  type EvaluateDiscountsResult,
} from "@src/scripts/index";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
};

const PricingService: ServiceSchema<any> = {
  name: "pricing",

  /**
   * Service actions
   * Exposes pricing operations through Moleculer actions
   */
  actions: {
    /**
     * Get all discounts for project
     */
    async getAllDiscounts(
      this: ServiceThis,
      ctx: Context<GetAllDiscountsParams>
    ): Promise<GetAllDiscountsResult> {
      return this.kernel.executeScript(getAllDiscounts, ctx.params);
    },

    /**
     * Validate discount code
     */
    async validateDiscount(
      this: ServiceThis,
      ctx: Context<ValidateDiscountParams>
    ): Promise<ValidateDiscountResult> {
      return this.kernel.executeScript(validateDiscount, ctx.params);
    },

    /**
     * Evaluate discounts for cart
     */
    evaluateDiscounts: {
      params: {
        projectId: { type: "string", min: 1 },
        currency: { type: "string", min: 1 },
        lines: { type: "array" },
        appliedDiscountCodes: { type: "array", optional: true },
      },
      handler(
        this: ServiceThis,
        ctx: Context<EvaluateDiscountsParams>
      ): Promise<EvaluateDiscountsResult> {
        return this.kernel.executeScript(evaluateDiscounts, ctx.params);
      },
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
    this.logger.info("Pricing service creating...");
  },

  async started() {
    this.logger.info("Pricing service starting...");

    try {
      // Create Plugin Manager with context factory
      const moleculerLogger = new MoleculerLogger(this.logger);
      const ctxFactory = () => createProviderContext(moleculerLogger);

      const pluginManager = new PricingPluginManager(ctxFactory);

      // Create kernel
      this.kernel = new Kernel(pluginManager, moleculerLogger, this.broker);
      this.logger.info("Pricing service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Pricing service stopped successfully");
  },
};

export default PricingService;
