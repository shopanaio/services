import { DeliveryCheckoutService } from "../DeliveryCheckoutService.js";

describe("DeliveryCheckoutService", () => {
  it("returns canonical empty delivery for a digital-only checkout", async () => {
    const unexpected = () => { throw new Error("dependency must not be called"); };
    const service = new DeliveryCheckoutService({ facts: { resolve: unexpected }, profiles: { listActiveForStore: unexpected } as never,
      assignments: {} as never, bindings: {} as never, providerAccounts: {} as never, apps: {} as never,
      customizationBindings: {} as never, customization: {} as never, rateCache: {} as never, handleSecret: "test-secret-test-secret-test-secret" });
    const now = Date.now();
    const result = await service.calculateOptions({ context: { executionId: "execution", correlationId: "correlation", requestedAt: new Date(now).toISOString(), deadlineAt: new Date(now + 60_000).toISOString(),
      checkoutId: "checkout", expectedCheckoutVersion: 0, targetCheckoutVersion: 1, storeId: "store", currencyCode: "USD", localeCode: null, channelCode: "web", effectiveAt: new Date(now).toISOString(), buyerEligibility: null },
      preliminary: { executionId: "execution", checkoutId: "checkout", basedOnCheckoutVersion: 0, currencyCode: "USD", preliminaryQuoteId: "quote", revision: "preliminary", discountEvaluationRevision: "discounts",
        transformedLines: [], sourceLineResolutions: [], deliveryIntent: { revision: "intent", lineage: [], destinations: [], unassignedPhysicalLineIds: [] }, merchandiseRevision: "merchandise", availabilityRevision: "availability",
        appliedDiscounts: [], discountCodeResolutions: [], usageRequirements: [], preliminaryTotals: { merchandiseSubtotal: { amountMinor: "0", currencyCode: "USD" }, merchandiseDiscountTotal: { amountMinor: "0", currencyCode: "USD" }, merchandiseTotal: { amountMinor: "0", currencyCode: "USD" } } },
      destinations: [], selections: [], cartAttributes: {} });
    expect(result.groups).toEqual([]);
    expect(result.basedOnCheckoutVersion).toBe(0);
  });
});
