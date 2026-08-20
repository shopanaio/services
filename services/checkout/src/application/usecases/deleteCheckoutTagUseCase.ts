import { UseCase } from "./useCase.js";
import type { CheckoutTagDeleteInput } from "../checkout/types.js";
import { invalidCheckoutMutation, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class DeleteCheckoutTagUseCase extends UseCase<
  CheckoutTagDeleteInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutTagDeleteInput) {
    const { storefrontAccess, store, customer, user, checkoutId, tagId } = input;
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
          if (!draft.tags.some((tag) => tag.id === tagId)) {
            throw invalidCheckoutMutation("CHECKOUT_TAG_NOT_FOUND", "Checkout tag was not found.");
          }
          draft.tags = draft.tags.filter((tag) => tag.id !== tagId);
          draft.lineTagAssignments = draft.lineTagAssignments.filter(
            (assignment) => assignment.tagId !== tagId,
          );
        },
      })
    ).checkout;
  }
}
