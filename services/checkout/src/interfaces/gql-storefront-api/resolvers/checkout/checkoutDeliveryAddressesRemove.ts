import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryAddressesRemoveArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesRemoveDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";
import {
  decodeCheckoutDeliveryAddressId,
  decodeCheckoutId,
} from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkoutDeliveryAddressesRemove(input: CheckoutDeliveryAddressesRemoveInput!): Checkout!
 */
export const checkoutDeliveryAddressesRemove = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryAddressesRemoveArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryAddressesRemoveDto, args.input);

  try {
    const checkoutId = decodeCheckoutId(dto.checkoutId);

    // Removing delivery addresses from checkout
    for (const addressId of dto.addressIds) {
      await checkoutUsecase.removeDeliveryAddress.execute({
        checkoutId,
        addressId: decodeCheckoutDeliveryAddressId(addressId),
        apiKey: ctx.apiKey,
        project: ctx.project,
        customer: ctx.customer,
        user: ctx.user,
      });
    }

    const checkout = await checkoutReadRepository.findById(checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryAddressesRemove error");
    throw await fromDomainError(err);
  }
};
