import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutCreateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CreateCheckoutDto, type CheckoutLinePurchaseInputDto } from "@src/application/dto/createCheckout.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
import { invalidCheckoutMutation } from "@src/application/mutations/index.js";

export const checkoutCreate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutCreateArgs,
  ctx: GraphQLContext,
) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CreateCheckoutDto, args.input);
  try {
    const checkout = await checkoutUsecase.createCheckout.execute({
      currencyCode: dto.currencyCode,
      channelCode: dto.channelCode.trim(),
      externalId: dto.externalId ?? null,
      externalSource: dto.externalSource ?? null,
      localeCode: dto.localeCode ?? null,
      tags: (dto.tags ?? []).map((tag) => ({
        slug: tag.slug,
        isUnique: tag.unique,
      })),
      items: dto.items.map((item) => ({
        variantId: item.purchasableId,
        quantity: item.quantity,
        purchase: purchaseOf(item.purchase),
        attributes: item.attributes ?? {},
        tagSlug: item.tagSlug ?? null,
        children: item.children?.map((child) => ({
          componentItemId: child.componentItemId,
          variantId: child.purchasableId,
          quantity: child.quantity,
          purchase: purchaseOf(child.purchase),
          attributes: child.attributes ?? {},
        })) ?? null,
      })),
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error({ reason }, "Checkout creation failed");
    throw await fromDomainError(error);
  }
};

function purchaseOf(input?: CheckoutLinePurchaseInputDto) {
  if (!input || input.type === "ONE_TIME") {
    if (input?.sellingPlanId !== undefined) {
      throw invalidCheckoutMutation("CHECKOUT_PURCHASE_INVALID", "ONE_TIME purchase cannot specify sellingPlanId.");
    }
    return { type: "ONE_TIME" as const, sellingPlanId: null };
  }
  if (!input.sellingPlanId) {
    throw invalidCheckoutMutation("CHECKOUT_PURCHASE_INVALID", "SUBSCRIPTION purchase requires sellingPlanId.");
  }
  return { type: "SUBSCRIPTION" as const, sellingPlanId: input.sellingPlanId };
}

export { purchaseOf };
