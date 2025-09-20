import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCommentAddArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-admin-api/types";

/**
 * orderCommentAdd(input: OrderCommentAddInput!): Boolean!
 */
export const orderCommentAdd = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCommentAddArgs
) => {
  // TODO: Implement order comment add logic
  // This would involve calling appropriate use case or service

  const { orderId, comment } = args.input;

  try {
    // Placeholder implementation - should be replaced with actual business logic
    console.log(`Adding comment for order ${orderId}: ${comment}`);

    // Example: App.getInstance().orderService.addComment(orderId, comment);

    return true;
  } catch (error) {
    console.error("Failed to add order comment:", error);
    return false;
  }
};
