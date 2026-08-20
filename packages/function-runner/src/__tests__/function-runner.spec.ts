import { describe, expect, it, jest } from "@jest/globals";
import {
  COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
  COMMERCE_FUNCTION_MAX_INVOCATION_BYTES,
  COMMERCE_FUNCTION_MAX_OUTPUT_BYTES,
  canonicalizeCommerceFunctionJson,
  type Apps,
  type CommerceFunctionInvocation,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { BrokerFunctionExecutor } from "../BrokerFunctionExecutor.js";
import { CommerceFunctionRunner } from "../CommerceFunctionRunner.js";
import type {
  CommerceFunctionBindingRef,
  CommerceFunctionRunRequest,
  FunctionTargetDefinition,
} from "../contracts.js";
import { CommerceFunctionExecutionError, FunctionEnvelopeError } from "../errors.js";
import { FunctionRouteResolver } from "../FunctionRouteResolver.js";
import { FunctionTargetRegistry } from "../FunctionTargetRegistry.js";
import { canonicalizeEnvelope } from "../trace.js";

const TARGET = "cart.lines.discounts.generate.run";

describe("FunctionRouteResolver", () => {
  it("discovers multiple App routes and orders bindings deterministically", async () => {
    const routes = [route("installation-b", "route-b"), route("installation-a", "route-a")];
    const resolver = new FunctionRouteResolver(
      broker(async (action) => {
        expect(action).toBe("apps.listCapabilityRoutes");
        return { routes };
      }),
    );

    const plan = await resolver.resolve(
      request([
        binding("binding-b", "installation-b", "route-b", 10, 1),
        binding("binding-a", "installation-a", "route-a", 10, 1),
      ]),
      definition(),
      Date.now(),
    );

    expect(plan.items.map((item) => item.implementationId)).toEqual([
      "app:binding-a",
      "app:binding-b",
    ]);
  });

  it("marks a binding unavailable when its route revision is stale", async () => {
    const resolver = new FunctionRouteResolver(
      broker(async () => ({
        routes: [route("installation-a", "new-route-revision")],
      })),
    );

    const plan = await resolver.resolve(
      request([binding("binding-a", "installation-a", "old-route-revision", 0, 1)]),
      definition(),
    );

    expect(plan.items[0]).toMatchObject({
      implementationId: "app:binding-a",
      unavailableCode: "ROUTE_REVISION_MISMATCH",
    });
  });

  it("marks a binding unavailable when its function key does not match the route", async () => {
    const resolver = new FunctionRouteResolver(
      broker(async () => ({
        routes: [
          {
            ...route("installation-a", "route-a"),
            functionKey: "anotherFunction",
          },
        ],
      })),
    );

    const plan = await resolver.resolve(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
      definition(),
    );

    expect(plan.items[0]).toMatchObject({
      implementationId: "app:binding-a",
      unavailableCode: "FUNCTION_KEY_MISMATCH",
    });
  });

  it("changes plan revision when the configuration snapshot changes", async () => {
    const resolver = new FunctionRouteResolver(
      broker(async () => ({
        routes: [route("installation-a", "route-a")],
      })),
    );
    const base = binding("binding-a", "installation-a", "route-a", 0, 1);
    const now = Date.now();

    const first = await resolver.resolve(
      request([{ ...base, configurationSnapshot: { rate: 10 } }]),
      definition(),
      now,
    );
    const second = await resolver.resolve(
      request([{ ...base, configurationSnapshot: { rate: 20 } }]),
      definition(),
      now,
    );

    expect(first.revision).not.toBe(second.revision);
    expect(first.items[0]).toMatchObject({
      configurationSnapshotDigest: expect.any(String),
    });
  });

  it("stops route discovery at the target deadline", async () => {
    const resolver = new FunctionRouteResolver(broker(() => new Promise(() => undefined)));

    const plan = await resolver.resolve(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
      definition({ defaultTimeoutMs: 10 }),
    );

    expect(plan.items[0]).toMatchObject({
      unavailableCode: "DISCOVERY_DEADLINE_EXCEEDED",
    });
  });

  it("uses an App binding instead of the native fallback for SINGLE", async () => {
    const resolver = new FunctionRouteResolver(
      broker(async () => ({
        routes: [route("installation-a", "route-a")],
      })),
    );
    const target = definition({
      executionMode: "SINGLE",
      allowMultipleAppImplementations: false,
      nativeImplementations: [
        {
          implementationId: "native:allocator",
          action: "pricing.nativeAllocator",
        },
      ],
    });

    const plan = await resolver.resolve(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
      target,
    );

    expect(plan.items.map((item) => item.implementationId)).toEqual(["app:binding-a"]);

    const fallbackPlan = await resolver.resolve(request([]), target);

    expect(fallbackPlan.items.map((item) => item.implementationId)).toEqual(["native:allocator"]);
  });

  it("rejects more than one active App binding for SINGLE", async () => {
    const resolver = new FunctionRouteResolver(
      broker(async () => ({
        routes: [route("installation-a", "route-a"), route("installation-b", "route-b")],
      })),
    );

    await expect(
      resolver.resolve(
        request([
          binding("binding-a", "installation-a", "route-a", 0, 1),
          binding("binding-b", "installation-b", "route-b", 0, 2),
        ]),
        definition({
          executionMode: "SINGLE",
          allowMultipleAppImplementations: true,
        }),
      ),
    ).rejects.toThrow(`Target "${TARGET}" does not allow multiple App implementations`);
  });
});

describe("CommerceFunctionRunner", () => {
  it("passes correlationId to native implementations", async () => {
    let invocation: CommerceFunctionInvocation | undefined;
    const serviceBroker = broker(async (action, params) => {
      expect(action).toBe("pricing.nativeFunction");
      invocation = params as CommerceFunctionInvocation;
      return { ok: true };
    });
    const target = definition({
      nativeImplementations: [
        {
          implementationId: "native:pricing",
          action: "pricing.nativeFunction",
        },
      ],
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    await runner.run({
      ...request([]),
      correlationId: "correlation-1",
    });

    expect(invocation?.correlationId).toBe("correlation-1");
    expect(invocation?.deadlineAt).toEqual(expect.any(String));
  });

  it("returns multi-App outputs in plan order, not completion order", async () => {
    const routes = [route("installation-a", "route-a"), route("installation-b", "route-b")];
    const serviceBroker = broker(async (action, params) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      const invocation = params as Apps.ExecuteCapabilityParams;
      expect(invocation.functionKey).toBe("discounts");
      const isFirst = invocation.installationId === "installation-a";
      await delay(isFirst ? 20 : 1);
      const actual = routes.find((entry) => entry.installationId === invocation.installationId)!;
      return {
        ...actual,
        data: { installationId: invocation.installationId },
      } satisfies Apps.ExecuteCapabilityResult;
    });
    const target = definition({ concurrencyLimit: 2 });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([
        binding("binding-a", "installation-a", "route-a", 0, 1),
        binding("binding-b", "installation-b", "route-b", 0, 2),
      ]),
    );

    expect(result.outputs.map((output) => output.implementationId)).toEqual([
      "app:binding-a",
      "app:binding-b",
    ]);
    expect(result.trace.implementations[0]).toMatchObject({
      plannedRouteRevision: "route-a",
      routeRevision: "route-a",
      appVersion: "1.0.0",
    });
  });

  it("skips OPTIONAL failures and rejects REQUIRED failures", async () => {
    const routes = [route("installation-a", "route-a"), route("installation-b", "route-b")];
    const serviceBroker = broker(async (action, params) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      const invocation = params as Apps.ExecuteCapabilityParams;
      if (invocation.installationId === "installation-a") {
        throw new Error("implementation failed");
      }
      const actual = routes[1]!;
      return {
        ...actual,
        data: { ok: true },
      } satisfies Apps.ExecuteCapabilityResult;
    });
    const target = definition();
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );
    const failedBinding = binding("binding-a", "installation-a", "route-a", 0, 1);
    const successfulBinding = binding("binding-b", "installation-b", "route-b", 0, 2);

    const optionalResult = await runner.run(
      request([
        {
          ...failedBinding,
          failureMode: "OPTIONAL",
        },
        successfulBinding,
      ]),
    );
    expect(optionalResult.trace.status).toBe("PARTIAL");
    expect(optionalResult.outputs).toHaveLength(1);

    try {
      await runner.run(
        request([
          {
            ...failedBinding,
            failureMode: "REQUIRED",
          },
          successfulBinding,
        ]),
      );
      throw new Error("Expected required implementation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CommerceFunctionExecutionError);
      expect(
        (error as CommerceFunctionExecutionError).outputs.map(
          ({ implementationId }) => implementationId,
        ),
      ).toEqual(["app:binding-b"]);
    }
  });

  it("classifies a discovery timeout as DEADLINE_EXCEEDED", async () => {
    const serviceBroker = broker(() => new Promise(() => undefined));
    const target = definition({ defaultTimeoutMs: 10 });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    try {
      await runner.run(request([binding("binding-a", "installation-a", "route-a", 0, 1)]));
      throw new Error("Expected Commerce Function execution to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CommerceFunctionExecutionError);
      expect((error as CommerceFunctionExecutionError).errorClass).toBe("DEADLINE_EXCEEDED");
    }
  });

  it("does not validate or discover disabled App bindings", async () => {
    const circularConfiguration: Record<string, unknown> = {};
    circularConfiguration.self = circularConfiguration;
    const serviceBroker = broker(async () => {
      throw new Error("Disabled binding must not trigger discovery");
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([definition()]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([
        {
          ...binding("binding-disabled", "installation-disabled", "route-disabled", 0, 1),
          failureMode: "DISABLED",
          configurationSnapshot: circularConfiguration,
        },
      ]),
    );

    expect(result.outputs).toEqual([]);
    expect(result.trace.implementations).toEqual([]);
    expect(result.trace.status).toBe("SUCCEEDED");
  });

  it("stops scheduling queued implementations after REQUIRED failure", async () => {
    const invoked: string[] = [];
    const serviceBroker = broker(async (action) => {
      invoked.push(action);
      if (action === "pricing.requiredFailure") {
        throw new Error("required failure");
      }
      return { ok: true };
    });
    const target = definition({
      concurrencyLimit: 1,
      nativeImplementations: [
        {
          implementationId: "native:required-failure",
          action: "pricing.requiredFailure",
        },
        {
          implementationId: "native:queued-a",
          action: "pricing.queuedA",
        },
        {
          implementationId: "native:queued-b",
          action: "pricing.queuedB",
        },
      ],
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    try {
      await runner.run(request([]));
      throw new Error("Expected required implementation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CommerceFunctionExecutionError);
      expect(
        (error as CommerceFunctionExecutionError).trace.implementations.map(
          (implementation) => implementation.status,
        ),
      ).toEqual(["FAILED", "SKIPPED", "SKIPPED"]);
    }
    expect(invoked).toEqual(["pricing.requiredFailure"]);
  });

  it("uses stable authorization classification from Apps errors", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      throw Object.assign(new Error("Access denied: org.stores:read"), {
        errorClassification: "AUTHORIZATION_ERROR",
        errorCode: "FUNCTION_AUTHORIZATION_ERROR",
      });
    });
    const target = definition({ appFailureMode: "OPTIONAL" });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      errorClass: "AUTHORIZATION_ERROR",
      errorCode: "FUNCTION_AUTHORIZATION_ERROR",
    });
  });

  it("does not classify failures from message text", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      throw new Error("scope runtime not ready deadline");
    });
    const target = definition({ appFailureMode: "OPTIONAL" });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([target]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      errorClass: "IMPLEMENTATION_EXCEPTION",
      errorCode: "FUNCTION_IMPLEMENTATION_EXCEPTION",
    });
  });

  it("uses stable App runtime failure codes", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      throw Object.assign(new Error("App capability invocation failed"), {
        errorClassification: "APP_RUNTIME_UNAVAILABLE",
        errorCode: "APP_RUNTIME_UNAVAILABLE",
      });
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([definition({ appFailureMode: "OPTIONAL" })]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      errorClass: "APP_RUNTIME_UNAVAILABLE",
      errorCode: "APP_RUNTIME_UNAVAILABLE",
    });
  });

  it("uses a stable App deadline failure code", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      throw Object.assign(new Error("App capability invocation failed"), {
        errorClassification: "DEADLINE_EXCEEDED",
        errorCode: "FUNCTION_DEADLINE_EXCEEDED",
      });
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([definition({ appFailureMode: "OPTIONAL" })]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      errorClass: "DEADLINE_EXCEEDED",
      errorCode: "FUNCTION_DEADLINE_EXCEEDED",
    });
  });

  it("keeps the actual App route when target output validation fails", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      return {
        ...routes[0]!,
        data: new Map([["invalid", "output"]]),
      } satisfies Apps.ExecuteCapabilityResult;
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([definition({ appFailureMode: "OPTIONAL" })]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      errorClass: "INVALID_IMPLEMENTATION_OUTPUT",
      capabilityRouteId: "route:installation-a",
      appVersion: "1.0.0",
      routeRevision: "route-a",
    });
  });

  it("does not report a planned route as actual after a local timeout", async () => {
    const routes = [route("installation-a", "route-a")];
    const serviceBroker = broker(async (action) => {
      if (action === "apps.listCapabilityRoutes") return { routes };
      return new Promise(() => undefined);
    });
    const runner = new CommerceFunctionRunner(
      new FunctionTargetRegistry([
        definition({
          appFailureMode: "OPTIONAL",
          defaultTimeoutMs: 10,
        }),
      ]),
      new FunctionRouteResolver(serviceBroker),
      new BrokerFunctionExecutor(serviceBroker),
    );

    const result = await runner.run(
      request([binding("binding-a", "installation-a", "route-a", 0, 1)]),
    );

    expect(result.trace.implementations[0]).toMatchObject({
      plannedRouteRevision: "route-a",
      errorClass: "DEADLINE_EXCEEDED",
    });
    expect(result.trace.implementations[0]).not.toHaveProperty("routeRevision");
    expect(result.trace.implementations[0]).not.toHaveProperty("appVersion");
  });
});

