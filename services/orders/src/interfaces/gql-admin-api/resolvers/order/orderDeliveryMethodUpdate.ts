import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderDeliveryMethodUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderDeliveryMethodUpdateInput } from "@src/application/dto/orderDeliveryMethodUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderDeliveryMethodUpdate(input: OrderDeliveryMethodUpdateInput!): Order!
 */
export const orderDeliveryMethodUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderDeliveryMethodUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderDeliveryMethodUpdateInput, args.input);

  try {
    await broker.call("order.updateDeliveryGroupMethod", {
      deliveryGroupId: dto.deliveryGroupId,
      deliveryMethodCode: dto.shippingMethodCode,
      orderId: dto.orderId,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as void;

    const { orderReadRepository } = App.getInstance();
    const order = await orderReadRepository.findById(dto.orderId);
    if (!order) {
      return null;
    }

    return mapOrderReadToApi(order);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryMethodUpdate error");
    throw await fromDomainError(err);
  }
};
