import type {
  CheckoutState,
  CheckoutDeliveryAddress,
  CheckoutPromoCode,
  CheckoutDeliveryGroup,
} from "@src/domain/checkout/decider";
import { Money } from "@shopana/money";
import { coerceToDate } from "@src/utils/date";

// Domain line item modeled after checkout_line_items schema (simplified)
/**
 * Domain representation of a checkout line item (aligned with `checkout_line_items` table)
 *
 * Notes for extension:
 * - Monetary values are in minor units (e.g. cents)
 * - `metadata` is reserved for technical/opaque data, not business logic
 * - All timestamps are UTC
 */
// Moved to decider.ts as single source of truth

/**
 * Domain model for a single checkout line item.
 *
 * This class provides an object-oriented façade around raw line item data, enabling
 * richer behavior (e.g., domain validations/formatting) without mutating the source state.
 */
// Removed OO line item façade; domain exposes raw value object with Money fields

/**
 * Checkout domain model (aggregate façade)
 *
 * Responsibilities:
 * - Encapsulate aggregate state exposed via domain-centric getters
 * - Provide stable view mapping for interfaces (GraphQL/REST)
 * - Remain immutable; state transitions occur only via events (decider)
 */
export class Checkout {
  private readonly state: CheckoutState;
  private readonly id: string;

  private constructor(id: string, state: CheckoutState) {
    this.id = id;
    this.state = state;
  }

  static fromAggregate(id: string, state: CheckoutState): Checkout {
    return new Checkout(id, state);
  }

  getId(): string {
    return this.id;
  }

  getprojectId(): string {
    return this.state.projectId;
  }

  getIdempotencyKey(): string {
    return this.state.idempotencyKey;
  }

  getCurrencyCode(): string {
    return this.state.currencyCode;
  }

  getSubtotal(): Money {
    return this.state.subtotal;
  }

  getGrandTotal(): Money {
    return this.state.grandTotal;
  }

  getDiscountTotal(): Money {
    return this.state.discountTotal;
  }

  getTaxTotal(): Money {
    return this.state.taxTotal;
  }

  getShippingTotal(): Money {
    return this.state.shippingTotal;
  }

  getCreatedAt(): Date {
    return this.state.createdAt;
  }

  getUpdatedAt(): Date {
    return this.state.updatedAt;
  }

  getStatus(): string {
    return this.state.status;
  }

  // removed: getLineItems() — use read model repository for line items

  getTotalQuantity(): bigint {
    return BigInt(this.state.totalQuantity);
  }

  // Customer Identity getters
  getCustomerEmail(): string | null {
    return this.state.customerEmail;
  }

  getCustomerId(): string | null {
    return this.state.customerId;
  }

  getCustomerPhone(): string | null {
    return this.state.customerPhone;
  }

  getCustomerCountryCode(): string | null {
    return this.state.customerCountryCode;
  }

  getCustomerNote(): string | null {
    return this.state.customerNote;
  }

  // Delivery Groups getters
  getDeliveryGroups(): CheckoutDeliveryGroup[] {
    return this.state.deliveryGroups;
  }

  // Promo codes getters
  getAppliedPromoCodes(): CheckoutPromoCode[] {
    return this.state.appliedPromoCodes;
  }

  // Locale/Currency getters (for backward compatibility during migration)
  getLocaleCode(): string | null {
    return this.state.localeCode;
  }

  // Legacy delivery addresses facade - extracts addresses from delivery groups
  getDeliveryAddresses(): CheckoutDeliveryAddress[] {
    return (this.state.deliveryGroups ?? [])
      .map((group) => group.deliveryAddress)
      .filter((addr): addr is CheckoutDeliveryAddress => addr !== null);
  }
}
