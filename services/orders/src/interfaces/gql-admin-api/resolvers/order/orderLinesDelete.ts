import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderLinesDeleteArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderLinesDeleteDto } from "@src/application/dto/orderLinesDelete.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderLinesDelete(input: OrderLinesDeleteInput!): OrderLinesDeletePayload!
 */
export const orderLinesDelete = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderLinesDeleteArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderLinesDeleteDto, args.input);

  try {

    const orderId = await broker.call("order.removeOrderLines", {
      orderId: dto.orderId,
      lineIds: dto.lineIds,
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
    logger.error(
      { reason, input: dto },
      "orderLinesDelete domain error"
    );
    throw await fromDomainError(err);
  }
};
