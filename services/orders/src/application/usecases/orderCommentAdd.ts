import { UseCase } from "@src/application/usecases/useCase";
import type { OrderContext } from "@src/context/index.js";
import type { AddOrderCommentCommand } from "@src/domain/order/commands";

export interface AddOrderCommentInput {
  orderId: string;
  comment: string;
}

export interface AddOrderCommentUseCaseInput extends OrderContext {
  orderId: string;
  comment: string;
}

/**
 * Use case for adding a comment to an order
 */
export class AddOrderCommentUseCase extends UseCase<
  AddOrderCommentUseCaseInput,
  boolean
> {
  async execute(input: AddOrderCommentUseCaseInput): Promise<boolean> {
    const { apiKey, project, customer, user, orderId, comment } = input;
    const context = { apiKey, project, customer, user };

    try {
      // Load order state to validate existence and access
      const { state, streamExists, streamVersion, streamId } =
        await this.loadOrderState(orderId);

      this.validateOrderExists(streamExists);
      this.validateTenantAccess(state, context);

      const command: AddOrderCommentCommand = {
        type: "order.comment.add",
        data: { comment },
        metadata: this.createCommandMetadata(orderId, context),
      };

      // TODO: Use order decider to process command and generate events
      // const events = orderDecider.decide(command, state);

      // TODO: Append events to stream
      // await this.appendToStream(streamId, events, streamVersion);

      this.logger.info({
        orderId,
        projectId: context.project.id,
        userId: context.user?.id,
        commentLength: comment.length
      }, "Added comment to order");

      // Placeholder return - should return true after successful implementation
      console.log(`Adding comment to order ${orderId}: ${comment}`);
      return true;

    } catch (error) {
      this.logger.error({ error, orderId }, "Failed to add order comment");

      // Re-throw known errors as-is
      if (error instanceof Error && error.message === "Order does not exist") {
        throw error;
      }
      if (error instanceof Error && error.message === "Forbidden") {
        throw error;
      }

      throw new Error(
        `Failed to add order comment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
