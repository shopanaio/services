import {
  CustomersCheckoutActions,
  DeliveryCheckoutActions,
  PaymentsCheckoutActions,
  PricingCheckoutActions,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  toCheckoutDeliveryDestinations,
  toCheckoutPaymentDeliverySnapshot,
  toCheckoutPipelineEligibilityContext,
  toCheckoutPipelineStageContext,
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
      context: toCheckoutPipelineStageContext(fixture.context),
      preliminary: fixture.preliminary,
      destinations: toCheckoutDeliveryDestinations(
        fixture.cartIntent.destinations,
        fixture.preliminary,
      ),
      selections: fixture.cartIntent.selectedDeliveryOptions,
    });
    await pricing.finalizeQuote({
      context: eligibilityContext,
      preliminary: fixture.preliminary,
      delivery: toCheckoutPricingDeliverySnapshot(fixture.delivery),
    });
    await payments.getAvailableMethods({
      context: eligibilityContext,
      selection: fixture.cartIntent.selectedPaymentMethod,
      finalQuote: fixture.finalQuote,
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
});
