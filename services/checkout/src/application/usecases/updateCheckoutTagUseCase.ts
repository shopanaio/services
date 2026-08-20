import { UseCase } from "./useCase.js";
import type { CheckoutTagUpdateInput } from "../checkout/types.js";
import { invalidCheckoutMutation, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateCheckoutTagUseCase extends UseCase<
  CheckoutTagUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutTagUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, tagId, slug, isUnique } = input;
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
          const current = draft.tags.find((tag) => tag.id === tagId);
          if (!current)
            throw invalidCheckoutMutation("CHECKOUT_TAG_NOT_FOUND", "Checkout tag was not found.");
          const nextSlug = slug ?? current.slug;
          if (draft.tags.some((tag) => tag.id !== tagId && tag.slug === nextSlug)) {
            throw invalidCheckoutMutation(
              "CHECKOUT_TAG_ALREADY_EXISTS",
              "A checkout tag with this slug already exists.",
            );
          }
          const nextUnique = isUnique ?? current.isUnique;
          if (nextUnique) {
            const count = draft.lineTagAssignments.filter(
              (assignment) => assignment.tagId === tagId,
            ).length;
            if (count > 1)
              throw invalidCheckoutMutation(
                "CHECKOUT_TAG_UNIQUENESS_CONFLICT",
                "A unique checkout tag cannot be assigned to multiple lines.",
              );
          }
          draft.tags = draft.tags.map((tag) =>
            tag.id === tagId ? { ...tag, slug: nextSlug, isUnique: nextUnique } : tag,
          );
        },
      })
    ).checkout;
  }
}
