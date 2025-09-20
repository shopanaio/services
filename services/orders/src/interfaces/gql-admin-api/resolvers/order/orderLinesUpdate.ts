import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderLinesUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderLinesUpdateDto } from "@src/application/dto/orderLinesUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderLinesUpdate(input: OrderLinesUpdateInput!): OrderLinesUpdatePayload!
 */
export const orderLinesUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderLinesUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderLinesUpdateDto, args.input);

  try {

    const orderId = await broker.call("order.updateOrderLines", {
      orderId: dto.orderId,
      lines: dto.lines.map((l) => ({
        lineId: l.lineId,
        quantity: l.quantity,
      })),
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
      "orderLinesUpdate domain error"
    );
    throw await fromDomainError(err);
  }
};
