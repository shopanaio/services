import { App } from "@src/ioc/container";
import type { ApiCheckoutMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesReplaceDto } from "@src/application/dto/checkoutLinesReplace.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesReplace(input: CheckoutLinesReplaceInput!): CheckoutLinesReplacePayload!
 */
type CheckoutLinesReplaceArgs = {
  input: {
    checkoutId: string;
    lines: Array<{
      lineId: string;
      purchasableId: string;
      quantity?: number;
    }>;
  };
};

export const checkoutLinesReplace = async (
  _parent: ApiCheckoutMutation,
  args: CheckoutLinesReplaceArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutLinesReplaceDto, args.input);

  try {
    const checkout = await checkoutUsecase.replaceCheckoutLines.execute({
      checkoutId: dto.checkoutId,
      lines: dto.lines.map((l) => ({
        lineId: l.lineId,
        variantId: l.purchasableId,
        quantity: l.quantity,
      })),
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });

    return {
      checkout: mapCommittedCheckoutToApi(checkout),
      errors: [],
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "checkoutLinesReplace domain error");
    throw await fromDomainError(err);
  }
};
