import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCreateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CreateCheckoutDto } from "@src/application/dto/createCheckout.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutCreate(input: CheckoutCreateInput!): Checkout!
 */
export const checkoutCreate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCreateArgs,
  ctx: GraphQLContext,
) => {
  const { broker, idempotencyRepository, logger } = App.getInstance();
  const { input } = args;
  const dto = createValidated(CreateCheckoutDto, input);

  try {
    const projectId = ctx.project.id;

    const { checkoutReadRepository } = App.getInstance();
    const hit = await idempotencyRepository.get(projectId, dto.idempotency);
    if (hit?.id) {
      const read = await checkoutReadRepository.findById(hit.id);
      if (read) {
        return mapCheckoutReadToApi(read);
      }
    }

    const id = await broker.call("checkout.createCheckout", {
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
    }) as string;

    const checkout = await checkoutReadRepository.findById(id);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
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
