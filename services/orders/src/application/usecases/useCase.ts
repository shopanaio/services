import type { Logger } from "pino";
import { ConcurrencyError, EventStoreError } from "@src/application/errors/eventStoreErrors";
import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { orderDecider, orderInitialState, type OrderState } from "@src/domain/order/decider";
import type { OrderEvent } from "@src/domain/order/events";

export interface UseCaseDependencies {
  eventStore: EventStorePort;
  streamNames: StreamNamePolicyPort;
  logger?: Logger;
  idempotencyRepository: IdempotencyRepository;
}

export abstract class UseCase<TInput = unknown, TOutput = unknown> {
  protected readonly store: EventStorePort;
  protected readonly streamNames: StreamNamePolicyPort;
  protected readonly logger: Pick<Logger, "info" | "warn" | "error" | "debug">;
  protected readonly idempotencyRepository: IdempotencyRepository;

  constructor(deps: UseCaseDependencies) {
    this.store = deps.eventStore;
    this.streamNames = deps.streamNames;
    this.logger = deps.logger ?? console;
    this.idempotencyRepository = deps.idempotencyRepository;
  }

  abstract execute(input: TInput): Promise<TOutput>;

  protected async loadOrderState(orderId: string): Promise<{
    state: OrderState;
    streamExists: boolean;
    streamVersion: bigint;
    streamId: string;
  }> {
    const streamId = this.streamNames.buildOrderStreamNameFromId(orderId);
    try {
      const result = await this.store.aggregateStream<OrderState, OrderEvent>(streamId, {
        initialState: orderInitialState,
        evolve: orderDecider.evolve,
      });
      return {
        state: result.state,
        streamExists: result.streamExists,
        streamVersion: result.streamVersion ?? 0n,
        streamId,
      };
    } catch (error) {
      if (error instanceof EventStoreError) throw error;
      throw new Error(
        `Failed to load order state for order ${orderId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  protected async appendToStream(
    streamId: string,
    events: OrderEvent | OrderEvent[],
    streamVersion: bigint | "STREAM_DOES_NOT_EXIST",
  ): Promise<void> {
    try {
      await this.store.appendToStream(
        streamId,
        Array.isArray(events) ? events : [events],
        { expectedStreamVersion: streamVersion },
      );
    } catch (error) {
      if (error instanceof ConcurrencyError || error instanceof EventStoreError) throw error;
      throw new Error(
        `Failed to append events to stream ${streamId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}
