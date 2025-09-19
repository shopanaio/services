import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryAddressesAddArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesAddDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutDeliveryAddressesAdd(input: CheckoutDeliveryAddressesAddInput!): Checkout!
 */
export const checkoutDeliveryAddressesAdd = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryAddressesAddArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryAddressesAddDto, args.input);

  try {

    // Adding delivery addresses to checkout
    for (const addressInput of dto.addresses) {
      await broker.call("checkout.addDeliveryAddress", {
        checkoutId: dto.checkoutId,
        address1: addressInput.address1,
        address2: addressInput.address2,
        city: addressInput.city,
        countryCode: addressInput.countryCode,
        provinceCode: addressInput.provinceCode,
        postalCode: addressInput.postalCode,
        email: addressInput.email,
        firstName: addressInput.firstName,
        lastName: addressInput.lastName,
        phone: addressInput.phone,
        data: addressInput.data,
        apiKey: ctx.apiKey,
        project: ctx.project,
        customer: ctx.customer,
        user: ctx.user,
      }) as void;
    }

    const { checkoutReadRepository } = App.getInstance();
    const checkout = await checkoutReadRepository.findById(dto.checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryAddressesAdd error");
    throw await fromDomainError(err);
  }
};
