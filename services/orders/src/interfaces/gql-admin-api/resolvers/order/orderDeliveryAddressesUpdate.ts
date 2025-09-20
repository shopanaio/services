import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderDeliveryAddressesUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderDeliveryAddressesUpdateDto } from "@src/application/dto/orderDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderDeliveryAddressesUpdate(input: OrderDeliveryAddressesUpdateInput!): Order!
 */
export const orderDeliveryAddressesUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderDeliveryAddressesUpdateArgs,
  ctx: GraphQLContext,
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderDeliveryAddressesUpdateDto, args.input);

  try {

    // Updating each delivery address
    for (const updateItem of dto.updates) {
      await broker.call("order.updateDeliveryAddress", {
        orderId: dto.orderId,
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

    const { orderReadRepository } = App.getInstance();
    const order = await orderReadRepository.findById(dto.orderId);
    if (!order) {
      return null;
    }

    return mapOrderReadToApi(order);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryAddressesUpdate error");
    throw await fromDomainError(err);
  }
};
