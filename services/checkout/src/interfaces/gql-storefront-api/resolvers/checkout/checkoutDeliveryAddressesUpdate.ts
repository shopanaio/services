import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryAddressesUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryAddressesUpdateDto } from "@src/application/dto/checkoutDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutDeliveryAddressesUpdate(input: CheckoutDeliveryAddressesUpdateInput!): Checkout!
 */
export const checkoutDeliveryAddressesUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryAddressesUpdateArgs,
  ctx: GraphQLContext,
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryAddressesUpdateDto, args.input);

  try {

    // Updating each delivery address
    for (const updateItem of dto.updates) {
      await broker.call("checkout.updateDeliveryAddress", {
        checkoutId: dto.checkoutId,
        addressId: updateItem.addressId,
        address1: updateItem.address.address1,
        address2: updateItem.address.address2,
        city: updateItem.address.city,
        countryCode: updateItem.address.countryCode,
        provinceCode: updateItem.address.provinceCode,
        postalCode: updateItem.address.postalCode,
        email: updateItem.address.email,
        firstName: updateItem.address.firstName,
        lastName: updateItem.address.lastName,
        phone: updateItem.address.phone,
        data: updateItem.address.data,
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
    logger.error({ reason, input: dto }, "deliveryAddressesUpdate error");
    throw await fromDomainError(err);
  }
};
