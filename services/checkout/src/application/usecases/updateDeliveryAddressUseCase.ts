import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryAddressUpdateInput } from "../checkout/types.js";
import { toPipelineAddress } from "./addDeliveryAddressUseCase.js";
import {
  assertUniqueIds,
  invalidCheckoutMutation,
  type CheckoutCommittedSnapshot,
} from "../mutations/index.js";

export class UpdateDeliveryAddressUseCase extends UseCase<
  CheckoutDeliveryAddressUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutDeliveryAddressUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, updates } = input;
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "DELIVERY_ADDRESS_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => {
          assertUniqueIds(
            updates.map(({ addressId }) => addressId),
            "delivery address",
          );
          const byId = new Map(updates.map((update) => [update.addressId, update.address]));
          const found = new Set<string>();
          draft.cartIntent = {
            ...draft.cartIntent,
            destinations: draft.cartIntent.destinations.map((destination) => {
              const update = byId.get(destination.destinationId);
              if (!update) return destination;
              found.add(destination.destinationId);
              return {
                ...destination,
                address: toPipelineAddress({
                  ...update,
                  id: destination.destinationId,
                }),
              };
            }),
          };
          for (const { addressId } of updates) {
            if (!found.has(addressId))
              throw invalidCheckoutMutation(
                "CHECKOUT_DELIVERY_ADDRESS_NOT_FOUND",
                "Checkout delivery address was not found.",
              );
          }
        },
      })
    ).checkout;
  }
}
