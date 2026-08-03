import { App } from "@src/ioc/container";
import type { ApiMutationCheckoutDeliveryAddressesUpdateArgs, ApiMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesUpdateDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryAddressesUpdate = async (_parent: ApiMutation, args: ApiMutationCheckoutDeliveryAddressesUpdateArgs, ctx: GraphQLContext) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryAddressesUpdateDto, args.input);
  try {
    const checkout = await checkoutUsecase.updateDeliveryAddress.execute({
      checkoutId: dto.checkoutId,
      updates: dto.updates.map((update) => ({ addressId: update.addressId, address: update.address })),
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "deliveryAddressesUpdate error");
    throw await fromDomainError(error);
  }
};
