import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutDeliveryMethodUpdateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryMethodUpdateInput } from "@src/application/dto/checkoutDeliveryMethodUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutDeliveryMethodUpdate(input: CheckoutDeliveryMethodUpdateInput!): Checkout!
 */
export const checkoutDeliveryMethodUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutDeliveryMethodUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutDeliveryMethodUpdateInput, args.input);

  try {
    const checkout = await checkoutUsecase.updateDeliveryGroupMethod.execute({
      deliveryGroupId: dto.deliveryGroupId, // Already decoded by validator
      optionHandle: dto.optionHandle,
      checkoutId: dto.checkoutId, // Already decoded by validator
      customerInput: dto.customerInput,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "deliveryMethodUpdate error");
    throw await fromDomainError(err);
  }
};
