import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderAdminNoteUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-admin-api/types";

/**
 * orderAdminNoteUpdate(input: OrderAdminNoteUpdateInput!): Boolean!
 */
export const orderAdminNoteUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderAdminNoteUpdateArgs
) => {
  // TODO: Implement order admin note update logic
  // This would involve calling appropriate use case or service

  const { orderId, note } = args.input;

  try {
    // Placeholder implementation - should be replaced with actual business logic
    console.log(`Updating admin note for order ${orderId} with note: ${note}`);

    // Example: App.getInstance().orderService.updateAdminNote(orderId, note);

    return true;
  } catch (error) {
    console.error("Failed to update order admin note:", error);
    return false;
  }
};
