import { Service, ServiceSchema, Context } from "moleculer";

import { Kernel } from "@src/kernel/Kernel";
import { MoleculerLogger } from "@src/infrastructure/logger/logger";

import {
  createDeliveryGroups,
  type CreateDeliveryGroupsParams,
  type CreateDeliveryGroupsResult,
} from "@src/scripts/createDeliveryGroups";
import type { GetPaymentMethodsParams, GetPaymentMethodsResult } from "./scripts/paymentMethods";
import { paymentMethods } from "./scripts/paymentMethods";
import {
  GetShippingMethodsParams,
  GetShippingMethodsResult,
  shippingMethods,
} from "@src/scripts/shippingMethods";

// Define extended `this` type for Moleculer service context.
// This allows TypeScript to understand properties added by broker (logger, broker, etc.)
type ServiceThis = Service & {
  kernel: Kernel;
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
     * Get payment methods from shipping plugins (if supported)
     */
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
      handler(
        this: ServiceThis,
        ctx: Context<GetPaymentMethodsParams>
      ): Promise<GetPaymentMethodsResult> {
        return this.kernel.executeScript(paymentMethods, ctx.params);
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

      this.logger.info("Shipping service started successfully");
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Shipping service stopped successfully");
  },
};

export default ShippingService;
