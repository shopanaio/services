import { UseCase } from "./useCase.js";
import type { CheckoutLanguageCodeUpdateInput } from "../checkout/types.js";
import type { CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateLanguageCodeUseCase extends UseCase<CheckoutLanguageCodeUpdateInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutLanguageCodeUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, localeCode } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LOCALE_UPDATE",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => { draft.localeCode = localeCode; },
    })).checkout;
  }
}
