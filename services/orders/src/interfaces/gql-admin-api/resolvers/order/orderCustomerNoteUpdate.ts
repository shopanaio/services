import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCustomerNoteUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderCustomerNoteUpdateInput } from "@src/application/dto/orderCustomerNoteUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderCustomerNoteUpdate(input: OrderCustomerNoteUpdateInput!): Order!
 */
export const orderCustomerNoteUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCustomerNoteUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(OrderCustomerNoteUpdateInput, args.input);

  try {

    const orderId = await broker.call("order.updateCustomerNote", {
      orderId: dto.orderId,
      note: dto.note,
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
    logger.error({ reason, input: dto }, "customerNoteUpdate error");
    throw await fromDomainError(err);
  }
};
