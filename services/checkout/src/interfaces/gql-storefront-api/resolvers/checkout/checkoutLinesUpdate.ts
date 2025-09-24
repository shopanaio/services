import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLinesUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesUpdateDto } from "@src/application/dto/checkoutLinesUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";
import {
  decodeCheckoutId,
  decodeCheckoutLineId,
} from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkoutLinesUpdate(input: CheckoutLinesUpdateInput!): CheckoutLinesUpdatePayload!
 */
export const checkoutLinesUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLinesUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutLinesUpdateDto, args.input);

  try {
    const checkoutId = decodeCheckoutId(dto.checkoutId);
    const lines = dto.lines.map((line) => ({
      lineId: decodeCheckoutLineId(line.lineId),
      quantity: line.quantity,
    }));

    const updatedCheckoutId = await checkoutUsecase.updateCheckoutLines.execute({
      checkoutId,
      lines,
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
    logger.error(
      { reason, input: dto },
      "checkoutLinesUpdate domain error"
    );
    throw await fromDomainError(err);
  }
};
