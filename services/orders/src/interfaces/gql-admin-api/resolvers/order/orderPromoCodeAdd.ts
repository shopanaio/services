import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderPromoCodeAddArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderPromoCodeAddDto } from "@src/application/dto/orderPromoCodes.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderPromoCodeAdd(input: OrderPromoCodeAddInput!): Order!
 */
export const orderPromoCodeAdd = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderPromoCodeAddArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderPromoCodeAddDto, args.input);

  try {

    const orderId = await broker.call("order.addPromoCode", {
      orderId: dto.orderId,
      code: dto.code,
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
    logger.error({ reason, input: dto }, "promoCodeAdd error");
    throw await fromDomainError(err);
  }
};
