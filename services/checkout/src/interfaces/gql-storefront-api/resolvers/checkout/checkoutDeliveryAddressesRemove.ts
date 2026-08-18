import { App } from "@src/ioc/container";
import type { ApiMutationCheckoutDeliveryAddressesRemoveArgs, ApiMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesRemoveDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryAddressesRemove = async (_parent: ApiMutation, args: ApiMutationCheckoutDeliveryAddressesRemoveArgs, ctx: GraphQLContext) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryAddressesRemoveDto, args.input);
  try {
    const checkout = await checkoutUsecase.removeDeliveryAddress.execute({
      checkoutId: dto.checkoutId,
      addressIds: dto.addressIds,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "deliveryAddressesRemove error");
    throw await fromDomainError(error);
  }
};
