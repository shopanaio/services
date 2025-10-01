import { App } from "@src/ioc/container";
import type { ApiCheckoutDeliveryGroup } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";

/**
 * selectedDeliveryMethod: CheckoutDeliveryMethod
 *
 * Returns the selected delivery method for the group (can be null)
 */
export const selectedDeliveryMethod = async (
  parent: ApiCheckoutDeliveryGroup
) => {
  // The selected delivery method is already included in the parent object from the domain model
  return parent.selectedDeliveryMethod || null;
};

/**
 * estimatedCost: DeliveryCost
 *
 * Returns the estimated delivery cost for the group (can be null)
 */
export const estimatedCost = async (parent: ApiCheckoutDeliveryGroup) => {
  // The delivery cost is already included in the parent object from the domain model
  if (!parent.estimatedCost) {
    return null;
  }

  return parent.estimatedCost;
};

/**
 * deliveryMethods: [CheckoutDeliveryMethod!]!
 *
 * Returns delivery methods for the delivery group.
 *
 * Strategy:
 * 1. First tries to return methods from parent (read model)
 * 2. If parent.deliveryMethods is empty, falls back to runtime API call
 *    to get methods from configured shipping provider
 *
 * Fallback behavior (if read model is empty):
 * - Searches for configured shipping provider in slots for the project
 * - Calls the provider's HTTP API to get the list of methods
 * - Returns a standardized list with fields:
 *   - code: method code (standard, express, etc.)
 *   - deliveryMethodType: delivery method type
 *   - provider: provider data
 *
 * If provider is not configured or request fails - returns empty array.
 */
export const deliveryMethods = async (
  parent: ApiCheckoutDeliveryGroup,
  _args: {},
  ctx: GraphQLContext
) => {
  // Strategy 1: Return from read model if available
  if (parent.deliveryMethods && parent.deliveryMethods.length > 0) {
    return parent.deliveryMethods;
  }

  // Strategy 2: Fallback to runtime API call if read model is empty
  const { serviceApi, logger } = App.getInstance();
  try {
    const methods = await serviceApi.shipping.getProjectMethods({
      projectId: ctx.project.id,
    });

    return (methods || []).map((method: any) => ({
      code: method.code,
      deliveryMethodType: method.deliveryMethodType || "SHIPPING",
      provider: {
        code: method.provider ?? "unknown",
        data: method.providerData || {},
      },
    }));
  } catch (error) {
    logger.error(
      { error, deliveryGroupId: parent.id },
      "Failed to fetch delivery methods from runtime API"
    );
    return [];
  }
};
