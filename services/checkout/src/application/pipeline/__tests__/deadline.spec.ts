import {
  runWithCheckoutDeadline,
  type CheckoutPipelineRuntime,
} from "../CheckoutPipeline.js";

class ControlledRuntime implements CheckoutPipelineRuntime {
  time = 0;
  callbacks: (() => void)[] = [];
  delays: number[] = [];
  cancelled: unknown[] = [];

  now(): number { return this.time; }
  schedule(callback: () => void, delayMs: number): unknown {
    const handle = {};
    this.callbacks.push(callback);
    this.delays.push(delayMs);
    return handle;
  }
  cancel(handle: unknown): void { this.cancelled.push(handle); }
}

describe("checkout deadline settlement guard", () => {
  it("does not invoke a port when already at the deadline", async () => {
    const runtime = new ControlledRuntime();
    runtime.time = 10;
    const call = jest.fn(async () => "unused");
    await expect(runWithCheckoutDeadline(runtime, 10, call)).resolves.toEqual({
      accepted: false,
      deadlineObservedAt: 10,
    });
    expect(call).not.toHaveBeenCalled();
  });

  it("accepts settlement observed exactly at the deadline", async () => {
    const runtime = new ControlledRuntime();
    let resolve!: (value: string) => void;
    const pending = runWithCheckoutDeadline(runtime, 10, () => new Promise((done) => { resolve = done; }));
    runtime.time = 10;
    resolve("ok");
    await expect(pending).resolves.toEqual({ accepted: true, value: "ok", resultObservedAt: 10 });
    expect(runtime.cancelled).toHaveLength(1);
  });

  it("turns a late rejection into timeout and consumes it", async () => {
    const runtime = new ControlledRuntime();
    let reject!: (error: unknown) => void;
    const pending = runWithCheckoutDeadline(runtime, 10, () => new Promise((_done, fail) => { reject = fail; }));
    runtime.time = 11;
    reject(new Error("private"));
    await expect(pending).resolves.toEqual({ accepted: false, deadlineObservedAt: 11 });
  });

  it("does not accept fulfillment observed after the deadline", async () => {
    const runtime = new ControlledRuntime();
    let resolve!: (value: string) => void;
    const pending = runWithCheckoutDeadline(
      runtime,
      10,
      () => new Promise((done) => { resolve = done; }),
    );
    runtime.time = 11;
    resolve("late");
    await expect(pending).resolves.toEqual({
      accepted: false,
      deadlineObservedAt: 11,
    });
    expect(runtime.cancelled).toHaveLength(1);
  });

  it("lets the timer win strictly after the deadline", async () => {
    const runtime = new ControlledRuntime();
    const pending = runWithCheckoutDeadline(
      runtime,
      10,
      () => new Promise<string>(() => undefined),
    );
    expect(runtime.delays).toEqual([11]);
    runtime.time = 11;
    runtime.callbacks[0]!();
    await expect(pending).resolves.toEqual({
      accepted: false,
      deadlineObservedAt: 11,
    });
  });

  it("reschedules an early timer callback for the first millisecond after deadline", async () => {
    const runtime = new ControlledRuntime();
    let resolve!: (value: string) => void;
    const pending = runWithCheckoutDeadline(
      runtime,
      10,
      () => new Promise((done) => { resolve = done; }),
    );
    runtime.time = 9;
    runtime.callbacks[0]!();
    expect(runtime.delays).toEqual([11, 2]);
    runtime.time = 10;
    resolve("accepted");
    await expect(pending).resolves.toMatchObject({
      accepted: true,
      value: "accepted",
      resultObservedAt: 10,
    });
    expect(runtime.cancelled).toHaveLength(1);
  });

  it("rejects a synchronous scheduler callback as a guarded failure", async () => {
    const runtime: CheckoutPipelineRuntime = {
      now: () => 0,
      schedule: (callback) => {
        callback();
        return {};
      },
      cancel: jest.fn(),
    };
    await expect(
      runWithCheckoutDeadline(
        runtime,
        10,
        () => new Promise<string>(() => undefined),
      ),
    ).resolves.toMatchObject({
      accepted: true,
      resultObservedAt: 0,
      error: expect.any(TypeError),
    });
  });

  it("does not accept a scheduler failure observed after the deadline", async () => {
    let now = 0;
    const runtime: CheckoutPipelineRuntime = {
      now: () => now,
      schedule: () => {
        now = 11;
        throw new Error("scheduler unavailable");
      },
      cancel: jest.fn(),
    };
    await expect(
      runWithCheckoutDeadline(
        runtime,
        10,
        () => new Promise<string>(() => undefined),
      ),
    ).resolves.toEqual({ accepted: false, deadlineObservedAt: 11 });
  });

  it("handles a synchronous throw without scheduling or cancelling", async () => {
    const runtime = new ControlledRuntime();
    const error = new Error("sync");
    await expect(runWithCheckoutDeadline(runtime, 10, () => { throw error; })).resolves.toEqual({
      accepted: true,
      error,
      resultObservedAt: 0,
    });
    expect(runtime.callbacks).toHaveLength(0);
    expect(runtime.cancelled).toHaveLength(0);
  });

  it("contains a malformed thenable as an observed rejection", async () => {
    const runtime = new ControlledRuntime();
    const privateError = new Error("malformed promise");
    const malformed = {
      then: () => {
        throw privateError;
      },
    } as unknown as Promise<string>;
    await expect(
      runWithCheckoutDeadline(runtime, 10, () => malformed),
    ).resolves.toEqual({
      accepted: true,
      error: privateError,
      resultObservedAt: 0,
    });
    expect(runtime.callbacks).toHaveLength(0);
    expect(runtime.cancelled).toHaveLength(0);
  });
});
