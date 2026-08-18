import { UseCase } from "./useCase.js";
import type { CheckoutLinesReplaceInput } from "../checkout/types.js";
import { replaceLines, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class ReplaceCheckoutLinesUseCase extends UseCase<CheckoutLinesReplaceInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutLinesReplaceInput) {
    const { storefrontAccess, store, customer, user, checkoutId, lines } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LINES_REPLACE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft) => replaceLines(draft, lines),
    })).checkout;
  }
}
