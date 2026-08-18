import { UseCase } from "./useCase.js";
import type { CheckoutPromoCodeAddInput } from "../checkout/types.js";
import { normalizeDiscountCode, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class AddPromoCodeUseCase extends UseCase<CheckoutPromoCodeAddInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutPromoCodeAddInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    const code = normalizeDiscountCode(input.code);
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "DISCOUNT_CODES_UPDATE",
      context: this.mutationContext({ visitorId: input.visitorId, storefrontAccess, store, customer, user }),
      apply: (draft) => {
        if (!draft.cartIntent.discountCodes.includes(code)) {
          draft.cartIntent = {
            ...draft.cartIntent,
            discountCodes: [...draft.cartIntent.discountCodes, code],
          };
        }
      },
    })).checkout;
  }
}
