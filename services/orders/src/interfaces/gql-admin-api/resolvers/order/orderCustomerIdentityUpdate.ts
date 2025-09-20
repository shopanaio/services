import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCustomerIdentityUpdateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { OrderCustomerIdentityUpdateInput } from "@src/application/dto/orderCustomerIdentityUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderCustomerIdentityUpdate(input: OrderCustomerIdentityUpdateInput!): Order!
 */
export const orderCustomerIdentityUpdate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCustomerIdentityUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(
    OrderCustomerIdentityUpdateInput,
    args.input
  );

  try {

    const orderId = await broker.call("order.updateCustomerIdentity", {
      orderId: dto.orderId,
      email: dto.email,
      customerId: dto.customerId,
      phone: dto.phone,
      countryCode: dto.countryCode,
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
    logger.error({ reason, input: dto }, "customerIdentityUpdate error");
    throw await fromDomainError(err);
  }
};
