import { GlobalIdEntity, decodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import { App } from "@src/ioc/container";
import type {
  ApiCheckoutPlacementState,
  ApiQuery,
  ApiQueryCheckoutPlacementArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { mapPlaceOrderPayload } from "@src/interfaces/gql-storefront-api/mapper/placeOrderPayload";
import type { PlaceOrderWorkflowResult } from "@src/workflows/PlaceOrderWorkflow.js";

export async function checkoutPlacement(
  _parent: ApiQuery,
  args: ApiQueryCheckoutPlacementArgs,
  ctx: GraphQLContext,
) {
  const placementId = decodeGlobalIdByType(
    args.id,
    GlobalIdEntity.CheckoutPlacement,
  );
  const placement = await App.getInstance()
    .checkoutPlacementRepository
    .findByIdForStorefrontCredential<PlaceOrderWorkflowResult>({
      placementId,
      storeId: ctx.store.id,
      credentialId: ctx.storefrontAccess.credentialId,
    });
  if (!placement) return null;
  return mapPlaceOrderPayload(placement.result, {
    placementId: placement.placementId,
    checkoutId: placement.checkoutId,
    resultRevision: placement.resultRevision,
    placementState: placement.status as ApiCheckoutPlacementState,
    failure: placement.failure,
  });
}
