import { Service, ServiceSchema, Context } from "moleculer";
import { FastifyInstance } from "fastify";
import "reflect-metadata";

import { App } from "@src/ioc/container";
import { startServer } from "@src/interfaces/server/server";
import type {
  CreateCheckoutInput,
  CheckoutLinesAddInput,
  CheckoutLinesUpdateInput,
  CheckoutLinesDeleteInput,
  CheckoutLinesClearInput,
  CheckoutCustomerIdentityUpdateInput,
  CheckoutCustomerNoteUpdateInput,
  CheckoutLanguageCodeUpdateInput,
  CheckoutCurrencyCodeUpdateInput,
  CheckoutPromoCodeAddInput,
  CheckoutPromoCodeRemoveInput,
  CheckoutDeliveryAddressAddInput,
  CheckoutDeliveryAddressUpdateInput,
  CheckoutDeliveryAddressRemoveInput,
  CheckoutDeliveryGroupAddressUpdateInput,
  CheckoutDeliveryMethodUpdateInput,
  CheckoutContext,
} from "@src/application/checkout/types";

// Define extended `this` type for Moleculer service context.
type ServiceThis = Service & {
  app: App;
  graphqlServer: FastifyInstance;
};

const CheckoutService: ServiceSchema<any> = {
  name: "checkout",

  /**
   * Service actions
   * Maps checkout use cases to Moleculer actions
   */
  actions: {
    /**
     * Create new checkout
     */
    async createCheckout(
      this: ServiceThis,
      ctx: Context<CreateCheckoutInput>
    ) {
      return this.app.checkoutUsecase.createCheckout.execute(ctx.params);
    },

    /**
     * Get checkout by ID
     */
    async getCheckoutById(
      this: ServiceThis,
      ctx: Context<{ checkoutId: string } & CheckoutContext>
    ) {
      const { checkoutId } = ctx.params;
      return this.app.checkoutUsecase.getCheckoutById.execute({
        checkoutId,
      });
    },

    /**
     * Add lines to checkout
     */
    async addCheckoutLines(
      this: ServiceThis,
      ctx: Context<CheckoutLinesAddInput>
    ) {
      return this.app.checkoutUsecase.addCheckoutLines.execute(ctx.params);
    },

    /**
     * Update checkout lines
     */
    async updateCheckoutLines(
      this: ServiceThis,
      ctx: Context<CheckoutLinesUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateCheckoutLines.execute(ctx.params);
    },

    /**
     * Remove checkout lines
     */
    async removeCheckoutLines(
      this: ServiceThis,
      ctx: Context<CheckoutLinesDeleteInput>
    ) {
      return this.app.checkoutUsecase.deleteCheckoutLines.execute(ctx.params);
    },

    /**
     * Clear all checkout lines
     */
    async clearCheckoutLines(
      this: ServiceThis,
      ctx: Context<CheckoutLinesClearInput>
    ) {
      return this.app.checkoutUsecase.clearCheckoutLines.execute(ctx.params);
    },

    /**
     * Update customer identity
     */
    async updateCustomerIdentity(
      this: ServiceThis,
      ctx: Context<CheckoutCustomerIdentityUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateCustomerIdentity.execute(
        ctx.params
      );
    },

    /**
     * Update customer note
     */
    async updateCustomerNote(
      this: ServiceThis,
      ctx: Context<CheckoutCustomerNoteUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateCustomerNote.execute(ctx.params);
    },

    /**
     * Update language code
     */
    async updateLanguageCode(
      this: ServiceThis,
      ctx: Context<CheckoutLanguageCodeUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateLanguageCode.execute(ctx.params);
    },

    /**
     * Update currency code
     */
    async updateCurrencyCode(
      this: ServiceThis,
      ctx: Context<CheckoutCurrencyCodeUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateCurrencyCode.execute(ctx.params);
    },

    /**
     * Add promo code
     */
    async addPromoCode(
      this: ServiceThis,
      ctx: Context<CheckoutPromoCodeAddInput>
    ) {
      return this.app.checkoutUsecase.addPromoCode.execute(ctx.params);
    },

    /**
     * Remove promo code
     */
    async removePromoCode(
      this: ServiceThis,
      ctx: Context<CheckoutPromoCodeRemoveInput>
    ) {
      return this.app.checkoutUsecase.removePromoCode.execute(ctx.params);
    },

    /**
     * Update delivery group method
     */
    async updateDeliveryGroupMethod(
      this: ServiceThis,
      ctx: Context<CheckoutDeliveryMethodUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateDeliveryGroupMethod.execute(
        ctx.params
      );
    },

    /**
     * Add delivery address
     */
    async addDeliveryAddress(
      this: ServiceThis,
      ctx: Context<CheckoutDeliveryAddressAddInput>
    ) {
      return this.app.checkoutUsecase.addDeliveryAddress.execute(ctx.params);
    },

    /**
     * Update delivery address
     */
    async updateDeliveryAddress(
      this: ServiceThis,
      ctx: Context<CheckoutDeliveryAddressUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateDeliveryAddress.execute(ctx.params);
    },

    /**
     * Remove delivery address
     */
    async removeDeliveryAddress(
      this: ServiceThis,
      ctx: Context<CheckoutDeliveryAddressRemoveInput>
    ) {
      return this.app.checkoutUsecase.removeDeliveryAddress.execute(ctx.params);
    },

    /**
     * Update delivery group address
     */
    async updateDeliveryGroupAddress(
      this: ServiceThis,
      ctx: Context<CheckoutDeliveryGroupAddressUpdateInput>
    ) {
      return this.app.checkoutUsecase.updateDeliveryGroupAddress.execute(
        ctx.params
      );
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Checkout service initializing...");

    // Initialize the App container
    this.app = App.getInstance();

    this.logger.info("Checkout service created successfully");
  },

  async started() {
    this.logger.info("Checkout service starting...");
    try {
      // The App container handles all initialization
      // including database connections, event store, etc.

      // Start GraphQL server
      this.logger.info("Starting GraphQL server...");
      this.graphqlServer = await startServer(this.broker);
      this.logger.info("GraphQL server started successfully");

      this.logger.info(
        "Checkout service started and ready to process requests!"
      );
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Checkout service stopping...");

    // Close GraphQL server
    if (this.graphqlServer) {
      try {
        this.logger.info("Closing GraphQL server...");
        await this.graphqlServer.close();
        this.logger.info("GraphQL server closed successfully");
      } catch (error) {
        this.logger.error("Error closing GraphQL server:", error);
      }
    }

    // Clean up resources if needed
    // The App container should handle cleanup

    this.logger.info("Checkout service stopped successfully");
  },
};

export default CheckoutService;
