import {
  parseResolveBuyerEligibilityParams,
  parseResolveBuyerEligibilityResult,
  resolveBuyerEligibilityResultSchema,
} from "../schemas.js";

const params = {
  storeId: "store-1",
  customerId: "customer-1",
  effectiveAt: "2026-08-02T10:00:00.000+03:00",
};

describe("customer checkout eligibility schemas", () => {
  it("accepts an offset timestamp and rejects unknown request fields", () => {
    expect(parseResolveBuyerEligibilityParams(params)).toEqual(params);
    expect(() =>
      parseResolveBuyerEligibilityParams({ ...params, unexpected: true })
    ).toThrow();
  });

  it("rejects duplicate segment IDs and mismatched success identity", () => {
    const result = {
      ok: true,
      ...params,
      segmentIds: ["segment-1", "segment-1"],
      segmentMembershipRevision: "sha256:revision",
    };
    expect(() => resolveBuyerEligibilityResultSchema.parse(result)).toThrow();
    expect(() =>
      parseResolveBuyerEligibilityResult(params, {
        ...result,
        storeId: "other-store",
        segmentIds: [],
      })
    ).toThrow();
    expect(() =>
      resolveBuyerEligibilityResultSchema.parse({
        ...result,
        segmentIds: ["segment-2", "segment-1"],
      })
    ).toThrow();
    expect(() =>
      resolveBuyerEligibilityResultSchema.parse({
        ...result,
        segmentIds: Array.from({ length: 501 }, (_, index) => `segment-${index}`),
      })
    ).toThrow();
  });

  it("enforces lifecycle reasons and retryability per failure variant", () => {
    expect(() =>
      resolveBuyerEligibilityResultSchema.parse({
        ok: false,
        code: "CUSTOMER_NOT_ELIGIBLE",
        reason: "UNKNOWN",
        message: "Not eligible",
        retryable: false,
      })
    ).toThrow();
    expect(() =>
      resolveBuyerEligibilityResultSchema.parse({
        ok: false,
        code: "CUSTOMER_NOT_FOUND",
        message: "Not found",
        retryable: true,
      })
    ).toThrow();
  });
});
