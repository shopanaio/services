import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCurrencyCodeUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderCurrencyCodeUpdateInput } from "@src/application/dto/orderCurrencyCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderCurrencyCodeUpdate(input: OrderCurrencyCodeUpdateInput!): Order!
 */
export const orderCurrencyCodeUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCurrencyCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderCurrencyCodeUpdateInput, args.input);

  try {

    const orderId = await broker.call("order.updateCurrencyCode", {
      orderId: dto.orderId,
      currencyCode: dto.currencyCode,
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

    return mapOrderReadToApi(order);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "currencyCodeUpdate error");
    throw await fromDomainError(err);
  }
};
