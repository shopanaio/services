import { App } from "@src/ioc/container";
import type { GraphQLContext } from "@src/interfaces/gql-admin-api/context";
import type {
  ApiOrderMutationOrderCreateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import { CreateOrderDto } from "@src/application/dto/createOrder.dto";
import { fromDomainError } from "@src/interfaces/gql-admin-api/errors";
import { mapOrderReadToApi } from "@src/interfaces/gql-admin-api/mapper/order";
import { createValidated } from "@src/utils/validation";

/**
 * orderCreate(input: OrderCreateInput!): Order!
 */
export const orderCreate = async (
  _parent: ApiOrderMutation,
  args: ApiOrderMutationOrderCreateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const { input } = args;
  const dto = createValidated(CreateOrderDto, input);

  try {
    const { orderReadRepository } = App.getInstance();

    const id = (await broker.call("order.createOrder", {
      currencyCode: dto.currencyCode,
      externalId: dto.externalId ?? null,
      idempotencyKey: dto.idempotency,
      localeCode: dto.localeCode ?? null,
      salesChannel: dto.externalSource ?? null,
      externalSource: dto.externalSource ?? null,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    })) as string;

    const order = await orderReadRepository.findById(id);
    if (!order) {
      return null;
    }

    return mapOrderReadToApi(order);
  } catch (err) {
    // Don't implementing right now. will monitor occurrences and implement if needed.
    // Fallback: if a race occurred, idempotency record may exist now

    // Log domain error with context for debugging
    const reason = err instanceof Error ? err.message : String(err);
    //
    logger.error({ reason, input: dto }, "Order creation failed");
    throw await fromDomainError(err);
  }
};
