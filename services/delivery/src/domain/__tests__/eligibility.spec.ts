import type { Delivery } from "@shopana/broker-types";
import { conditionsMatch, zoneMatches } from "../eligibility.js";

describe("delivery eligibility", () => {
  it("lets postal exclusions win over includes", () => {
    const zone: Delivery.DeliveryZoneSnapshot = { zoneId: "zone", name: "Ukraine", priority: 0, revision: 1, territories: [{ scope: "COUNTRY" as const, countryCode: "UA", provinceCodes: [], postalCodeRuleSet: { schemaVersion: 1 as const, normalization: "UPPERCASE_REMOVE_ASCII_WHITESPACE" as const, rules: [{ effect: "INCLUDE" as const, match: "PREFIX" as const, value: "01" }, { effect: "EXCLUDE" as const, match: "EXACT" as const, value: "01001" }] } }] };
    const address = { id: "destination", address1: "Street", address2: null, city: "Kyiv", countryCode: "UA", provinceCode: null, provinceName: null, postalCode: "01001", firstName: null, middleName: null, lastName: null, company: null, email: null, phone: null, providerData: null };
    expect(zoneMatches(zone, address)).toBe(false);
  });

  it("evaluates segment, channel and weight conditions deterministically", () => {
    expect(conditionsMatch({ set: { match: "ALL", conditions: [{ type: "CHANNEL", values: ["web"] }, { type: "CUSTOMER_SEGMENT", values: ["vip"] }, { type: "PACKAGE_WEIGHT_GRAMS", operator: "LTE", value: 1_000 }] },
      currencyCode: "USD", subtotalMinor: 1_000n, weightGrams: 999, itemCount: 1, channelCode: "web", segmentIds: ["vip"], purchaseTypes: ["ONE_TIME"] })).toBe(true);
  });
});
