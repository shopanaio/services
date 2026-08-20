import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryGroupRecipientRemoveInput } from "../checkout/types.js";
import {
  assertUniqueIds,
  destinationIdForGroup,
  type CheckoutCommittedSnapshot,
} from "../mutations/index.js";

export class RemoveDeliveryGroupRecipientUseCase extends UseCase<
  CheckoutDeliveryGroupRecipientRemoveInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutDeliveryGroupRecipientRemoveInput) {
    const { storefrontAccess, store, customer, user, checkoutId, deliveryGroupIds } = input;
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "DELIVERY_RECIPIENT_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft, current) => {
          assertUniqueIds(deliveryGroupIds, "delivery group");
          const destinationIds = new Set(
            deliveryGroupIds.map((groupId) => destinationIdForGroup(current, groupId)),
          );
          draft.cartIntent = {
            ...draft.cartIntent,
            destinations: draft.cartIntent.destinations.map((destination) =>
              destinationIds.has(destination.destinationId)
                ? {
                    ...destination,
                    address: {
                      ...destination.address,
                      firstName: null,
                      middleName: null,
                      lastName: null,
                      email: null,
                      phone: null,
                    },
                  }
                : destination,
            ),
          };
        },
      })
    ).checkout;
  }
}
