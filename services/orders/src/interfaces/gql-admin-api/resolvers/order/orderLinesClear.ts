import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderLinesClearArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderLinesClearDto } from "@src/application/dto/orderLinesClear.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderLinesClear(input: OrderLinesClearInput!): OrderLinesClearPayload!
 */
export const orderLinesClear = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderLinesClearArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderLinesClearDto, args.input);

  try {

    const orderId = await broker.call("order.clearOrderLines", {
      orderId: dto.orderId,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as string;

    const { orderReadRepository } = App.getInstance();
    const order = await orderReadRepository.findById(orderId);
    if (!order) {
      return null;
    }

    return {
      order: mapOrderReadToApi(order),
      errors: [],
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "orderLinesClear domain error");
    throw await fromDomainError(err);
  }
};
