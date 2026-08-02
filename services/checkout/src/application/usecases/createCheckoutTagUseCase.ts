import { v7 as uuidv7 } from "uuid";
import { UseCase } from "./useCase.js";
import type { CheckoutTagCreateInput } from "../checkout/types.js";
import { invalidCheckoutMutation, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class CreateCheckoutTagUseCase extends UseCase<CheckoutTagCreateInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutTagCreateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, tag } = input;
    const tagId = uuidv7();
    return (await this.checkoutMutationCoordinator.executeWithoutRecalculation({
      checkoutId,
      storeId: store.id,
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => {
        if (draft.tags.some(({ slug }) => slug === tag.slug)) {
          throw invalidCheckoutMutation("CHECKOUT_TAG_ALREADY_EXISTS", "A checkout tag with this slug already exists.");
        }
        draft.tags = [...draft.tags, { id: tagId, slug: tag.slug, isUnique: tag.isUnique }];
      },
    })).checkout;
  }
}
