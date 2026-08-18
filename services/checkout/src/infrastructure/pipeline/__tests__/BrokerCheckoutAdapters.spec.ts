import {
  CustomersCheckoutActions,
  DeliveryCheckoutActions,
  PaymentsCheckoutActions,
  PricingCheckoutActions,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  toCheckoutDeliveryDestinations,
  toCheckoutDeliveryContext,
  toCheckoutPaymentDeliverySnapshot,
  toCheckoutPipelineEligibilityContext,
  toCheckoutPricingCartIntent,
  toCheckoutPricingDeliverySnapshot,
} from "../../../application/pipeline/boundaries.js";
import { validationRequestFixture } from "../../../application/pipeline/__tests__/fixtures.js";
import {
  BrokerCustomersCheckoutEligibilityAdapter,
  BrokerDeliveryCheckoutAdapter,
  BrokerPaymentsCheckoutAdapter,
  BrokerPricingCheckoutAdapter,
} from "../BrokerCheckoutAdapters.js";

describe("checkout broker adapters", () => {
  it("uses the exact pricing, delivery and payment action contracts", async () => {
    const fixture = validationRequestFixture();
    const call = jest.fn(async (action: string) => {
      if (action === PricingCheckoutActions.calculatePreliminaryQuote) return fixture.preliminary;
      if (action === DeliveryCheckoutActions.calculateOptions) return fixture.delivery;
      if (action === PricingCheckoutActions.finalizeQuote) return fixture.finalQuote;
      if (action === PaymentsCheckoutActions.getAvailableMethods) return fixture.payment;
      throw new Error(`Unexpected action: ${action}`);
    });
    const broker = { call } as unknown as ServiceBroker;
    const pricing = new BrokerPricingCheckoutAdapter(broker);
    const delivery = new BrokerDeliveryCheckoutAdapter(broker);
    const payments = new BrokerPaymentsCheckoutAdapter(broker);
    const eligibilityContext = toCheckoutPipelineEligibilityContext(fixture.context);

    await pricing.calculatePreliminaryQuote({
      context: eligibilityContext,
      cartIntent: toCheckoutPricingCartIntent(fixture.cartIntent),
    });
    await delivery.calculateOptions({
      context: toCheckoutDeliveryContext(fixture.context),
      preliminary: fixture.preliminary,
      destinations: toCheckoutDeliveryDestinations(
        fixture.cartIntent.destinations,
        fixture.preliminary,
      ),
      selections: fixture.cartIntent.selectedDeliveryOptions,
      cartAttributes: fixture.cartIntent.attributes,
    });
    await pricing.finalizeQuote({
      context: eligibilityContext,
      preliminary: fixture.preliminary,
      delivery: toCheckoutPricingDeliverySnapshot(fixture.delivery),
    });
    await payments.getAvailableMethods({
      context: {
        ...eligibilityContext,
        targetCheckoutVersion: eligibilityContext.expectedCheckoutVersion + 1,
      },
      selection: fixture.cartIntent.selectedPaymentMethod,
      finalQuote: fixture.finalQuote,
      payableAmount: fixture.finalQuote.totals.payableTotal,
      loyaltyRedemption: null,
      delivery: toCheckoutPaymentDeliverySnapshot(
        fixture.delivery,
        fixture.preliminary,
      ),
    });

    expect(call.mock.calls.map(([action]) => action)).toEqual([
      PricingCheckoutActions.calculatePreliminaryQuote,
      DeliveryCheckoutActions.calculateOptions,
      PricingCheckoutActions.finalizeQuote,
      PaymentsCheckoutActions.getAvailableMethods,
    ]);
  });

  it("validates the Customers eligibility identity and effectiveAt", async () => {
    const input = {
      storeId: "store-1",
      customerId: "customer-1",
      effectiveAt: "2026-08-02T10:00:00.000Z",
    };
    const call = jest.fn(async () => ({
      ok: true as const,
      ...input,
      segmentIds: ["segment-1"],
      segmentMembershipRevision: "segments-v1",
    }));
    const adapter = new BrokerCustomersCheckoutEligibilityAdapter(
      { call } as unknown as ServiceBroker,
    );

    await expect(adapter.resolve(input)).resolves.toMatchObject({
      segmentIds: ["segment-1"],
      segmentMembershipRevision: "segments-v1",
    });
    expect(call).toHaveBeenCalledWith(
      CustomersCheckoutActions.resolveBuyerEligibility,
      input,
    );
  });

  it.each([
    ["CUSTOMER_NOT_FOUND", undefined],
    ["CUSTOMER_NOT_ELIGIBLE", "BLOCKED"],
    ["BUYER_ELIGIBILITY_LIMIT_EXCEEDED", undefined],
  ] as const)("passes through non-retryable Customers failure %s", async (code, reason) => {
    const call = jest.fn(async () => ({
      ok: false as const,
      code,
      ...(reason ? { reason } : {}),
      message: "Customer eligibility failed.",
      retryable: false as const,
    }));
    const adapter = new BrokerCustomersCheckoutEligibilityAdapter(
      { call } as unknown as ServiceBroker,
    );

    await expect(
      adapter.resolve({
        storeId: "store-1",
        customerId: "customer-1",
        effectiveAt: "2026-08-02T10:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code, retryable: false });
  });

  it("maps broker throws and rejects malformed declared failures", async () => {
    const input = {
      storeId: "store-1",
      customerId: "customer-1",
      effectiveAt: "2026-08-02T10:00:00.000Z",
    };
    const thrown = new BrokerCustomersCheckoutEligibilityAdapter({
      call: jest.fn(async () => {
        throw new Error("transport failed");
      }),
    } as unknown as ServiceBroker);
    await expect(thrown.resolve(input)).rejects.toMatchObject({
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
      retryable: true,
    });

    const malformed = new BrokerCustomersCheckoutEligibilityAdapter({
      call: jest.fn(async () => ({
        ok: false,
        code: "CUSTOMER_NOT_FOUND",
        message: "Not found",
        retryable: true,
      })),
    } as unknown as ServiceBroker);
    await expect(malformed.resolve(input)).rejects.toMatchObject({
      code: "BUYER_ELIGIBILITY_RESPONSE_INVALID",
      retryable: true,
    });
  });
});
