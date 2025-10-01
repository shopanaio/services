import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutation,
  ApiCheckoutMutationCheckoutPaymentMethodUpdateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutPaymentMethodUpdateDto } from "@src/application/dto/checkoutPaymentMethodUpdate.dto";
import { createValidated } from "@src/utils/validation";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

export const checkoutPaymentMethodUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutPaymentMethodUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutPaymentMethodUpdateDto, args.input);

  try {
    await checkoutUsecase.updatePaymentMethod.execute({
      checkoutId: dto.checkoutId,
      paymentMethodCode: dto.paymentMethodCode,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });

    const checkout = await checkoutReadRepository.findById(dto.checkoutId);
    if (!checkout) {
      throw new Error("Checkout not found");
    }

    console.log("checkout", checkout);
    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "checkoutPaymentMethodUpdate error");
    throw await fromDomainError(err);
  }
};
