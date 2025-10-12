import { App } from "@src/ioc/container";
import type { ApiCheckoutMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesReplaceDto } from "@src/application/dto/checkoutLinesReplace.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesReplace(input: CheckoutLinesReplaceInput!): CheckoutLinesReplacePayload!
 */
type CheckoutLinesReplaceArgs = {
  input: {
    checkoutId: string;
    lines: Array<{
      lineIdFrom: string;
      lineIdTo: string;
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
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutLinesReplaceDto, args.input);

  try {
    const updatedCheckoutId = await checkoutUsecase.replaceCheckoutLines.execute({
      checkoutId: dto.checkoutId,
      lines: dto.lines.map((l) => ({
        lineIdFrom: l.lineIdFrom,
        lineIdTo: l.lineIdTo,
        quantity: l.quantity,
      })),
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });

    const checkout = await checkoutReadRepository.findById(updatedCheckoutId);
    if (!checkout) {
      return null;
    }

    return {
      checkout: mapCheckoutReadToApi(checkout),
      errors: [],
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "checkoutLinesReplace domain error");
    throw await fromDomainError(err);
  }
};
