import { App } from "@src/ioc/container";
import type {
  ApiUser,
} from "@src/interfaces/gql-storefront-api/types";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";

/**
 * User.orders: [Order!]!
 */
export const userOrders = async (
  parent: ApiUser
) => {
  // TODO: Implement user orders retrieval logic
  // This would involve calling appropriate repository method to get orders by user ID

  const userId = parent.id;

  try {
    // Placeholder implementation - should be replaced with actual repository call
    console.log(`Fetching orders for user ${userId}`);

    // Example: const orders = await App.getInstance().orderReadRepository.findByUserId(userId);
    const orders: any[] = [];

    return orders.map(mapOrderReadToApi);
  } catch (error) {
    console.error("Failed to fetch user orders:", error);
    return [];
  }
};
