import { App } from "@src/ioc/container";
import type {
  ApiOrderMutationOrderCreateArgs,
  ApiOrderMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
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
  ctx: GraphQLContext,
) => {
  const { broker, idempotencyRepository, logger } = App.getInstance();
  const { input } = args;
  const dto = createValidated(CreateOrderDto, input);

  try {
    const projectId = ctx.project.id;

    const { orderReadRepository } = App.getInstance();
    const hit = await idempotencyRepository.get(projectId, dto.idempotency);
    if (hit?.id) {
      const read = await orderReadRepository.findById(hit.id);
      if (read) {
        return mapOrderReadToApi(read);
      }
    }

    const id = await broker.call("order.createOrder", {
      currencyCode: dto.currencyCode,
      displayCurrencyCode: null,
      displayExchangeRate: null,
      externalId: dto.externalId ?? null,
      idempotencyKey: dto.idempotency,
      localeCode: dto.localeCode ?? null,
      salesChannel: dto.externalSource ?? null,
      externalSource: dto.externalSource ?? null,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as string;

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
