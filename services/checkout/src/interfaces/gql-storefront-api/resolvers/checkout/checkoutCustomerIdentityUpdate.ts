import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutCustomerIdentityUpdateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCustomerIdentityUpdateInput } from "@src/application/dto/checkoutCustomerIdentityUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutCustomerIdentityUpdate(input: CheckoutCustomerIdentityUpdateInput!): Checkout!
 */
export const checkoutCustomerIdentityUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutCustomerIdentityUpdateArgs,
  ctx: GraphQLContext
) => {
  const { checkoutUsecase, logger } = App.getInstance();

  try {
    const dto = createValidated(
      CheckoutCustomerIdentityUpdateInput,
      args.input
    );

    const checkout =
      await checkoutUsecase.updateCustomerIdentity.execute({
        checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
        email: dto.email,
        customerId: dto.customerId, // Already decoded by validator
        phone: dto.phone,
        countryCode: dto.countryCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        storefrontAccess: ctx.storefrontAccess,
        store: ctx.store,
        customer: ctx.customer,
        user: ctx.user,
      });
    return mapCommittedCheckoutToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason }, "customerIdentityUpdate error");
    throw await fromDomainError(err);
  }
};
