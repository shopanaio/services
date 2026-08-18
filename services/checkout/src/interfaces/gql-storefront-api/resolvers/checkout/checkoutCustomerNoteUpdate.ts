import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutCustomerNoteUpdateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCustomerNoteUpdateInput } from "@src/application/dto/checkoutCustomerNoteUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutCustomerNoteUpdate(input: CheckoutCustomerNoteUpdateInput!): Checkout!
 */
export const checkoutCustomerNoteUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutCustomerNoteUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutCustomerNoteUpdateInput, args.input);

  try {
    const checkout = await checkoutUsecase.updateCustomerNote.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      note: dto.note,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "customerNoteUpdate error");
    throw await fromDomainError(err);
  }
};
