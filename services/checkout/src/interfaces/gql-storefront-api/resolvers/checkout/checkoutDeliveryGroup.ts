import { App } from "@src/ioc/container";
import type {
  ApiCheckoutDeliveryGroup,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";

/**
 * selectedDeliveryMethod: CheckoutDeliveryMethod
 *
 * Returns the selected delivery method for the group (can be null)
 */
export const selectedDeliveryMethod = async (parent: ApiCheckoutDeliveryGroup) => {
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
 * Gets available delivery methods for the delivery group using slots.
 *
 * How it works:
 * 1. Searches for configured shipping provider in slots for the project
 * 2. Calls the provider's HTTP API to get the list of methods
 * 3. Returns a standardized list with fields:
 *    - code: method code (standard, express, etc.)
 *    - deliveryMethodType: delivery method type
 *    - provider: provider data
 *
 * If provider is not configured - returns empty array.
 * If request to provider fails - logs error and returns empty array.
 */
export const deliveryMethods = async (parent: ApiCheckoutDeliveryGroup, _args: {}, ctx: GraphQLContext) => {
  try {
    const { shippingClient } = App.getInstance();

    const methods = await shippingClient.getProjectMethods({
      projectId: ctx.project.id,
      apiKey: ctx.apiKey,
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
    const { logger } = App.getInstance();
    logger.error(
      { error, deliveryGroupId: parent.id },
      "Failed to fetch delivery methods"
    );
    return [];
  }
};
