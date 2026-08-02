import {
  CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION,
  EMPTY_CHECKOUT_VALIDATION_BINDING_SET_REVISION,
  CheckoutPipelineStageError,
  checkoutValidationFunctionOutputSchema,
} from "../index.js";

describe("checkout validation public contracts", () => {
  it("exports the one canonical target definition", () => {
    expect(CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION).toEqual({
      target: "cart.validations.generate.run",
      owningService: "checkout",
      executionMode: "COLLECT_ALL",
      nativeImplementations: [],
      defaultTimeoutMs: 3_000,
      concurrencyLimit: 8,
      appFailureMode: "REQUIRED",
      allowMultipleAppImplementations: true,
      maxInputBytes: 1_048_576,
      maxOutputBytes: 1_048_576,
      maxEnvelopeDepth: 32,
      tracePolicy: { inputDigest: true, outputDigest: true },
    });
    expect(EMPTY_CHECKOUT_VALIDATION_BINDING_SET_REVISION).toBe(
      "checkout-validation-bindings:empty:v1",
    );
  });

  it("keeps function output source-less", () => {
    const operation = {
      code: "APP_WARNING",
      message: "Warning.",
      severity: "WARNING",
      field: [],
      lineId: null,
    } as const;
    expect(
      checkoutValidationFunctionOutputSchema.parse({
        schemaVersion: 1,
        operations: [operation],
      }),
    ).toEqual({ schemaVersion: 1, operations: [operation] });
    expect(() =>
      checkoutValidationFunctionOutputSchema.parse({
        schemaVersion: 1,
        operations: [{ ...operation, source: { type: "NATIVE" } }],
      }),
    ).toThrow();
  });

  it("rejects invalid typed public errors at construction", () => {
    expect(
      () =>
        new CheckoutPipelineStageError({
          code: "not-public",
          message: "No.",
          retryable: false,
        }),
    ).toThrow(TypeError);
  });
});
