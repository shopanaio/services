import type { CheckoutCommittedSnapshot } from "../application/mutations/index.js";
import {
  createOrderRewardEligibilitySnapshot,
  placeOrderRequestHash,
} from "./PlaceOrderWorkflow.js";

describe("createOrderRewardEligibilitySnapshot", () => {
  it("captures immutable customer, pricing and catalog targeting facts", () => {
    const checkout = {
      checkoutId: "checkout-1",
      storeId: "store-1",
      version: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      draft: {
        channelCode: "web",
        buyerIdentity: { customerId: "customer-1" },
      },
      result: {
        finalPricing: {
          status: "SUCCESS",
          data: {
            currencyCode: "USD",
            quoteId: "quote-1",
            revision: "quote-revision-1",
            appliedDiscounts: [],
            lines: [
              quotedLine({
                lineId: "line-1",
                amountMinor: "1250",
                productId: "product-1",
                variantId: "variant-1",
              }),
              quotedLine({
                lineId: "container-1",
                amountMinor: "9999",
                productId: "product-container",
                variantId: "variant-container",
                contributesToTotals: false,
                children: [
                  quotedLine({
                    lineId: "line-2",
                    amountMinor: "750",
                    productId: "product-2",
                    variantId: "variant-2",
                  }),
                ],
              }),
            ],
          },
        },
      },
    } as unknown as CheckoutCommittedSnapshot;

    const result = createOrderRewardEligibilitySnapshot(checkout, {
      customerId: "customer-1",
      segmentIds: ["segment-1"],
      segmentMembershipRevision: "segments-revision-1",
    });

    expect(result).toEqual({
      customerId: "customer-1",
      currencyCode: "USD",
      channelCode: "web",
      customerEligibilityRevision: "segments-revision-1",
      segmentIds: ["segment-1"],
      segmentMembershipRevision: "segments-revision-1",
      eligibleAmountAfterProductDiscountsMinor: "2000",
      eligibleAmountAfterAllDiscountsMinor: "2000",
      pricingQuoteId: "quote-1",
      pricingQuoteRevision: "quote-revision-1",
      lines: [
        expect.objectContaining({
          orderLineId: "line-1",
          productId: "product-1",
          variantId: "variant-1",
          eligibleAmountAfterProductDiscountsMinor: "1250",
          eligibleAmountAfterAllDiscountsMinor: "1250",
        }),
        expect.objectContaining({
          orderLineId: "line-2",
          productId: "product-2",
          variantId: "variant-2",
          eligibleAmountAfterProductDiscountsMinor: "750",
          eligibleAmountAfterAllDiscountsMinor: "750",
        }),
      ],
    });
  });

  it("preserves both configured earning spend bases", () => {
    const line = {
      ...quotedLine({
        lineId: "line-1",
        amountMinor: "700",
        productId: "product-1",
        variantId: "variant-1",
      }),
      subtotal: { amountMinor: "1000", currencyCode: "USD" },
      discountAllocations: [
        { applicationId: "product-discount", amount: { amountMinor: "200" } },
        { applicationId: "order-discount", amount: { amountMinor: "100" } },
      ],
    };
    const checkout = {
      draft: { channelCode: "web", buyerIdentity: { customerId: "customer-1" } },
      result: {
        finalPricing: {
          status: "SUCCESS",
          data: {
            currencyCode: "USD",
            quoteId: "quote-1",
            revision: "quote-revision-1",
            lines: [line],
            appliedDiscounts: [
              { applicationId: "product-discount", discountClass: "PRODUCT" },
              { applicationId: "order-discount", discountClass: "ORDER" },
            ],
          },
        },
      },
    } as unknown as CheckoutCommittedSnapshot;

    const result = createOrderRewardEligibilitySnapshot(checkout, {
      customerId: "customer-1",
      segmentIds: [],
      segmentMembershipRevision: "segments-revision-1",
    });

    expect(result.eligibleAmountAfterProductDiscountsMinor).toBe("800");
    expect(result.eligibleAmountAfterAllDiscountsMinor).toBe("700");
  });

  it("rejects a customer snapshot for another checkout customer", () => {
    const checkout = {
      draft: { channelCode: "web", buyerIdentity: { customerId: "customer-1" } },
      result: { finalPricing: { status: "SUCCESS", data: { lines: [] } } },
    } as unknown as CheckoutCommittedSnapshot;

    expect(() =>
      createOrderRewardEligibilitySnapshot(checkout, {
        customerId: "customer-2",
        segmentIds: [],
        segmentMembershipRevision: "segments-revision-1",
      }),
    ).toThrow("CHECKOUT_ORDER_REWARD_CUSTOMER_MISMATCH");
  });
});

describe("place-order public idempotency identity", () => {
  const input = {
    organizationId: "0198c4d4-9c00-7000-8000-000000000001",
    storeId: "0198c4d4-9c00-7000-8000-000000000002",
    checkoutId: "0198c4d4-9c00-7000-8000-000000000003",
    idempotencyKey: "place-1",
    correlationId: "0198c4d4-9c00-7000-8000-000000000004",
    credentialId: "credential-1",
    visitorId: "visitor-1234567890",
    userId: null,
    returnUrl: null,
  } as const;

  it("isolates anonymous visitors", () => {
    expect(placeOrderRequestHash(input)).not.toBe(
      placeOrderRequestHash({ ...input, visitorId: "visitor-0987654321" }),
    );
  });

  it("keeps recovery attempts on the original public request hash", () => {
    expect(placeOrderRequestHash(input)).toBe(
      placeOrderRequestHash({ ...input, recoveryOfWorkflowId: "failed-workflow" }),
    );
  });
});

function quotedLine(input: {
  lineId: string;
  amountMinor: string;
  productId: string;
  variantId: string;
  contributesToTotals?: boolean;
  children?: readonly unknown[];
}) {
  return {
    lineId: input.lineId,
    contributesToTotals: input.contributesToTotals ?? true,
    quantity: 1,
    merchandise: {
      variantId: input.variantId,
      targeting: {
        productId: input.productId,
        categoryIds: ["category-1"],
        tagIds: ["tag-1"],
        featureIds: ["feature-1"],
        optionValueIds: ["option-value-1"],
      },
    },
    subtotal: { amountMinor: input.amountMinor, currencyCode: "USD" },
    total: { amountMinor: input.amountMinor, currencyCode: "USD" },
    discountAllocations: [],
    children: input.children ?? [],
  };
}
