import { App } from "@src/ioc/container";
import type { ApiUser } from "@src/interfaces/gql-storefront-api/types";
import type { OrderReadView } from "@src/application/read/orderReadRepository";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";

/**
 * User.orders: [Order!]!
 */
export const userOrders = async (parent: ApiUser) => {
  const userId = parent.id;
  const app = App.getInstance();

  try {
    // TODO: Replace placeholder once repository method for user orders is implemented.
    const orders: OrderReadView[] = [];

    app.logger.debug({ userId }, "Returning placeholder orders for user");

    return orders.map(mapOrderReadToApi);
  } catch (error) {
    app.logger.error({ error, userId }, "Failed to fetch user orders");
    return [];
  }
};
