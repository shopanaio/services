import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryMethodUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryMethodUpdateInput } from "@src/application/dto/checkoutDeliveryMethodUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutDeliveryMethodUpdate(input: CheckoutDeliveryMethodUpdateInput!): Checkout!
 */
export const checkoutDeliveryMethodUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryMethodUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryMethodUpdateInput, args.input);

  try {
    await checkoutUsecase.updateDeliveryGroupMethod.execute({
      deliveryGroupId: dto.deliveryGroupId, // Already decoded by validator
      shippingMethodCode: dto.shippingMethodCode,
      checkoutId: dto.checkoutId, // Already decoded by validator
      data: dto.data,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(dto.checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryMethodUpdate error");
    throw await fromDomainError(err);
  }
};