describe("BrokerFunctionExecutor", () => {
  it("rejects native actions that are not explicitly read-only", async () => {
    const executor = new BrokerFunctionExecutor(broker(async () => ({ ok: true }), undefined));

    const outcome = await executor.execute({
      planIndex: 0,
      target: TARGET,
      storeId: "store-1",
      executionId: "execution-1",
      deadlineAt: new Date(Date.now() + 1_000).toISOString(),
      input: { cartId: "cart-1" },
      item: {
        implementationType: "NATIVE",
        implementationId: "native:pricing",
        nativeAction: "pricing.nativeFunction",
        functionBindingId: null,
        owner: {
          service: "pricing",
          resourceType: "functionTarget",
          resourceId: TARGET,
        },
        configurationRevision: null,
        configurationSnapshot: null,
        precedence: 0,
        activationSequence: 0,
        failureMode: "REQUIRED",
      },
      definition: definition(),
    });

    expect(outcome).toMatchObject({
      ok: false,
      errorClass: "AUTHORIZATION_ERROR",
      trace: {
        errorCode: "FUNCTION_ACTION_NOT_READ_ONLY",
      },
    });
  });

  it("discards an output finalized at the target deadline", async () => {
    const now = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1_000)
      .mockReturnValue(1_000);
    try {
      const executor = new BrokerFunctionExecutor(broker(async () => ({ ok: true })));

      const outcome = await executor.execute({
        planIndex: 0,
        target: TARGET,
        storeId: "store-1",
        executionId: "execution-1",
        deadlineAt: new Date(1_000).toISOString(),
        input: { cartId: "cart-1" },
        item: {
          implementationType: "NATIVE",
          implementationId: "native:pricing",
          nativeAction: "pricing.nativeFunction",
          functionBindingId: null,
          owner: {
            service: "pricing",
            resourceType: "functionTarget",
            resourceId: TARGET,
          },
          configurationRevision: null,
          configurationSnapshot: null,
          precedence: 0,
          activationSequence: 0,
          failureMode: "REQUIRED",
        },
        definition: definition(),
      });

      expect(outcome).toMatchObject({
        ok: false,
        errorClass: "DEADLINE_EXCEEDED",
        trace: {
          status: "TIMED_OUT",
          deadlineExceeded: true,
          errorCode: "FUNCTION_DEADLINE_EXCEEDED",
        },
      });
    } finally {
      now.mockRestore();
    }
  });
});

