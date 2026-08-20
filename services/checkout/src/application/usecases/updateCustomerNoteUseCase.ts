import { UseCase } from "./useCase.js";
import type { CheckoutCustomerNoteUpdateInput } from "../checkout/types.js";
import type { CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateCustomerNoteUseCase extends UseCase<
  CheckoutCustomerNoteUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutCustomerNoteUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, note } = input;
    return (
      await this.checkoutMutationCoordinator.executeWithoutRecalculation({
        checkoutId,
        storeId: store.id,
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => {
          draft.customerNote = note ?? null;
        },
      })
    ).checkout;
  }
}
