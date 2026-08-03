import { v7 as uuidv7 } from "uuid";
import { App } from "@src/ioc/container";
import type { ApiMutationCheckoutDeliveryAddressesAddArgs, ApiMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesAddDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryAddressesAdd = async (_parent: ApiMutation, args: ApiMutationCheckoutDeliveryAddressesAddArgs, ctx: GraphQLContext) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryAddressesAddDto, args.input);
  try {
    const checkout = await checkoutUsecase.addDeliveryAddress.execute({
      checkoutId: dto.checkoutId,
      addresses: dto.addresses.map((destination) => ({
        ...destination.address,
        id: uuidv7(),
        checkoutLineIds: destination.checkoutLineIds,
      })),
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "deliveryAddressesAdd error");
    throw await fromDomainError(error);
  }
};
