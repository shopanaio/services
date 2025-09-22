import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";
import { type OrderContext } from "@src/context/index.js";
import {
  orderDecider,
  orderInitialState,
  type OrderState,
} from "@src/domain/order/decider";
import type { OrderEvent } from "@src/domain/order/events";
import { OrderEventsContractVersion } from "@src/domain/order/events";
import { Order } from "@src/domain/order/model";
import type { ShippingApiClient } from "@shopana/shipping-api";
import type { PricingApiClient } from "@shopana/pricing-api";
import { OrderService } from "@src/application/services/orderService";
import {
  ConcurrencyError,
  ValidationError,
  IllegalStateError,
  NotFoundError,
} from "@event-driven-io/emmett";
import { InventoryApiClient } from "@shopana/inventory-api";
import type { CheckoutApiClient } from "@shopana/checkout-api";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";

/**
 * Dependencies required for use case execution.
 */
export interface UseCaseDependencies {
  /** Event store port for persisting and retrieving events */
  eventStore: EventStorePort;
  /** Stream name policy for generating stream identifiers */
  streamNames: StreamNamePolicyPort;
  /** Optional logger instance for debugging and monitoring */
  logger?: Logger;
  /** Shipping API client for interacting with the shipping service */
  shippingApiClient: ShippingApiClient;
  /** Pricing API client for interacting with the pricing service */
  pricingApiClient: PricingApiClient;
  /** Inventory API client for interacting with the inventory service */
  inventory: InventoryApiClient;
  /** Checkout API client for interacting with the checkout service */
  checkoutApiClient: CheckoutApiClient;
  /** Order service for professional totals computation and pricing validation */
  orderService: OrderService;
  /** Repository for persisting Order PII in dedicated tables */
  ordersPiiRepository: OrdersPiiRepository;
  /** Idempotency repository for API-level deduplication */
  idempotencyRepository: IdempotencyRepository;
}

/**
 * Abstract base class for all use cases in the order domain.
 * Provides common functionality for event sourcing operations including
 * state loading, event appending, and validation.
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type for the use case
 */
export abstract class UseCase<TInput = any, TOutput = any> {
  /** Event store instance for persisting and retrieving events */
  protected readonly store: EventStorePort;
  /** Stream name policy for generating consistent stream identifiers */
  protected readonly streamNames: StreamNamePolicyPort;
  /** Logger instance for debugging and monitoring */
  protected readonly logger: Pick<Logger, "info" | "warn" | "error" | "debug">;
  /** Shipping API client for interacting with the shipping service */
  protected readonly shippingApi: ShippingApiClient;
  /** Pricing API client for interacting with the pricing service */
  protected readonly pricingApi: PricingApiClient;
  /** Inventory API client for interacting with the inventory service */
  protected readonly inventory: InventoryApiClient;
  /** Checkout API client */
  protected readonly checkoutApi: CheckoutApiClient;
  /** Order service for totals/pricing */
  protected readonly orderService: OrderService;
  /** PII repository */
  protected readonly ordersPiiRepository: OrdersPiiRepository;
  /** Idempotency repository */
  protected readonly idempotencyRepository: IdempotencyRepository;
  /**
   * Creates a new use case instance with the provided dependencies.
   *
   * @param deps - The required dependencies for use case execution
   */
  constructor(deps: UseCaseDependencies) {
    this.store = deps.eventStore;
    this.streamNames = deps.streamNames;
    this.logger = deps.logger ?? console;
    this.shippingApi = deps.shippingApiClient;
    this.pricingApi = deps.pricingApiClient;
    this.inventory = deps.inventory;
    this.checkoutApi = deps.checkoutApiClient;
    this.orderService = deps.orderService;
    this.ordersPiiRepository = deps.ordersPiiRepository;
    this.idempotencyRepository = deps.idempotencyRepository;
  }

  /**
   * Executes the use case with the provided input.
   * Must be implemented by concrete use case classes.
   *
   * @param input - The input data for the use case (includes OrderContext)
   * @returns Promise resolving to the use case output
   */
  abstract execute(input: TInput): Promise<TOutput>;

