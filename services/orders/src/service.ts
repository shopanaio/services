import { Service, ServiceSchema, Context } from "moleculer";
import { FastifyInstance } from "fastify";
import "reflect-metadata";

import { App } from "@src/ioc/container";
import { startServer } from "@src/interfaces/server/server";
import type {
  CreateOrderInput,
  OrderLinesAddInput,
  OrderLinesUpdateInput,
  OrderLinesDeleteInput,
  OrderLinesClearInput,
  OrderCustomerIdentityUpdateInput,
  OrderCustomerNoteUpdateInput,
  OrderLanguageCodeUpdateInput,
  OrderCurrencyCodeUpdateInput,
  OrderPromoCodeAddInput,
  OrderPromoCodeRemoveInput,
  OrderDeliveryAddressAddInput,
  OrderDeliveryAddressUpdateInput,
  OrderDeliveryAddressRemoveInput,
  OrderDeliveryGroupAddressUpdateInput,
  OrderDeliveryMethodUpdateInput,
  OrderContext,
} from "@src/application/order/types";

// Define extended `this` type for Moleculer service context.
type ServiceThis = Service & {
  app: App;
  graphqlServer: FastifyInstance;
};

const OrderService: ServiceSchema<any> = {
  name: "order",

  /**
   * Service actions
   * Maps order use cases to Moleculer actions
   */
  actions: {
    /**
     * Create new order
     */
    async createOrder(this: ServiceThis, ctx: Context<CreateOrderInput>) {
      return this.app.orderUsecase.createOrder.execute(ctx.params);
    },

    /**
     * Get order by ID
     */
    async getOrderById(
      this: ServiceThis,
      ctx: Context<{ orderId: string } & OrderContext>
    ) {
      const { orderId } = ctx.params;
      return this.app.orderUsecase.getOrderById.execute({
        orderId,
      });
    },
  },

  /**
   * Lifecycle methods
   */
  created() {
    this.logger.info("Order service initializing...");

    // Initialize the App container
    this.app = App.getInstance();

    this.logger.info("Order service created successfully");
  },

  async started() {
    this.logger.info("Order service starting...");
    try {
      // The App container handles all initialization
      // including database connections, event store, etc.

      // Start GraphQL server
      this.logger.info("Starting GraphQL server...");
      this.graphqlServer = await startServer(this.broker);
      this.logger.info("GraphQL server started successfully");

      this.logger.info(
        "Order service started and ready to process requests!"
      );
    } catch (error) {
      this.logger.error("Error during service startup:", error);
      throw error;
    }
  },

  async stopped() {
    this.logger.info("Order service stopping...");

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

    this.logger.info("Order service stopped successfully");
  },
};

export default OrderService;
