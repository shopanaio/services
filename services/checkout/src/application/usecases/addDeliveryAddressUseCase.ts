import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryAddressAddInput, CheckoutDeliveryAddressFields } from "../checkout/types.js";
import { invalidCheckoutMutation, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class AddDeliveryAddressUseCase extends UseCase<CheckoutDeliveryAddressAddInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutDeliveryAddressAddInput) {
    const { storefrontAccess, store, customer, user, checkoutId, addresses } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "DELIVERY_ADDRESS_UPDATE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft) => {
        const rootLineIds = new Set(draft.cartIntent.lines.map(({ lineId }) => lineId));
        const assigned = new Set(draft.cartIntent.destinations.flatMap(({ lineIds }) => lineIds));
        for (const address of addresses) {
          for (const lineId of address.checkoutLineIds) {
            if (!rootLineIds.has(lineId)) {
              throw invalidCheckoutMutation("CHECKOUT_DELIVERY_LINE_INVALID", "A delivery destination can only assign existing root checkout lines.");
            }
            if (assigned.has(lineId)) {
              throw invalidCheckoutMutation("CHECKOUT_DELIVERY_LINE_ALREADY_ASSIGNED", "A checkout line cannot be assigned to multiple delivery destinations.");
            }
            assigned.add(lineId);
          }
        }
        draft.cartIntent = {
          ...draft.cartIntent,
          destinations: [
            ...draft.cartIntent.destinations,
            ...addresses.map((address) => ({
              destinationId: address.id,
              address: toPipelineAddress(address),
              lineIds: address.checkoutLineIds,
            })),
          ],
        };
      },
    })).checkout;
  }
}

export function toPipelineAddress(
  address: Omit<CheckoutDeliveryAddressFields, "checkoutLineIds">,
) {
  const address1 = address.address1?.trim();
  const city = address.city?.trim();
  const countryCode = address.countryCode?.trim().toUpperCase();
  if (!address1 || !city || !countryCode) {
    throw invalidCheckoutMutation("CHECKOUT_DELIVERY_ADDRESS_INVALID", "Delivery address requires address1, city and countryCode.");
  }
  return {
    id: address.id,
    address1,
    address2: address.address2 ?? null,
    city,
    countryCode,
    provinceCode: address.provinceCode ?? null,
    provinceName: null,
    postalCode: address.postalCode ?? null,
    firstName: address.firstName ?? null,
    middleName: null,
    lastName: address.lastName ?? null,
    company: null,
    email: address.email ?? null,
    phone: address.phone ?? null,
    providerData: address.data ?? null,
  };
}
