import { UseCase } from "./useCase.js";
import type { CheckoutCustomerIdentityUpdateInput } from "../checkout/types.js";
import type { CheckoutCommittedSnapshot } from "../mutations/index.js";

export class UpdateCustomerIdentityUseCase extends UseCase<
  CheckoutCustomerIdentityUpdateInput,
  CheckoutCommittedSnapshot
> {
  async execute(input: CheckoutCustomerIdentityUpdateInput) {
    const { storefrontAccess, store, customer, user, checkoutId, ...identity } = input;
    return (
      await this.checkoutMutationCoordinator.execute({
        checkoutId,
        storeId: store.id,
        change: "BUYER_UPDATE",
        context: this.mutationContext({
          visitorId: input.visitorId,
          storefrontAccess,
          store,
          customer,
          user,
        }),
        apply: (draft) => {
          const current = draft.buyerIdentity;
          draft.buyerIdentity = {
            customerId:
              identity.customerId === undefined
                ? (current?.customerId ?? null)
                : identity.customerId,
            email: identity.email === undefined ? (current?.email ?? null) : identity.email,
            phone: identity.phone === undefined ? (current?.phone ?? null) : identity.phone,
            countryCode:
              identity.countryCode === undefined
                ? (current?.countryCode ?? null)
                : identity.countryCode,
            firstName:
              identity.firstName === undefined ? (current?.firstName ?? null) : identity.firstName,
            middleName:
              identity.middleName === undefined
                ? (current?.middleName ?? null)
                : identity.middleName,
            lastName:
              identity.lastName === undefined ? (current?.lastName ?? null) : identity.lastName,
            marketId: current?.marketId ?? null,
            companyId: current?.companyId ?? null,
            data: current?.data ?? null,
          };
        },
      })
    ).checkout;
  }
}
