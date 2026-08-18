import { UseCase } from "./useCase.js";
import type { CheckoutLinesUpdateInput } from "../checkout/types.js";
import { updateLineQuantities, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateCheckoutLinesUseCase extends UseCase<CheckoutLinesUpdateInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutLinesUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, lines } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LINES_UPDATE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft) => updateLineQuantities(draft, lines),
    })).checkout;
  }
}
