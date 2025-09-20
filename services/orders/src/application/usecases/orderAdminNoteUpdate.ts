import { UseCase } from "@src/application/usecases/useCase";
import type { OrderContext } from "@src/context/index.js";

export interface UpdateOrderAdminNoteInput {
  orderId: string;
  note: string;
}

export interface UpdateOrderAdminNoteUseCaseInput extends OrderContext {
  orderId: string;
  note: string;
}

/**
 * Use case for updating admin note on an order
 */
export class UpdateOrderAdminNoteUseCase extends UseCase<
  UpdateOrderAdminNoteUseCaseInput,
  boolean
> {
  async execute(input: UpdateOrderAdminNoteUseCaseInput): Promise<boolean> {
    const { apiKey, project, customer, user, orderId, note } = input;
    const context = { apiKey, project, customer, user };

    try {
      // Load order state to validate existence and access
      const { state, streamExists, streamVersion, streamId } =
        await this.loadOrderState(orderId);

      this.validateOrderExists(streamExists);
      this.validateTenantAccess(state, context);

      // TODO: Create and implement UpdateOrderAdminNoteCommand in domain layer
      // const command: UpdateOrderAdminNoteCommand = {
      //   type: "order.admin.note.update",
      //   data: { note },
      //   metadata: this.createCommandMetadata(orderId, context),
      // };

      // TODO: Use order decider to process command and generate events
      // const events = orderDecider.decide(command, state);

      // TODO: Append events to stream
      // await this.appendToStream(streamId, events, streamVersion);

      this.logger.info({
        orderId,
        projectId: context.project.id,
        userId: context.user?.id,
        noteLength: note.length
      }, "Updated order admin note");

      // Placeholder return - should return true after successful implementation
      console.log(`Updating admin note for order ${orderId}: ${note}`);
      return true;

    } catch (error) {
      this.logger.error({ error, orderId }, "Failed to update order admin note");

      // Re-throw known errors as-is
      if (error instanceof Error && error.message === "Order does not exist") {
        throw error;
      }
      if (error instanceof Error && error.message === "Forbidden") {
        throw error;
      }

      throw new Error(
        `Failed to update order admin note: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
