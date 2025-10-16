import { describe, it, expect, jest } from "@jest/globals";
import { HookRegistry } from "../hook-registry";
import type { Hook, HookContext, HookStage } from "../interface";

describe("HookRegistry", () => {
  const createMockHook = (
    name: string,
    stage: HookStage,
    supports = true
  ): Hook => ({
    getName: () => name,
    getStage: () => stage,
    supports: jest.fn(() => supports) as unknown as Hook["supports"],
    execute: jest.fn() as unknown as Hook["execute"],
  });

  const createMockContext = (): HookContext => ({
    repo: { name: "test", owner: "test", full_name: "test/test" } as any,
    pipeline: { event: "push" } as any,
    netrc: {} as any,
    env: {},
    metadata: {},
    errors: [],
  });

  it("should register hooks", () => {
    const registry = new HookRegistry();
    const hook = createMockHook("test", "pre-build" as HookStage);

    registry.register(hook);
    expect(registry.getHookCount()).toBe(1);
  });

  it("should group hooks by stage", () => {
    const registry = new HookRegistry();
    const hook1 = createMockHook("test1", "before-all" as HookStage);
    const hook2 = createMockHook("test2", "before-all" as HookStage);
    const hook3 = createMockHook("test3", "after-all" as HookStage);

    registry.register(hook1);
    registry.register(hook2);
    registry.register(hook3);

    const beforeAllHooks = registry.getHooksForStage("before-all" as HookStage);
    const afterAllHooks = registry.getHooksForStage("after-all" as HookStage);

    expect(beforeAllHooks).toHaveLength(2);
    expect(afterAllHooks).toHaveLength(1);
  });

  it("should execute hooks for a stage", async () => {
    const registry = new HookRegistry();
    const hook1 = createMockHook("test1", "before-all" as HookStage);
    const hook2 = createMockHook("test2", "before-all" as HookStage);

    registry.register(hook1);
    registry.register(hook2);

    const context = createMockContext();
    await registry.executeStage("before-all" as HookStage, context);

    expect(hook1.supports).toHaveBeenCalledWith(context);
    expect(hook1.execute).toHaveBeenCalledWith(context);
    expect(hook2.supports).toHaveBeenCalledWith(context);
    expect(hook2.execute).toHaveBeenCalledWith(context);
  });

  it("should skip hooks that do not support context", async () => {
    const registry = new HookRegistry();
    const hook1 = createMockHook("test1", "before-each" as HookStage, true);
    const hook2 = createMockHook("test2", "before-each" as HookStage, false);

    registry.register(hook1);
    registry.register(hook2);

    const context = createMockContext();
    await registry.executeStage("before-each" as HookStage, context);

    expect(hook1.execute).toHaveBeenCalled();
    expect(hook2.execute).not.toHaveBeenCalled();
  });

  it("should capture errors during hook execution", async () => {
    const registry = new HookRegistry();
    const error = new Error("Hook failed");
    const hook = createMockHook("failing-hook", "before-each" as HookStage);
    const executeMock = hook.execute as jest.MockedFunction<Hook["execute"]>;
    executeMock.mockRejectedValue(error);

    registry.register(hook);

    const context = createMockContext();
    await expect(
      registry.executeStage("before-each" as HookStage, context)
    ).rejects.toThrow("Hook failed");

    expect(context.errors).toHaveLength(1);
    expect(context.errors[0].hookName).toBe("failing-hook");
    expect(context.errors[0].stage).toBe("before-each");
  });

  it("should not throw errors for after-all hooks", async () => {
    const registry = new HookRegistry();
    const error = new Error("AfterAll hook failed");
    const hook = createMockHook("failing-after-all", "after-all" as HookStage);
    const executeMock = hook.execute as jest.MockedFunction<Hook["execute"]>;
    executeMock.mockRejectedValue(error);

    registry.register(hook);

    const context = createMockContext();
    // Should not throw
    await registry.executeStage("after-all" as HookStage, context);

    expect(context.errors).toHaveLength(1);
  });

  it("should clear all hooks", () => {
    const registry = new HookRegistry();
    registry.register(createMockHook("test1", "before-all" as HookStage));
    registry.register(createMockHook("test2", "after-all" as HookStage));

    expect(registry.getHookCount()).toBe(2);
    registry.clear();
    expect(registry.getHookCount()).toBe(0);
  });

  it("should return hook count", () => {
    const registry = new HookRegistry();
    expect(registry.getHookCount()).toBe(0);

    registry.register(createMockHook("test1", "before-all" as HookStage));
    expect(registry.getHookCount()).toBe(1);

    registry.register(createMockHook("test2", "after-each" as HookStage));
    expect(registry.getHookCount()).toBe(2);
  });
});
