import type { Delivery } from "@shopana/broker-types";

export function zoneMatches(
  zone: Delivery.DeliveryZoneSnapshot,
  address: Delivery.DeliveryCheckoutAddress,
): boolean {
  return zone.territories.some((territory) => {
    if (territory.scope === "REST_OF_WORLD") return true;
    if (territory.countryCode !== address.countryCode) return false;
    if (
      territory.provinceCodes.length > 0 &&
      (!address.provinceCode || !territory.provinceCodes.includes(address.provinceCode))
    )
      return false;
    const postal = address.postalCode?.toUpperCase().replace(/[\t\n\r ]/g, "") ?? "";
    const matches = territory.postalCodeRuleSet.rules.map((rule) => ({
      rule,
      matched: matchPostal(rule, postal),
    }));
    if (matches.some(({ rule, matched }) => matched && rule.effect === "EXCLUDE")) return false;
    const includes = matches.filter(({ rule }) => rule.effect === "INCLUDE");
    return includes.length === 0 || includes.some(({ matched }) => matched);
  });
}

function matchPostal(rule: Delivery.DeliveryPostalCodeRule, postal: string): boolean {
  if (rule.match === "EXACT") return postal === rule.value;
  if (rule.match === "PREFIX") return postal.startsWith(rule.value);
  if (!("start" in rule)) return false;
  return (
    /^\d+$/.test(postal) &&
    postal.length === rule.start.length &&
    BigInt(postal) >= BigInt(rule.start) &&
    BigInt(postal) <= BigInt(rule.end)
  );
}

export function conditionsMatch(input: {
  set: Delivery.DeliveryRateConditionSet;
  currencyCode: string;
  subtotalMinor: bigint;
  weightGrams: number;
  itemCount: number;
  channelCode: string;
  segmentIds: readonly string[];
  purchaseTypes: readonly Delivery.DeliveryPurchaseType[];
}): boolean {
  const values = input.set.conditions.map((condition) => {
    switch (condition.type) {
      case "CART_SUBTOTAL":
        return (
          condition.amount.currencyCode === input.currencyCode &&
          compare(input.subtotalMinor, BigInt(condition.amount.amountMinor), condition.operator)
        );
      case "PACKAGE_WEIGHT_GRAMS":
        return compare(BigInt(input.weightGrams), BigInt(condition.value), condition.operator);
      case "PACKAGE_ITEM_COUNT":
        return compare(BigInt(input.itemCount), BigInt(condition.value), condition.operator);
      case "CHANNEL":
        return condition.values.includes(input.channelCode);
      case "CUSTOMER_SEGMENT":
        return condition.values.some((value) => input.segmentIds.includes(value));
      case "PURCHASE_TYPE":
        return input.purchaseTypes.some((value) => condition.values.includes(value));
    }
  });
  return input.set.match === "ALL" ? values.every(Boolean) : values.some(Boolean);
}

function compare(left: bigint, right: bigint, operator: "GTE" | "LTE"): boolean {
  return operator === "GTE" ? left >= right : left <= right;
}
