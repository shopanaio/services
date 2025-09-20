import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCloseArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-admin-api/types";

/**
 * orderClose(input: OrderCloseInput!): Boolean!
 */
export const orderClose = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCloseArgs
) => {
  // TODO: Implement order close logic
  // This would involve calling appropriate use case or service

  const { orderId, comment } = args.input;

  try {
    // Placeholder implementation - should be replaced with actual business logic
    console.log(`Closing order ${orderId}${comment ? ` with comment: ${comment}` : ''}`);

    // Example: App.getInstance().orderService.closeOrder(orderId, comment);

    return true;
  } catch (error) {
    console.error("Failed to close order:", error);
    return false;
  }
};
