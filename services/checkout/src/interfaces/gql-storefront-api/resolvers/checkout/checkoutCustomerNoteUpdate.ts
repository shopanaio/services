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
import { decodeCheckoutId } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkoutCustomerNoteUpdate(input: CheckoutCustomerNoteUpdateInput!): Checkout!
 */
export const checkoutCustomerNoteUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCustomerNoteUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutCustomerNoteUpdateInput, args.input);

  try {
    const checkoutId = decodeCheckoutId(dto.checkoutId);

    const updatedCheckoutId = await checkoutUsecase.updateCustomerNote.execute({
      checkoutId,
      note: dto.note,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(updatedCheckoutId);
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
