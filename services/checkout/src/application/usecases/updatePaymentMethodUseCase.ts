import { UseCase } from "./useCase.js";
import type { CheckoutPaymentMethodUpdateInput } from "../checkout/types.js";
import { updatePaymentSelection, type CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdatePaymentMethodUseCase extends UseCase<
  CheckoutPaymentMethodUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutPaymentMethodUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId } = input;
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "PAYMENT_METHOD_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) =>
          updatePaymentSelection(draft, {
            methodHandle: input.methodHandle,
            customerInput: input.customerInput ?? null,
          }),
      })
    ).checkout;
  }
}
