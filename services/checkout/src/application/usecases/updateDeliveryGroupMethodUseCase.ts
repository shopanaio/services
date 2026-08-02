import { UseCase } from "./useCase.js";
import type { CheckoutDeliveryMethodUpdateInput } from "../checkout/types.js";
import { updateDeliverySelection, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateDeliveryGroupMethodUseCase extends UseCase<CheckoutDeliveryMethodUpdateInput, CheckoutCommittedSnapshot> {
  async execute(input: CheckoutDeliveryMethodUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    return (await this.checkoutMutationCoordinator.execute({
      checkoutId,
      storeId: store.id,
      change: "DELIVERY_OPTION_UPDATE",
      context: this.mutationContext({ storefrontAccess, store, customer, user }),
      apply: (draft) => updateDeliverySelection(draft, {
        groupId: input.deliveryGroupId,
        optionHandle: input.optionHandle,
        customerInput: input.customerInput ?? null,
      }),
    })).checkout;
  }
}
