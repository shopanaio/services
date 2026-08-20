import { UseCase } from "./useCase.js";
import type { CheckoutLinesClearInput } from "../checkout/types.js";
import { clearLines, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class ClearCheckoutLinesUseCase extends UseCase<
  CheckoutLinesClearInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutLinesClearInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "LINES_CLEAR",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => clearLines(draft),
      })
    ).checkout;
  }
}
