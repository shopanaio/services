import { UseCase } from "@src/application/usecases/useCase";
import type { OrderContext } from "@src/context/index.js";

export interface CloseOrderInput {
  orderId: string;
  comment?: string;
}

export interface CloseOrderUseCaseInput extends OrderContext {
  orderId: string;
  comment?: string;
}

/**
 * Use case for closing an order
 */
export class CloseOrderUseCase extends UseCase<
  CloseOrderUseCaseInput,
  boolean
> {
  async execute(input: CloseOrderUseCaseInput): Promise<boolean> {
    const { apiKey, project, customer, user, orderId, comment } = input;
    const context = { apiKey, project, customer, user };

    try {
      // Load order state to validate existence and access
      const { state, streamExists, streamVersion, streamId } =
        await this.loadOrderState(orderId);

      this.validateOrderExists(streamExists);
      this.validateTenantAccess(state, context);

      // TODO: Validate business rules for order closure
      // - Check if order status allows closure
      // - Check if user has permission to close orders
      // - Verify all required conditions are met (e.g., payment completed, items shipped)

      // TODO: Create and implement CloseOrderCommand in domain layer
      // const command: CloseOrderCommand = {
      //   type: "order.close",
      //   data: { comment },
      //   metadata: this.createCommandMetadata(orderId, context),
      // };

      // TODO: Use order decider to process command and generate events
      // const events = orderDecider.decide(command, state);

      // TODO: Append events to stream
      // await this.appendToStream(streamId, events, streamVersion);

      // TODO: Trigger side effects like:
      // - Final reporting updates
      // - Customer notification
      // - External system integration
      // - Analytics events

      this.logger.info({
        orderId,
        projectId: context.project.id,
        userId: context.user?.id,
        hasComment: !!comment
      }, "Closed order");

      // Placeholder return - should return true after successful implementation
      console.log(`Closing order ${orderId}${comment ? ` with comment: ${comment}` : ''}`);
      return true;

    } catch (error) {
      this.logger.error({ error, orderId }, "Failed to close order");

      // Re-throw known errors as-is
      if (error instanceof Error && error.message === "Order does not exist") {
        throw error;
      }
      if (error instanceof Error && error.message === "Forbidden") {
        throw error;
      }

      throw new Error(
        `Failed to close order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
