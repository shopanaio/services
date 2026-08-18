import { App } from "@src/ioc/container";
import type {
  ApiMutation,
  ApiMutationCheckoutBillingAddressUpdateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutBillingAddressUpdateDto } from "@src/application/dto/checkoutBillingAddressUpdate.dto";
import { createValidated } from "@src/utils/validation";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

export async function checkoutBillingAddressUpdate(
  _parent: ApiMutation,
  args: ApiMutationCheckoutBillingAddressUpdateArgs,
  ctx: GraphQLContext,
) {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutBillingAddressUpdateDto, args.input);
  try {
    const checkout = await checkoutUsecase.updateBillingAddress.execute({
      checkoutId: dto.checkoutId,
      billingAddress: dto.billingAddress
        ? {
            firstName: dto.billingAddress.firstName,
            lastName: dto.billingAddress.lastName,
            company: dto.billingAddress.company,
            address1: dto.billingAddress.address1,
            address2: dto.billingAddress.address2,
            city: dto.billingAddress.city,
            countryCode: dto.billingAddress.countryCode,
            provinceCode: dto.billingAddress.provinceCode,
            postalCode: dto.billingAddress.zip,
            phone: dto.billingAddress.phone,
            data: dto.billingAddress.data,
          }
        : null,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    logger.error(
      {
        reason: error instanceof Error ? error.message : String(error),
        checkoutId: dto.checkoutId,
      },
      "checkoutBillingAddressUpdate failed",
    );
    throw await fromDomainError(error);
  }
}