describe("Commerce Function envelopes", () => {
  it("rejects Map and Set instead of measuring them as empty objects", () => {
    expect(() => canonicalizeEnvelope(new Map([["key", "value"]]), 64, "input")).toThrow(
      FunctionEnvelopeError,
    );
    expect(() => canonicalizeCommerceFunctionJson(new Set(["value"]))).toThrow();
  });

  it("returns deeply immutable canonical JSON", () => {
    const value = canonicalizeCommerceFunctionJson({
      nested: { enabled: true },
    }) as {
      readonly nested: { readonly enabled: boolean };
    };

    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(() => {
      (value.nested as { enabled: boolean }).enabled = false;
    }).toThrow();
  });
});

describe("FunctionTargetRegistry", () => {
  it("rejects policies that exceed Apps invocation limits", () => {
    expect(
      () =>
        new FunctionTargetRegistry([
          definition({
            maxInputBytes: COMMERCE_FUNCTION_MAX_INVOCATION_BYTES + 1,
          }),
        ]),
    ).toThrow();
    expect(
      () =>
        new FunctionTargetRegistry([
          definition({
            maxEnvelopeDepth: COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH + 1,
          }),
        ]),
    ).toThrow();
    expect(
      () =>
        new FunctionTargetRegistry([
          definition({
            maxOutputBytes: COMMERCE_FUNCTION_MAX_OUTPUT_BYTES + 1,
          }),
        ]),
    ).toThrow();
  });
});

