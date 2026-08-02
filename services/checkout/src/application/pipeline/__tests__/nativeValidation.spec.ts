import type { ValidateCheckoutRequest } from "../contracts/index.js";
import { createNativeCheckoutValidationOperations } from "../CheckoutValidationRunner.js";
import { validationRequestFixture } from "./fixtures.js";

function quotedLine(input: {
  lineId: string;
  available?: boolean;
  quantity?: number;
  maxQuantity?: number | null;
  children?: readonly unknown[];
}): ValidateCheckoutRequest["finalQuote"]["lines"][number] {
  return {
    lineId: input.lineId,
    quantity: input.quantity ?? 1,
    availability: {
      available: input.available ?? true,
      maxQuantity: input.maxQuantity ?? null,
    },
    children: input.children ?? [],
  } as ValidateCheckoutRequest["finalQuote"]["lines"][number];
}

function rules(request: ValidateCheckoutRequest): string[] {
  return createNativeCheckoutValidationOperations(request).map(
    ({ source }) => source.type === "NATIVE" ? source.rule : "FUNCTION",
  );
}

describe("native checkout readiness", () => {
  it("returns CART_EMPTY and does not require payment for a zero total", () => {
    expect(rules(validationRequestFixture())).toEqual(["CART_EMPTY"]);
  });

  it("groups unavailable and quantity operations by canonical rule order", () => {
    const request = validationRequestFixture();
    const first = quotedLine({
      lineId: "line-1",
      available: false,
      quantity: 2,
      maxQuantity: 0,
    });
    const child = quotedLine({
      lineId: "line-child",
      available: false,
      quantity: 3,
      maxQuantity: 2,
    });
    const second = quotedLine({
      lineId: "line-2",
      quantity: 50,
      maxQuantity: null,
      children: [child],
    });
    const withLines = {
      ...request,
      finalQuote: { ...request.finalQuote, lines: [first, second] },
    };

    const operations = createNativeCheckoutValidationOperations(withLines);
    expect(operations.map(({ code }) => code)).toEqual([
      "LINE_UNAVAILABLE",
      "LINE_UNAVAILABLE",
      "LINE_QUANTITY_EXCEEDED",
      "LINE_QUANTITY_EXCEEDED",
    ]);
    expect(operations.map(({ lineId }) => lineId)).toEqual([
      "line-1",
      "line-child",
      "line-1",
      "line-child",
    ]);
  });

  it("emits delivery and positive-total payment rules in fixed order", () => {
    const request = validationRequestFixture();
    const positive = { amountMinor: "100", currencyCode: "USD" } as const;
    const withReadinessFailures = {
      ...request,
      preliminary: {
        ...request.preliminary,
        deliveryIntent: {
          ...request.preliminary.deliveryIntent,
          unassignedPhysicalLineIds: ["line-address"],
        },
      },
      delivery: {
        ...request.delivery,
        groups: [
          {
            groupId: "group-empty",
            options: [],
            selection: { status: "NONE" },
          },
          {
            groupId: "group-required",
            options: [{ handle: "option-1" }],
            selection: { status: "NONE" },
          },
          {
            groupId: "group-reset",
            options: [{ handle: "option-2" }],
            selection: { status: "RESET" },
          },
        ],
        orphanedSelectionResets: [{ groupId: "group-orphan" }],
      },
      finalQuote: {
        ...request.finalQuote,
        totals: { ...request.finalQuote.totals, payableTotal: positive },
      },
    } as unknown as ValidateCheckoutRequest;

    expect(rules(withReadinessFailures)).toEqual([
      "CART_EMPTY",
      "DELIVERY_ADDRESS_REQUIRED",
      "DELIVERY_OPTIONS_UNAVAILABLE",
      "DELIVERY_OPTION_REQUIRED",
      "DELIVERY_OPTION_INVALID",
      "DELIVERY_OPTION_ORPHANED",
      "PAYMENT_METHODS_UNAVAILABLE",
    ]);
  });

  it.each([
    [{ status: "NONE" }, "PAYMENT_METHOD_REQUIRED"],
    [{ status: "RESET" }, "PAYMENT_METHOD_INVALID"],
  ] as const)("maps payment selection %o", (selection, expected) => {
    const request = validationRequestFixture();
    const withPayment = {
      ...request,
      finalQuote: {
        ...request.finalQuote,
        totals: {
          ...request.finalQuote.totals,
          payableTotal: { amountMinor: "1", currencyCode: "USD" },
        },
      },
      payment: {
        ...request.payment,
        methods: [{ handle: "method-1" }],
        selection,
      },
    } as unknown as ValidateCheckoutRequest;
    expect(rules(withPayment)).toContain(expected);
  });
});
