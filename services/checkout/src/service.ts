import { Service, ServiceSchema, Context } from "moleculer";
import { FastifyInstance } from "fastify";
import "reflect-metadata";

import { App } from "@src/ioc/container";
import { startServer } from "@src/interfaces/server/server";
import type { CheckoutContext } from "@src/application/checkout/types";

// Define extended `this` type for Moleculer service context.
type ServiceThis = Service & {
  app: App;
  graphqlServer: FastifyInstance;
};

const CheckoutService: ServiceSchema<any> = {
  name: "checkout",

  actions: {
    /**
     * Get checkout by ID (serialized DTO from event store)
     */
    async getById(
      this: ServiceThis,
      ctx: Context<{ checkoutId: string; projectId: string } & CheckoutContext>
    ) {
      const { checkoutId, projectId } = ctx.params;
      return await this.app.checkoutUsecase.getCheckoutDtoById.execute({
        checkoutId,
        projectId,
      });

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
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Checkout service initializing...");

    // Initialize the App container with broker
    this.app = App.create(this.broker);

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
