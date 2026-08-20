import { UseCase } from "./useCase.js";
import type { CheckoutPromoCodeRemoveInput } from "../checkout/types.js";
import { normalizeDiscountCode, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class RemovePromoCodeUseCase extends UseCase<
  CheckoutPromoCodeRemoveInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutPromoCodeRemoveInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    const code = normalizeDiscountCode(input.code);
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "DISCOUNT_CODES_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => {
          draft.cartIntent = {
            ...draft.cartIntent,
            discountCodes: draft.cartIntent.discountCodes.filter((item) => item !== code),
          };
        },
      })
    ).checkout;
  }
}
