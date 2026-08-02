import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryGroupRecipientUpdateInput } from "../checkout/types.js";
import { assertUniqueIds, destinationIdForGroup, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateDeliveryGroupRecipientUseCase extends UseCase<CheckoutDeliveryGroupRecipientUpdateInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutDeliveryGroupRecipientUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, updates } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "DELIVERY_RECIPIENT_UPDATE",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft, current) => {
        assertUniqueIds(updates.map(({ deliveryGroupId }) => deliveryGroupId), "delivery group");
        const byDestination = new Map(updates.map((update) => [
          destinationIdForGroup(current, update.deliveryGroupId),
          update.recipient,
        ]));
        draft.cartIntent = {
          ...draft.cartIntent,
          destinations: draft.cartIntent.destinations.map((destination) => {
            const recipient = byDestination.get(destination.destinationId);
            return recipient
              ? {
                  ...destination,
                  address: {
                    ...destination.address,
                    firstName: recipient.firstName ?? null,
                    middleName: recipient.middleName ?? null,
                    lastName: recipient.lastName ?? null,
                    email: recipient.email ?? null,
                    phone: recipient.phone ?? null,
                  },
                }
              : destination;
          }),
        };
      },
    })).checkout;
  }
}
