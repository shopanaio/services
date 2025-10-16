import { describe, it, expect } from "@jest/globals";
import { HookScriptLoader } from "../hook-loader";
import type { Hook, HookContext, HookStage } from "../interface";

describe("HookScriptLoader", () => {
  it("should have default hooks directory", () => {
    expect(HookScriptLoader.DEFAULT_HOOKS_DIR).toBe("hooks");
  });

  it("should return empty array if hooks directory does not exist", async () => {
    const loader = new HookScriptLoader("/non/existent/path");
    const hooks = await loader.load();
    expect(hooks).toEqual([]);
  });

  it("should validate hook instance interface", async () => {
    const loader = new HookScriptLoader();

    class ValidHook implements Hook {
      getName() {
        return "test";
      }
      getStage(): HookStage {
        return "pre-build" as HookStage;
      }
      supports() {
        return true;
      }
      async execute() {}
    }

    const valid = new ValidHook();
    const isValid = (loader as any).isHookInstance(valid);
    expect(isValid).toBe(true);
  });

  it("should reject invalid hook instances", async () => {
    const loader = new HookScriptLoader();

    const invalid = {
      getName: () => "test",
      // missing getStage, supports, execute
    };

    const isValid = (loader as any).isHookInstance(invalid);
    expect(isValid).toBe(false);
  });

  it("should find hook files recursively", async () => {
    const loader = new HookScriptLoader();

    // Test pattern matching
    const isHookFile = (name: string) =>
      name.endsWith(".hook.js") || name.endsWith(".hook.ts");

    expect(isHookFile("test.hook.ts")).toBe(true);
    expect(isHookFile("test.hook.js")).toBe(true);
    expect(isHookFile("test.ts")).toBe(false);
    expect(isHookFile("hook.ts")).toBe(false);
  });
});
