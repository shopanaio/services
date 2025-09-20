import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCancelArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-admin-api/types";

/**
 * orderCancel(input: OrderCancelInput!): Boolean!
 */
export const orderCancel = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCancelArgs
) => {
  // TODO: Implement order cancel logic
  // This would involve calling appropriate use case or service

  const { orderId, comment, reason } = args.input;

  try {
    // Placeholder implementation - should be replaced with actual business logic
    console.log(`Cancelling order ${orderId} with reason: ${reason}${comment ? `, comment: ${comment}` : ''}`);

    // Example: App.getInstance().orderService.cancelOrder(orderId, reason, comment);

    return true;
  } catch (error) {
    console.error("Failed to cancel order:", error);
    return false;
  }
};
