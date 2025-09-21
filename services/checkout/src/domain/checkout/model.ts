import type {
  CheckoutState,
  CheckoutDeliveryAddress,
  CheckoutDeliveryGroup,
} from "@src/domain/checkout/decider";
import type { CheckoutDto } from "@shopana/checkout-sdk";
import type { Money } from "@shopana/shared-money";
import { CheckoutSerializer } from "./checkout-serializer";

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
  private readonly serializer: CheckoutSerializer;

  private constructor(id: string, state: CheckoutState) {
    this.id = id;
    this.state = state;
    this.serializer = new CheckoutSerializer();
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

  // removed: getAppliedPromoCodes — promo codes are not part of aggregate state

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

  toJSON(): CheckoutDto {
    return this.serializer.toJSON(this.id, this.state);
  }
}
