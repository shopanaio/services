import { UseCase } from "@src/application/usecases/useCase";
import type { OrderContext } from "@src/context/index.js";

export interface CancelOrderInput {
  orderId: string;
  reason: string; // OrderCancelReason enum value
  comment?: string;
}

export interface CancelOrderUseCaseInput extends OrderContext {
  orderId: string;
  reason: string;
  comment?: string;
}

/**
 * Use case for cancelling an order
 */
export class CancelOrderUseCase extends UseCase<
  CancelOrderUseCaseInput,
  boolean
> {
  async execute(input: CancelOrderUseCaseInput): Promise<boolean> {
    const { apiKey, project, customer, user, orderId, reason, comment } = input;
    const context = { apiKey, project, customer, user };

    try {
      // Load order state to validate existence and access
      const { state, streamExists, streamVersion, streamId } =
        await this.loadOrderState(orderId);

      this.validateOrderExists(streamExists);
      this.validateTenantAccess(state, context);

      // TODO: Validate business rules for order cancellation
      // - Check if order status allows cancellation
      // - Check if user has permission to cancel orders
      // - Validate cancellation reason

      // TODO: Create and implement CancelOrderCommand in domain layer
      // const command: CancelOrderCommand = {
      //   type: "order.cancel",
      //   data: { reason, comment },
      //   metadata: this.createCommandMetadata(orderId, context),
      // };

      // TODO: Use order decider to process command and generate events
      // const events = orderDecider.decide(command, state);

      // TODO: Append events to stream
      // await this.appendToStream(streamId, events, streamVersion);

      // TODO: Trigger side effects like:
      // - Inventory restoration
      // - Payment refund processing
      // - Customer notification
      // - External system integration

      this.logger.info({
        orderId,
        projectId: context.project.id,
        userId: context.user?.id,
        reason,
        hasComment: !!comment
      }, "Cancelled order");

      // Placeholder return - should return true after successful implementation
      console.log(`Cancelling order ${orderId} with reason: ${reason}${comment ? `, comment: ${comment}` : ''}`);
      return true;

    } catch (error) {
      this.logger.error({ error, orderId }, "Failed to cancel order");

      // Re-throw known errors as-is
      if (error instanceof Error && error.message === "Order does not exist") {
        throw error;
      }
      if (error instanceof Error && error.message === "Forbidden") {
        throw error;
      }

      throw new Error(
        `Failed to cancel order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
