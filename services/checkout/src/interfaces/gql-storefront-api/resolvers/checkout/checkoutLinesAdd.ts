import { v7 as uuidv7 } from "uuid";
import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutLinesAddArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesAddDto } from "@src/application/dto/checkoutLinesAdd.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
import { purchaseOf } from "./checkoutCreate.js";

export const checkoutLinesAdd = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutLinesAddArgs,
  ctx: GraphQLContext,
) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutLinesAddDto, args.input);
  try {
    const checkout = await checkoutUsecase.addCheckoutLines.execute({
      checkoutId: dto.checkoutId,
      lines: dto.lines.map((line) => ({
        lineId: uuidv7(),
        variantId: line.purchasableId,
        quantity: line.quantity,
        purchase: purchaseOf(line.purchase),
        attributes: line.attributes ?? {},
        tagSlug: line.tagSlug ?? null,
        children:
          line.children?.map((child) => ({
            lineId: uuidv7(),
            componentItemId: child.componentItemId,
            variantId: child.purchasableId,
            quantity: child.quantity,
            purchase: purchaseOf(child.purchase),
            attributes: child.attributes ?? {},
          })) ?? null,
      })),
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
      "checkoutLinesAdd failed",
    );
    throw await fromDomainError(error);
  }
};
