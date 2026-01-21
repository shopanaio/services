import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
} from "../SagaExecutionContext";
import {
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  toErrorInfo,
} from "../types";

describe("SagaExecutionContext", () => {
  it("tracks executed steps for compensation", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordStep("createStore", "createStore", ["id-1", { name: "test" }], {});
    ctx.recordStep("createRoles", "createRoles", ["id-1"], {});

    const stepsToCompensate = ctx.getStepsToCompensate();
    expect(stepsToCompensate).toHaveLength(2);
    // Reverse order for compensation
    expect(stepsToCompensate[0].method).toBe("createRoles");
    expect(stepsToCompensate[1].method).toBe("createStore");
  });

  it("tracks failed step", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordFailure("step2");

    expect(ctx.getFailedStep()).toBe("step2");
  });

  it("stores step args for compensation", () => {
    const ctx = new SagaExecutionContext("saga-123");
    const args = ["id-1", { name: "test" }];

    ctx.recordStep("createStore", "Create Store", args, {});

    const steps = ctx.getStepsToCompensate();
    expect(steps[0].method).toBe("createStore");
    expect(steps[0].stepName).toBe("Create Store");
    expect(steps[0].args).toEqual(args);
    expect(steps[0].config).toEqual({});
  });
});

describe("sagaContextStorage", () => {
  it("throws when called outside context", () => {
    expect(() => getSagaContext()).toThrow(
      "SagaStep called outside of saga execution context",
    );
  });

  it("returns context when inside run()", async () => {
    const ctx = new SagaExecutionContext("saga-456");

    await sagaContextStorage.run(ctx, async () => {
      const retrieved = getSagaContext();
      expect(retrieved.sagaId).toBe("saga-456");
    });
  });
});

describe("Error classes", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  describe("RetryableError", () => {
    it("is marked as retryable", () => {
      const error = new RetryableError("Network timeout");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("RetryableError");
    });

    it("preserves cause", () => {
      const cause = new Error("Original");
      const error = new RetryableError("Wrapped", cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe("FatalError", () => {
    it("is marked as non-retryable", () => {
      const error = new FatalError("Validation failed");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("FatalError");
    });

    it("supports custom error code", () => {
      const error = new FatalError("Not found", undefined, "NOT_FOUND");
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("StepExecutionError", () => {
    it("wraps step context", () => {
      const cause = new Error("DB error");
      const error = new StepExecutionError("createStore", "createStore", cause);

      expect(error.stepName).toBe("createStore");
      expect(error.methodName).toBe("createStore");
      expect(error.cause).toBe(cause);
      expect(error.message).toContain("createStore");
    });
  });

  describe("StepTimeoutError", () => {
    it("is non-retryable", () => {
      const error = new StepTimeoutError("slowStep", 5000);
      expect(error.retryable).toBe(false);
      expect(error.code).toBe("STEP_TIMEOUT");
      expect(error.message).toContain("5000ms");
    });
  });
});

describe("isRetryableError", () => {
  it("returns true for RetryableError", () => {
    expect(isRetryableError(new RetryableError("test"))).toBe(true);
  });

  it("returns false for FatalError", () => {
    expect(isRetryableError(new FatalError("test"))).toBe(false);
  });

  it("returns true for network errors", () => {
    const patterns = [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "socket hang up",
      "service unavailable",
      "503 Service Temporarily Unavailable",
    ];

    for (const msg of patterns) {
      expect(isRetryableError(new Error(msg))).toBe(true);
    }
  });

  it("returns false for unknown errors", () => {
    expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
    expect(isRetryableError(new TypeError("undefined is not a function"))).toBe(
      false,
    );
  });
});

describe("withTimeout", () => {
  it("resolves if promise completes in time", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000, "testStep");
    expect(result).toBe("ok");
  });

  it("rejects with StepTimeoutError if timeout exceeded", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));

    await expect(withTimeout(slowPromise, 10, "slowStep")).rejects.toThrow(
      StepTimeoutError,
    );
  });

  it("propagates original error", async () => {
    const failingPromise = Promise.reject(new Error("Original error"));

    await expect(withTimeout(failingPromise, 1000, "testStep")).rejects.toThrow(
      "Original error",
    );
  });
});

describe("toErrorInfo", () => {
  it("converts Error to serializable shape", () => {
    const error = new FatalError("Test error", undefined, "TEST_CODE");
    const info = toErrorInfo(error);

    expect(info.name).toBe("FatalError");
    expect(info.message).toBe("Test error");
    expect(info.code).toBe("TEST_CODE");
  });

  it("includes retryable flag", () => {
    const retryable = new RetryableError("network");
    const fatal = new FatalError("validation");

    expect(toErrorInfo(retryable).retryable).toBe(true);
    expect(toErrorInfo(fatal).retryable).toBe(false);
  });

  it("omits stack in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("test");
    const info = toErrorInfo(error);

    expect(info.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});
