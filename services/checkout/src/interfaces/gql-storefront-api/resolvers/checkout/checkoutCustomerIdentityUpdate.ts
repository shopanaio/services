import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCustomerIdentityUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCustomerIdentityUpdateInput } from "@src/application/dto/checkoutCustomerIdentityUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutCustomerIdentityUpdate(input: CheckoutCustomerIdentityUpdateInput!): Checkout!
 */
export const checkoutCustomerIdentityUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCustomerIdentityUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(
    CheckoutCustomerIdentityUpdateInput,
    args.input
  );

  try {

    const checkoutId = await broker.call("checkout.updateCustomerIdentity", {
      checkoutId: dto.checkoutId,
      email: dto.email,
      customerId: dto.customerId,
      phone: dto.phone,
      countryCode: dto.countryCode,
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
    logger.error({ reason, input: dto }, "customerIdentityUpdate error");
    throw await fromDomainError(err);
  }
};
