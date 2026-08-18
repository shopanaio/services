import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryAddressRemoveInput } from "../checkout/types.js";
import { assertUniqueIds, invalidCheckoutMutation, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class RemoveDeliveryAddressUseCase extends UseCase<CheckoutDeliveryAddressRemoveInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutDeliveryAddressRemoveInput) {
    const { storefrontAccess, store, customer, user, checkoutId, addressIds } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "DELIVERY_ADDRESS_UPDATE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft, current) => {
        assertUniqueIds(addressIds, "delivery address");
        const ids = new Set(addressIds);
        const existing = new Set(draft.cartIntent.destinations.map(({ destinationId }) => destinationId));
        for (const id of ids) if (!existing.has(id)) throw invalidCheckoutMutation("CHECKOUT_DELIVERY_ADDRESS_NOT_FOUND", "Checkout delivery address was not found.");
        const removedGroups = current.result.delivery.status === "SUCCESS"
          ? new Set(current.result.delivery.data.groups.filter(({ destinationId }) => ids.has(destinationId)).map(({ groupId }) => groupId))
          : new Set<string>();
        draft.cartIntent = {
          ...draft.cartIntent,
          destinations: draft.cartIntent.destinations.filter(({ destinationId }) => !ids.has(destinationId)),
          selectedDeliveryOptions: draft.cartIntent.selectedDeliveryOptions.filter(({ groupId }) => !removedGroups.has(groupId)),
        };
      },
    })).checkout;
  }
}
