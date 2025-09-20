import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderLinesAddArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderLinesAddDto } from "@src/application/dto/orderLinesAdd.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderLinesAdd(input: OrderLinesAddInput!): OrderLinesAddPayload!
 */
export const orderLinesAdd = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderLinesAddArgs,
  ctx: GraphQLContext,
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderLinesAddDto, args.input);

  try {
    const orderId = await broker.call("order.addOrderLines", {
      orderId: dto.orderId,
      lines: dto.lines.map((l) => ({
        quantity: l.quantity,
        purchasableId: l.purchasableId,
        purchasableSnapshot: l.purchasableSnapshot ?? null,
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
    logger.error({ reason, input: dto }, "orderLinesAdd domain error");
    throw await fromDomainError(err);
  }
};
