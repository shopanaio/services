import type { CheckoutDeliveryGroup } from "./types";

// Line item with inventory offer for grouping decisions
export type LineItemWithOffer = {
  lineId: string;
  purchasableId: string;
  quantity: number;
  offer: {
    isPhysical: boolean;
    // Additional offer properties can be added as needed
  };
};

/**
 * Simple V1 delivery grouping algorithm
 *
 * Business Rules:
 * 1. Only physical items need delivery
 * 2. All physical items go to one shipping group (V1 simplification)
 * 3. Non-physical items don't create delivery groups
 * 4. Future: can be extended with complex rules (vendor, shipping class, etc.)
 */
export function createDeliveryGroups(
  lineItemsWithOffers: ReadonlyArray<LineItemWithOffer>
): CheckoutDeliveryGroupDraft[] {
  // Filter only physical items that need delivery
  const physicalItems = lineItemsWithOffers.filter(
    item => item.offer.isPhysical
  );

  // If no physical items, no delivery groups needed
  if (physicalItems.length === 0) {
    return [];
  }

  // V1: Create single shipping group for all physical items
  const checkoutLineIds = Array.from(new Set(physicalItems.map(item => item.lineId)));
  const shippingGroup: CheckoutDeliveryGroupDraft = {
    checkoutLineIds,
  };

  return [shippingGroup];
}

/**
 * Update delivery groups when line items change
 *
 * @param existingGroups Current delivery groups
 * @param lineItemsWithOffers Updated line items with offers
 * @returns Updated delivery groups
 */
export function updateDeliveryGroups(
  _existingGroups: CheckoutDeliveryGroupDraft[],
  lineItemsWithOffers: ReadonlyArray<LineItemWithOffer>
): CheckoutDeliveryGroupDraft[] {
  // V1: recreate groups from scratch (drafts do not carry address/method/cost)
  return createDeliveryGroups(lineItemsWithOffers);
}

/**
 * Validate delivery group business rules
 */
export function validateDeliveryGroup(group: CheckoutDeliveryGroup | CheckoutDeliveryGroupDraft): void {
  // Minimal validation shared for draft and persisted groups
  if (group.checkoutLineIds.length === 0) {
    throw new Error("Delivery group must contain at least one line item");
  }
}

// Draft type for algorithm output (id is assigned in decider on event emission)
export type CheckoutDeliveryGroupDraft = {
  checkoutLineIds: string[];
};
