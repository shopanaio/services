import type { Pricing } from "@shopana/broker-types";
import { PricingCheckoutError } from "../errors.js";

export function validateFinalDelivery(
  preliminary: Pricing.CalculateCheckoutPreliminaryQuoteResult,
  delivery: Pricing.PricingCheckoutDeliverySnapshot,
  currencyCode: string,
): bigint {
  const expectedLineIds = preliminary.deliveryIntent.destinations.flatMap(
    (destination) => destination.transformedLineIds,
  );
  assertUnique(expectedLineIds, "canonical physical line assignment");

  const groupIds = delivery.groups.map((group) => group.groupId);
  assertUnique(groupIds, "delivery group ID");
  const actualLineIds: string[] = [];
  let subtotal = 0n;

  for (const group of delivery.groups) {
    if (group.lineIds.length === 0) {
      mismatch(`Delivery group ${group.groupId} has no physical lines`);
    }
    assertUnique(group.lineIds, `line assignment in group ${group.groupId}`);
    actualLineIds.push(...group.lineIds);

    const handles = group.options.map((option) => option.handle);
    assertUnique(handles, `option handle in group ${group.groupId}`);
    for (const option of group.options) {
      if (option.cost.currencyCode !== currencyCode) {
        mismatch("Delivery option currency does not match checkout currency");
      }
    }

    if (group.selectedOptionHandle !== null) {
      const selected = group.options.find(
        (option) => option.handle === group.selectedOptionHandle,
      );
      if (!selected) mismatch("Selected delivery option does not exist");
      subtotal += BigInt(selected.cost.amountMinor);
    }
  }

  assertUnique(actualLineIds, "delivery group line assignment");
  if (!sameIds(expectedLineIds, actualLineIds)) {
    mismatch("Delivery groups do not exactly cover preliminary physical lines");
  }
  return subtotal;
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    mismatch(`Duplicate ${label}`);
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}

function mismatch(message: string): never {
  throw new PricingCheckoutError(
    "PRICING_FINAL_DELIVERY_MISMATCH",
    message,
    false,
  );
}
