import { UseCase } from "./useCase.js";
import type { CheckoutLinesAddInput } from "../checkout/types.js";
import { addLines, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class AddCheckoutLinesUseCase extends UseCase<CheckoutLinesAddInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutLinesAddInput) {
    const { storefrontAccess, store, customer, user, checkoutId, lines } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LINES_ADD",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => addLines(draft, lines),
    })).checkout;
  }
}
