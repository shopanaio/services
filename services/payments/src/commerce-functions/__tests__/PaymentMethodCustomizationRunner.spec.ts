import { applyPaymentMethodCustomizationOperations } from "../PaymentMethodCustomizationRunner.js";

const methods = [
  {
    handle: "one",
    code: "one",
    title: "One",
    provider: "provider",
    flow: "ONLINE" as const,
    metadata: null,
  },
  {
    handle: "two",
    code: "two",
    title: "Two",
    provider: "provider",
    flow: "ONLINE" as const,
    metadata: null,
  },
];

describe("payment method customization policy", () => {
  it("applies rename, move and hide without changing executable identities", () => {
    const hidden = new Set<string>();
    const result = applyPaymentMethodCustomizationOperations(
      [...methods],
      [
        { type: "RENAME", methodHandle: "two", title: "Second" },
        { type: "MOVE", methodHandle: "two", index: 0 },
        { type: "HIDE", methodHandle: "one", reasonCode: "NOT_ELIGIBLE" },
      ],
      hidden,
    );
    expect(result).toEqual([{ ...methods[1], title: "Second" }]);
    expect(hidden).toEqual(new Set(["one"]));
  });

  it("rejects operations for fabricated handles", () => {
    expect(() =>
      applyPaymentMethodCustomizationOperations(
        [...methods],
        [{ type: "RENAME", methodHandle: "unknown", title: "No" }],
        new Set(),
      ),
    ).toThrow("Unknown payment method handle");
  });
});
