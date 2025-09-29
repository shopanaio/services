import type { CheckoutState } from "@src/domain/checkout/evolve";
import type { CheckoutDto } from "@shopana/checkout-sdk";
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

  toJSON(): CheckoutDto {
    return this.serializer.toJSON(this.id, this.state);
  }
}
