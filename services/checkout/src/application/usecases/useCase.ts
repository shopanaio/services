import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";
import { type CheckoutContext } from "@src/context/index.js";
import {
  checkoutDecider,
  checkoutInitialState,
  type CheckoutState,
} from "@src/domain/checkout/decider";
import type { CheckoutEvent } from "@src/domain/checkout/events";
import { CheckoutEventsContractVersion } from "@src/domain/checkout/events";
import { Checkout } from "@src/domain/checkout/model";
import type { ShippingApiClient } from "@shopana/shipping-api";
import type { PricingApiClient } from "@shopana/pricing-api";
import { CheckoutService } from "@src/application/services/checkoutService";
import {
  ConcurrencyError,
  ValidationError,
  IllegalStateError,
  NotFoundError,
} from "@event-driven-io/emmett";
import { InventoryApiClient } from "@shopana/inventory-api";

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
  /** Checkout service for professional totals computation and pricing validation */
  checkoutService: CheckoutService;
}

/**
 * Abstract base class for all use cases in the checkout domain.
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
  /** Checkout service for totals/pricing */
  protected readonly checkoutService: CheckoutService;

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
    this.checkoutService = deps.checkoutService;
  }

  /**
   * Executes the use case with the provided input.
   * Must be implemented by concrete use case classes.
   *
   * @param input - The input data for the use case (includes CheckoutContext)
   * @returns Promise resolving to the use case output
   */
  abstract execute(input: TInput): Promise<TOutput>;

  /**
   * Loads the current state of a checkout aggregate by replaying all events in its stream.
   *
   * @param checkoutId - The unique identifier of the checkout to load
   * @returns Promise resolving to an object containing the checkout state, stream metadata, and identifiers
   * @example
   * ```typescript
   * const { state, streamExists, streamVersion } = await this.loadCheckoutState('checkout-123');
   * if (streamExists) {
   *   // Process the checkout state
   * }
   * ```
   */
  protected async loadCheckoutState(checkoutId: string): Promise<{
    state: CheckoutState;
    streamExists: boolean;
    streamVersion: bigint;
    streamId: string;
  }> {
    try {
      const streamId =
        this.streamNames.buildCheckoutStreamNameFromId(checkoutId);

      const result = await this.store.aggregateStream<
        CheckoutState,
        CheckoutEvent
      >(streamId, {
        initialState: checkoutInitialState,
        evolve: (state: CheckoutState, event: CheckoutEvent) =>
          checkoutDecider.evolve(state, event),
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
        `Failed to load checkout state for checkout ${checkoutId}: ${
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
    context: CheckoutContext,
    idempotencyKey?: string
  ) {
    const ctx = context;
    return {
      aggregateId,
      apiKey: ctx.apiKey,
      contractVersion: CheckoutEventsContractVersion,
      now: new Date(),
      projectId: ctx.project.id,
      userId: ctx.user?.id,
      ...(idempotencyKey && { idempotencyKey }),
    };
  }

  /**
   * Validates that a checkout stream exists.
   *
   * @param streamExists - Boolean indicating whether the stream exists
   * @throws Error if the checkout does not exist
   */
  protected validateCheckoutExists(streamExists: boolean): void {
    if (!streamExists) {
      throw new Error("Checkout does not exist");
    }
  }

  /**
   * Validates that the current tenant has access to the checkout.
   * Compares the checkout's tenant ID with the current context project.
   *
   * @param state - The checkout state containing tenant information
   * @throws Error if the tenant does not have access to the checkout
   */
  protected validateTenantAccess(state: CheckoutState, context: CheckoutContext): void {
    const ctx = context;
    if (state.projectId && state.projectId !== ctx.project.id) {
      throw new Error("Forbidden");
    }
  }

  protected validateCurrencyCode(
    state: CheckoutState
  ): asserts state is CheckoutState & { currencyCode: string } {
    if (!state.currencyCode) {
      throw new Error("Checkout currency is not set");
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
   * Retrieves a checkout domain model by its identifier.
   * Loads the checkout state and converts it to a domain model instance.
   *
   * @param checkoutId - The unique identifier of the checkout to retrieve
   * @returns Promise resolving to a Checkout domain model or null if not found
   * @example
   * ```typescript
   * const checkout = await this.getCheckoutById('checkout-123');
   * if (checkout) {
   *   // Work with the checkout domain model
   * }
   * ```
   */
  protected async getCheckoutById(
    checkoutId: string
  ): Promise<Checkout | null> {
    try {
      const { state, streamExists } = await this.loadCheckoutState(checkoutId);
      if (!streamExists) return null;
      return Checkout.fromAggregate(checkoutId, state);
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
        `Failed to get checkout ${checkoutId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
