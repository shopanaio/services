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
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutCustomerIdentityUpdate(input: CheckoutCustomerIdentityUpdateInput!): Checkout!
 */
export const checkoutCustomerIdentityUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCustomerIdentityUpdateArgs,
  ctx: GraphQLContext
) => {
  const { checkoutUsecase, checkoutReadRepository, logger } = App.getInstance();

  try {
    const dto = createValidated(
      CheckoutCustomerIdentityUpdateInput,
      args.input
    );

    const updatedCheckoutId =
      await checkoutUsecase.updateCustomerIdentity.execute({
        checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
        email: dto.email,
        customerId: dto.customerId, // Already decoded by validator
        phone: dto.phone,
        countryCode: dto.countryCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
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
    logger.error({ reason }, "customerIdentityUpdate error");
    throw await fromDomainError(err);
  }
};
