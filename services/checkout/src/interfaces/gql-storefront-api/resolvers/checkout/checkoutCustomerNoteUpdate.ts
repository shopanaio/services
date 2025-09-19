import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCustomerNoteUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCustomerNoteUpdateInput } from "@src/application/dto/checkoutCustomerNoteUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutCustomerNoteUpdate(input: CheckoutCustomerNoteUpdateInput!): Checkout!
 */
export const checkoutCustomerNoteUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCustomerNoteUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutCustomerNoteUpdateInput, args.input);

  try {

    const checkoutId = await broker.call("checkout.updateCustomerNote", {
      checkoutId: dto.checkoutId,
      note: dto.note,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as string;

    const { checkoutReadRepository } = App.getInstance();
    const checkout = await checkoutReadRepository.findById(checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "customerNoteUpdate error");
    throw await fromDomainError(err);
  }
};
