import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderDeliveryAddressesRemoveArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderDeliveryAddressesRemoveDto } from "@src/application/dto/orderDeliveryAddresses.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderDeliveryAddressesRemove(input: OrderDeliveryAddressesRemoveInput!): Order!
 */
export const orderDeliveryAddressesRemove = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderDeliveryAddressesRemoveArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderDeliveryAddressesRemoveDto, args.input);

  try {

    // Removing delivery addresses from order
    for (const addressId of dto.addressIds) {
      await broker.call("order.removeDeliveryAddress", {
        orderId: dto.orderId,
        addressId: addressId,
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
    logger.error({ reason, input: dto }, "deliveryAddressesRemove error");
    throw await fromDomainError(err);
  }
};
