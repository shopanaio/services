import { describe, expect, it } from "@jest/globals";
import {
  capabilityRouteRevision,
} from "./AppCapabilityRepository.js";
import { isBroadcastStoreRoute } from "./capability-route-policy.js";

describe("isBroadcastStoreRoute", () => {
  it("keeps every Commerce Function installation active", () => {
    expect(
      isBroadcastStoreRoute(
        "commerce.function",
        "cart.lines.discounts.generate.run",
      ),
    ).toBe(true);
    expect(
      isBroadcastStoreRoute(
        "commerce.function",
        "cart.payment-methods.transform.run",
      ),
    ).toBe(true);
  });

  it("preserves existing notification and single-route semantics", () => {
    expect(isBroadcastStoreRoute("notifications", "deliver")).toBe(true);
    expect(isBroadcastStoreRoute("payments.provider", "authorize")).toBe(
      false,
    );
  });
});

describe("capabilityRouteRevision", () => {
  const route = {
    capabilityRouteId: "route-1",
    appCode: "discounts",
    appVersion: "1.0.0",
    capability: "commerce.function",
    operation: "cart.lines.discounts.generate.run",
    targetAction: "generateDiscounts",
  };

  it("is stable for an unchanged route contract", () => {
    expect(capabilityRouteRevision(route)).toBe(
      capabilityRouteRevision({ ...route }),
    );
  });

  it("changes with the App version or target action", () => {
    expect(
      capabilityRouteRevision({
        ...route,
        appVersion: "1.1.0",
      }),
    ).not.toBe(capabilityRouteRevision(route));
    expect(
      capabilityRouteRevision({
        ...route,
        targetAction: "generateDiscountsV2",
      }),
    ).not.toBe(capabilityRouteRevision(route));
  });
});
