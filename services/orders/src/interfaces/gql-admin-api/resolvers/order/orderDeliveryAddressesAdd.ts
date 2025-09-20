import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderDeliveryAddressesAddArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderDeliveryAddressesAddDto } from "@src/application/dto/orderDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderDeliveryAddressesAdd(input: OrderDeliveryAddressesAddInput!): Order!
 */
export const orderDeliveryAddressesAdd = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderDeliveryAddressesAddArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderDeliveryAddressesAddDto, args.input);

  try {

    // Adding delivery addresses to order
    for (const addressInput of dto.addresses) {
      await broker.call("order.addDeliveryAddress", {
        orderId: dto.orderId,
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

    const { orderReadRepository } = App.getInstance();
    const order = await orderReadRepository.findById(dto.orderId);
    if (!order) {
      return null;
    }

    return mapOrderReadToApi(order);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryAddressesAdd error");
    throw await fromDomainError(err);
  }
};
