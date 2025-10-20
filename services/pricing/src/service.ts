import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
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
} from "./scripts/index.js";

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
      // Create kernel with broker and logger
      // Plugin management is now centralized in apps service
      const moleculerLogger = new MoleculerLogger(this.logger);
      this.kernel = new Kernel(this.broker, moleculerLogger);

      this.logger.info("Pricing service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Pricing service stopping...");
    this.logger.info("Pricing service stopped successfully");
  },
};

export default PricingService;
