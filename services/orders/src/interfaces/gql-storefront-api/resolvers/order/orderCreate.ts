import { App } from "@src/ioc/container";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import type {
  ApiOrderMutation,
  ApiOrderMutationOrderCreateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import { CreateOrderDto } from "@src/application/dto/createOrder.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderCreate(input: OrderCreateInput!): Order!
 */
export const orderCreate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCreateArgs,
  ctx: GraphQLContext
) => {
  const { input } = args;
  const dto = createValidated(CreateOrderDto, input);

  const app = App.getInstance();
  const { broker, orderReadRepository, logger } = app;

  try {
    const id = (await broker.call("order.createOrder", {
      checkoutId: dto.checkoutId,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    })) as string;

    const order = await orderReadRepository.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found after creation`);
    }

    return mapOrderReadToApi(order);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "Order creation failed");
    throw await fromDomainError(err);
  }
};
