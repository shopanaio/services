import { UseCase } from "./useCase.js";
import type { CheckoutCurrencyCodeUpdateInput } from "../checkout/types.js";
import type { CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateCurrencyCodeUseCase extends UseCase<
  CheckoutCurrencyCodeUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutCurrencyCodeUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    const currencyCode = input.currencyCode.trim().toUpperCase();
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "CURRENCY_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => {
          draft.currencyCode = currencyCode;
        },
      })
    ).checkout;
  }
}