function definition(overrides: Partial<FunctionTargetDefinition> = {}): FunctionTargetDefinition {
  return {
    target: TARGET,
    owningService: "pricing",
    executionMode: "COLLECT_ALL",
    defaultTimeoutMs: 1_000,
    concurrencyLimit: 4,
    appFailureMode: "REQUIRED",
    allowMultipleAppImplementations: true,
    maxInputBytes: 64_000,
    maxOutputBytes: 64_000,
    ...overrides,
  };
}

function request(
  bindings: readonly CommerceFunctionBindingRef[],
): CommerceFunctionRunRequest<{ cartId: string }> {
  return {
    storeId: "store-1",
    target: TARGET,
    bindings,
    bindingSetRevision: "bindings-1",
    input: { cartId: "cart-1" },
    executionId: "execution-1",
  };
}

function binding(
  functionBindingId: string,
  installationId: string,
  routeRevision: string,
  precedence: number,
  activationSequence: number,
): CommerceFunctionBindingRef {
  return {
    functionBindingId,
    installationId,
    functionKey: "discounts",
    owner: {
      service: "pricing",
      resourceType: "discount",
      resourceId: functionBindingId,
    },
    configurationRevision: "configuration-1",
    configurationSnapshot: { enabled: true },
    routeRevision,
    precedence,
    activationSequence,
  };
}

function route(installationId: string, routeRevision: string): Apps.CapabilityRoute {
  return {
    capabilityRouteId: `route:${installationId}`,
    installationId,
    appCode: `app:${installationId}`,
    appVersion: "1.0.0",
    functionKey: "discounts",
    routeRevision,
  };
}

function broker(
  call: (action: string, params?: unknown) => Promise<unknown>,
  metadata: { readonly readOnly?: boolean } | undefined = {
    readOnly: true,
  },
): ServiceBroker {
  return {
    call,
    getActionMetadata: () => metadata,
  } as unknown as ServiceBroker;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
