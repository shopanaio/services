import type {
  CheckoutBillingAddressFields,
  CheckoutBillingAddressUpdateInput,
} from "../checkout/types.js";
import type {
  CheckoutBillingAddressDraft,
  CheckoutCommittedSnapshot,
} from "../mutations/index.js";
import { UseCase } from "./useCase.js";

export class UpdateBillingAddressUseCase extends UseCase<
  CheckoutBillingAddressUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutBillingAddressUpdateInput) {
    const {
      storefrontAccess,
      store,
      customer,
      user,
      checkoutId,
      billingAddress,
    } = input;
    return (
      await this.checkoutMutationCoordinator.executeWithoutRecalculation({
        checkoutId,
        storeId: store.id,
        context: this.mutationContext({ storefrontAccess, store, customer, user }),
        apply: (draft) => {
          draft.billingAddress = billingAddress
            ? normalizeBillingAddress(billingAddress)
            : null;
        },
      })
    ).checkout;
  }
}

function normalizeBillingAddress(
  input: CheckoutBillingAddressFields,
): CheckoutBillingAddressDraft {
  return {
    firstName: optionalText(input.firstName),
    lastName: optionalText(input.lastName),
    company: optionalText(input.company),
    address1: optionalText(input.address1),
    address2: optionalText(input.address2),
    city: optionalText(input.city),
    countryCode: optionalText(input.countryCode)?.toUpperCase() ?? null,
    provinceCode: optionalText(input.provinceCode),
    postalCode: optionalText(input.postalCode),
    phone: optionalText(input.phone),
    data: input.data ?? null,
  };
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
