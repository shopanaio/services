import { paymentsCheckoutRequestSchema, providerDiscoveryResultSchema } from "../schemas.js";

describe("payments checkout boundary", () => {
  it("rejects a target version that does not immediately follow the committed version", () => {
    const value = request();
    value.context.targetCheckoutVersion = 4;
    expect(paymentsCheckoutRequestSchema.safeParse(value).success).toBe(false);
  });

  it("rejects duplicate provider method keys", () => {
    const method = { methodKey: "card", code: "card", title: "Card", flow: "ONLINE", supportedSessionKinds: ["SALE"], supportedCaptureModes: ["AUTOMATIC"], capabilities: capabilities(), metadata: null };
    expect(providerDiscoveryResultSchema.safeParse({ revision: "provider-v1", methods: [method, method] }).success).toBe(false);
  });
});

function request(): any {
  const money = { amountMinor: "100", currencyCode: "USD" };
  const zero = { amountMinor: "0", currencyCode: "USD" };
  return {
    context: { executionId: "execution", checkoutId: "00000000-0000-0000-0000-000000000001", expectedCheckoutVersion: 2, targetCheckoutVersion: 3, currencyCode: "USD", correlationId: "correlation", deadlineAt: "2099-01-01T00:00:00.000Z", requestedAt: "2026-01-01T00:00:00.000Z", storeId: "00000000-0000-0000-0000-000000000002", localeCode: "en", channelCode: "web", effectiveAt: "2026-01-01T00:00:00.000Z", buyerEligibility: null },
    selection: null,
    finalQuote: { executionId: "execution", checkoutId: "00000000-0000-0000-0000-000000000001", basedOnCheckoutVersion: 2, currencyCode: "USD", quoteId: "quote", revision: "quote-v1", discountEvaluationRevision: "discount-v1", basedOnPreliminaryDiscountEvaluationRevision: "discount-v0", basedOnPreliminaryRevision: "preliminary-v1", basedOnDeliveryRevision: "delivery-v1", lines: [], appliedDiscounts: [], discountCodeResolutions: [], usageRequirements: [], totals: { merchandiseSubtotal: money, merchandiseDiscountTotal: zero, merchandiseTotal: money, taxTotal: zero, deliverySubtotal: zero, deliveryDiscountTotal: zero, deliveryTotal: zero, payableTotal: money } },
    delivery: { executionId: "execution", checkoutId: "00000000-0000-0000-0000-000000000001", basedOnCheckoutVersion: 2, currencyCode: "USD", revision: "delivery-v1", basedOnPreliminaryRevision: "preliminary-v1", destinations: [], groups: [] },
  };
}
function capabilities() { return { supportsAsynchronousCompletion: false, supportsSettlementConfirmation: false, supportsPartialCapture: false, supportsMultipleCaptures: false, supportsPartialRefund: false, supportsMultipleRefunds: false, supportsReconciliation: false, supportsDisputes: false }; }
