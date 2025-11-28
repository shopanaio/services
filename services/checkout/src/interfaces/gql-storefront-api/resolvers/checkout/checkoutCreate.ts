import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCreateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CreateCheckoutDto } from "@src/application/dto/createCheckout.dto";
import {
  badUserInput,
  fromDomainError,
} from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";
import { v7 as uuidv7 } from "uuid";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutCreate(input: CheckoutCreateInput!): Checkout!
 */
export const checkoutCreate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCreateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const { input } = args;
  const dto = createValidated(CreateCheckoutDto, input);

  try {
    // Generate non-deterministic idempotency key (idempotency validation removed)
    const idempotencyKey = uuidv7();

    const id = await checkoutUsecase.createCheckout.execute({
      currencyCode: dto.currencyCode,
      externalId: dto.externalId ?? null,
      idempotencyKey,
      localeCode: dto.localeCode ?? null,
      salesChannel: dto.externalSource ?? null,
      externalSource: dto.externalSource ?? null,
      tags: dto.tags ?? [],
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });

    // If items were provided and checkout was created, add them to the checkout
    if (dto.items && dto.items.length > 0) {
      await checkoutUsecase.addCheckoutLines.execute({
        checkoutId: id,
        lines: dto.items.map((item) => ({
          purchasableId: item.purchasableId,
          quantity: item.quantity,
          purchasableSnapshot: item.purchasableSnapshot ?? null,
          tagSlug: item.tagSlug ?? null,
        })),
        apiKey: ctx.apiKey,
        project: ctx.project,
        customer: ctx.customer,
        user: ctx.user,
      });
    }

    const checkout = await checkoutReadRepository.findById(id);

    if (!checkout) {
      return null;
    }

    const r = mapCheckoutReadToApi(checkout);

    return r;
  } catch (err) {
    // Don't implementing right now. will monitor occurrences and implement if needed.
    // Fallback: if a race occurred, idempotency record may exist now

    // Log domain error with context for debugging
    const reason = err instanceof Error ? err.message : String(err);
    //
    logger.error({ reason, input: dto }, "Checkout creation failed");
    throw await fromDomainError(err);
  }
};
