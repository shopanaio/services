import type { Pricing } from "@shopana/broker-types";
import { contentRevision } from "../canonicalJson.js";

export function buildDeliveryIntent(
  cart: Pricing.PricingCheckoutCartIntent,
  flat: Pricing.PricingCheckoutQuotedLine[],
): Pricing.PricingCheckoutCanonicalDeliveryIntent {
  const physical = new Set(
    flat.filter((line) => line.merchandise.isPhysical).map((line) => line.lineId),
  );
  const assigned = new Set<string>();
  const destinations = cart.destinations.map((destination) => ({
    destinationId: destination.destinationId,
    location: destination.location,
    transformedLineIds: flat
      .filter((line) => physical.has(line.lineId) && destination.lineIds.includes(line.lineId))
      .map((line) => {
        if (assigned.has(line.lineId))
          throw new Error(`Physical line ${line.lineId} has multiple destinations`);
        assigned.add(line.lineId);
        return line.lineId;
      }),
  }));
  const value = {
    lineage: flat.map((line) => ({ lineId: line.lineId, sourceLineIds: [line.lineId] })),
    destinations,
    unassignedPhysicalLineIds: flat
      .filter((line) => physical.has(line.lineId) && !assigned.has(line.lineId))
      .map((line) => line.lineId),
  };
  return { revision: contentRevision("pricing-delivery-intent", value), ...value };
}
