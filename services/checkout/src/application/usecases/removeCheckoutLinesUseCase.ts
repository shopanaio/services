import { UseCase } from "./useCase.js";
import type { CheckoutLinesDeleteInput } from "../checkout/types.js";
import { deleteLines, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class DeleteCheckoutLinesUseCase extends UseCase<CheckoutLinesDeleteInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutLinesDeleteInput) {
    const { storefrontAccess, store, customer, user, checkoutId, lineIds } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "LINES_DELETE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft) => deleteLines(draft, lineIds),
    })).checkout;
  }
}
