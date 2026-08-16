import { UseCase } from "./useCase.js";
import type {
  CheckoutLoyaltyRedemptionRemoveInput,
  CheckoutLoyaltyRedemptionUpdateInput,
} from "../checkout/types.js";
import {
  invalidCheckoutMutation,
  type CheckoutCommittedSnapshot,
} from "../mutations/index.js";

export class UpdateLoyaltyRedemptionUseCase extends UseCase<
  CheckoutLoyaltyRedemptionUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutLoyaltyRedemptionUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    if (!customer) {
      throw invalidCheckoutMutation(
        "LOYALTY_CUSTOMER_REQUIRED",
        "Sign in before applying loyalty points.",
      );
    }
    const requestedPoints = input.requestedPoints?.trim() ?? null;
    if (requestedPoints !== null && (!/^\d+$/.test(requestedPoints) || BigInt(requestedPoints) <= 0n)) {
      throw invalidCheckoutMutation(
        "LOYALTY_POINTS_INVALID",
        "Requested loyalty points must be a positive integer.",
      );
    }
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LOYALTY_REDEMPTION_UPDATE",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => {
        if (draft.buyerIdentity?.customerId !== customer.id) {
          throw invalidCheckoutMutation(
            "LOYALTY_CUSTOMER_MISMATCH",
            "Checkout customer does not match the authenticated customer.",
          );
        }
        draft.loyaltyRedemption = {
          requestedPoints,
          programId: input.programId,
        };
      },
    })).checkout;
  }
}

export class RemoveLoyaltyRedemptionUseCase extends UseCase<
  CheckoutLoyaltyRedemptionRemoveInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutLoyaltyRedemptionRemoveInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LOYALTY_REDEMPTION_UPDATE",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => { draft.loyaltyRedemption = null; },
    })).checkout;
  }
}
