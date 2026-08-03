import { App } from "@src/ioc/container";
import type { ApiMutation, ApiMutationCheckoutPaymentMethodUpdateArgs } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutPaymentMethodUpdateDto } from "@src/application/dto/checkoutPaymentMethodUpdate.dto";
import { createValidated } from "@src/utils/validation";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

export const checkoutPaymentMethodUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutPaymentMethodUpdateArgs,
  ctx: GraphQLContext,
) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutPaymentMethodUpdateDto, args.input);
  try {
    const checkout = await checkoutUsecase.updatePaymentMethod.execute({
      checkoutId: dto.checkoutId,
      methodHandle: dto.methodHandle,
      customerInput: dto.customerInput,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "checkoutPaymentMethodUpdate error");
    throw await fromDomainError(error);
  }
};