  /**
   * Loads the current state of a order aggregate by replaying all events in its stream.
   *
   * @param orderId - The unique identifier of the order to load
   * @returns Promise resolving to an object containing the order state, stream metadata, and identifiers
   * @example
   * ```typescript
   * const { state, streamExists, streamVersion } = await this.loadOrderState('order-123');
   * if (streamExists) {
   *   // Process the order state
   * }
   * ```
   */
  protected async loadOrderState(orderId: string): Promise<{
    state: OrderState;
    streamExists: boolean;
    streamVersion: bigint;
    streamId: string;
  }> {
    try {
      const streamId =
        this.streamNames.buildOrderStreamNameFromId(orderId);

      const result = await this.store.aggregateStream<
        OrderState,
        OrderEvent
      >(streamId, {
        initialState: orderInitialState,
        evolve: (state: OrderState, event: OrderEvent) =>
          orderDecider.evolve(state, event),
      });

      return {
        state: result.state,
        streamExists: result.streamExists,
        // @ts-expect-error incorrect library typings
        streamVersion: result.currentStreamVersion,
        streamId,
      };
    } catch (error) {
      // Rethrow business errors as is
      if (
        error instanceof ConcurrencyError ||
        error instanceof ValidationError ||
        error instanceof IllegalStateError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }

      // For other errors, create a general error
      throw new Error(
        `Failed to load order state for order ${orderId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Creates metadata for commands to be appended to event streams.
   * Includes context data, timing information, and optional idempotency key.
   *
   * @param aggregateId - The identifier of the aggregate being modified
   * @param idempotencyKey - Optional key to ensure command idempotency
   * @returns Command metadata object with context and timing information
   */
  protected createCommandMetadata(
    aggregateId: string,
    context: OrderContext,
    idempotencyKey?: string
  ) {
    const ctx = context;
    return {
      aggregateId,
      apiKey: ctx.apiKey,
      contractVersion: OrderEventsContractVersion,
      now: new Date(),
      projectId: ctx.project.id,
      userId: ctx.user?.id,
      ...(idempotencyKey && { idempotencyKey }),
    };
  }

  /**
   * Validates that a order stream exists.
   *
   * @param streamExists - Boolean indicating whether the stream exists
   * @throws Error if the order does not exist
   */
  protected validateOrderExists(streamExists: boolean): void {
    if (!streamExists) {
      throw new Error("Order does not exist");
    }
  }

  /**
   * Validates that the current tenant has access to the order.
   * Compares the order's tenant ID with the current context project.
   *
   * @param state - The order state containing tenant information
   * @throws Error if the tenant does not have access to the order
   */
  protected validateTenantAccess(state: OrderState, context: OrderContext): void {
    const ctx = context;
    if (state.projectId && state.projectId !== ctx.project.id) {
      throw new Error("Forbidden");
    }
  }

  protected validateCurrencyCode(
    state: OrderState
  ): asserts state is OrderState & { currencyCode: string } {
    if (!state.currencyCode) {
      throw new Error("Order currency is not set");
    }
  }

  /**
   * Appends events to an event stream with optimistic concurrency control.
   * Automatically converts single events to arrays and handles version checking.
   *
   * @param streamId - The identifier of the stream to append events to
   * @param events - Single event or array of events to append
   * @param streamVersion - Expected stream version for optimistic concurrency control
   * @throws Error if the stream version doesn't match the expected version
   */
  protected async appendToStream(
    streamId: string,
    events: any | any[],
    streamVersion: bigint | "STREAM_DOES_NOT_EXIST"
  ): Promise<void> {
    try {
      await this.store.appendToStream(
        streamId,
        Array.isArray(events) ? events : [events],
        { expectedStreamVersion: streamVersion }
      );
    } catch (error) {
      if (
        error instanceof ConcurrencyError ||
        error instanceof ValidationError ||
        error instanceof IllegalStateError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }

      // For other errors, create a general error
      throw new Error(
        `Failed to append events to stream ${streamId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieves a order domain model by its identifier.
   * Loads the order state and converts it to a domain model instance.
   *
   * @param orderId - The unique identifier of the order to retrieve
   * @returns Promise resolving to a Order domain model or null if not found
   * @example
   * ```typescript
   * const order = await this.getOrderById('order-123');
   * if (order) {
   *   // Work with the order domain model
   * }
   * ```
   */
  protected async getOrderById(
    orderId: string
  ): Promise<Order | null> {
    try {
      const { state, streamExists } = await this.loadOrderState(orderId);
      if (!streamExists) return null;
      return Order.fromAggregate(orderId, state);
    } catch (error) {
      // Rethrow business errors as is
      if (
        error instanceof ConcurrencyError ||
        error instanceof ValidationError ||
        error instanceof IllegalStateError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }

      // For other errors, create a general error
      throw new Error(
        `Failed to get order ${orderId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
