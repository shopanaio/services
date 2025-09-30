import type { Logger } from "pino";
import { type CheckoutContext } from "@src/context/index.js";
import type { CheckoutState } from "@src/domain/checkout/types";
import type { ShippingApiClient, PaymentApiClient, PricingApiClient, InventoryApiClient } from "@shopana/shared-service-api";
import { CheckoutService } from "@src/application/services/checkoutService";
import { CheckoutReadRepository as AppCheckoutReadRepository } from "@src/application/read/checkoutReadRepository";
import { CheckoutWriteRepository } from "@src/infrastructure/writeModel/checkoutWriteRepository";

/**
 * Dependencies required for use case execution.
 */
export interface UseCaseDependencies {
  /** Optional logger instance for debugging and monitoring */
  logger?: Logger;
  /** Shipping API client for interacting with the shipping service */
  shippingApiClient: ShippingApiClient;
  /** Payment API client for interacting with the payment service */
  paymentApiClient: PaymentApiClient;
  /** Pricing API client for interacting with the pricing service */
  pricingApiClient: PricingApiClient;
  /** Inventory API client for interacting with the inventory service */
  inventory: InventoryApiClient;
  /** Checkout service for professional totals computation and pricing validation */
  checkoutService: CheckoutService;
  /** Read repository as single source of truth for checkout data */
  checkoutReadRepository: AppCheckoutReadRepository;
  /** Write repository for mutating checkout read model */
  checkoutWriteRepository: CheckoutWriteRepository;
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
  /** Logger instance for debugging and monitoring */
  protected readonly logger: Pick<Logger, "info" | "warn" | "error" | "debug">;
  /** Shipping API client for interacting with the shipping service */
  protected readonly shippingApi: ShippingApiClient;
  /** Payment API client for interacting with the payment service */
  protected readonly paymentApi: PaymentApiClient;
  /** Pricing API client for interacting with the pricing service */
  protected readonly pricingApi: PricingApiClient;
  /** Inventory API client for interacting with the inventory service */
  protected readonly inventory: InventoryApiClient;
  /** Checkout service for totals/pricing */
  protected readonly checkoutService: CheckoutService;
  /** Read repository for checkouts */
  protected readonly checkoutReadRepository: AppCheckoutReadRepository;
  /** Write repository for checkouts */
  protected readonly checkoutWriteRepository: CheckoutWriteRepository;

  /**
   * Creates a new use case instance with the provided dependencies.
   *
   * @param deps - The required dependencies for use case execution
   */
  constructor(deps: UseCaseDependencies) {
    this.logger = deps.logger ?? console;
    this.shippingApi = deps.shippingApiClient;
    this.paymentApi = deps.paymentApiClient;
    this.pricingApi = deps.pricingApiClient;
    this.inventory = deps.inventory;
    this.checkoutService = deps.checkoutService;
    this.checkoutReadRepository = deps.checkoutReadRepository;
    this.checkoutWriteRepository = deps.checkoutWriteRepository;
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
   * Loads the current state of a checkout using read model as source of truth.
   */
  protected async getCheckoutState(
    checkoutId: string,
  ): Promise<CheckoutState | null> {
    return this.checkoutReadRepository.findByIdAsCheckoutState(checkoutId);
  }

  /**
   * Creates metadata DTO for write operations.
   */
  protected createMetadataDto(aggregateId: string, context: CheckoutContext) {
    const ctx = context;
    return {
      aggregateId,
      apiKey: ctx.apiKey,
      contractVersion: 3,
      now: new Date(),
      projectId: ctx.project.id,
      userId: ctx.user?.id,
    } as const;
  }

  // Event sourcing metadata is no longer used.

  /**
   * Validates that a checkout stream exists.
   *
   * @param streamExists - Boolean indicating whether the stream exists
   * @throws Error if the checkout does not exist
   */
  protected assertCheckoutExists(state: CheckoutState | null): asserts state is CheckoutState {
    if (!state) throw new Error("Checkout does not exist");
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

  // Event appends removed in favor of direct repository writes.

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
  // Domain aggregate reconstruction is removed; use read model methods directly in concrete use cases.
}
