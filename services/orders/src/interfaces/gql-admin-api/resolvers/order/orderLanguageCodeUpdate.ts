import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderLanguageCodeUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderLanguageCodeUpdateInput } from "@src/application/dto/orderLanguageCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderLanguageCodeUpdate(input: OrderLanguageCodeUpdateInput!): Order!
 */
export const orderLanguageCodeUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderLanguageCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderLanguageCodeUpdateInput, args.input);

  try {

    const orderId = await broker.call("order.updateLanguageCode", {
      orderId: dto.orderId,
      localeCode: dto.localeCode,
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
    logger.error({ reason, input: dto }, "languageCodeUpdate error");
    throw await fromDomainError(err);
  }
};
