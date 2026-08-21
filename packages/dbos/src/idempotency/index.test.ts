import {
  buildIdempotencyKey,
  InvalidTimeWindowIdempotencyContextError,
  type TimeWindowIdempotencyContext,
} from "./index.js";

const baseContext = {
  source: "time-window",
  organizationId: "org-1",
  resourceId: "product-1",
  operation: "productUpdate",
  content: { title: "Same title" },
  windowMs: 5_000,
} satisfies Omit<TimeWindowIdempotencyContext, "requestTimestamp">;

describe("time-window idempotency", () => {
  it("reuses a key for equal content in the same time window", () => {
    const first = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      requestTimestamp: 10_001,
    });
    const repeated = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      requestTimestamp: 14_999,
    });

    expect(repeated).toBe(first);
  });

  it("creates a new key in the next time window", () => {
    const first = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      requestTimestamp: 14_999,
    });
    const later = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      requestTimestamp: 15_000,
    });

    expect(later).not.toBe(first);
  });

  it("does not collapse different content", () => {
    const first = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      requestTimestamp: 10_001,
    });
    const changed = buildIdempotencyKey("catalog.productUpdate", {
      ...baseContext,
      content: { title: "Different title" },
      requestTimestamp: 10_001,
    });

    expect(changed).not.toBe(first);
  });

  it("reports an invalid request timestamp explicitly", () => {
    expect(() =>
      buildIdempotencyKey("catalog.productUpdate", {
        ...baseContext,
        requestTimestamp: Number.NaN,
      }),
    ).toThrow(
      new InvalidTimeWindowIdempotencyContextError(
        "requestTimestamp must be a non-negative safe integer Unix timestamp in milliseconds",
      ),
    );
  });
});
