import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { HookLoader, Hook } from "src/service/interface";

/**
 * Loads hook scripts from a directory.
 * Recursively searches for files matching *.hook.ts (dev mode) or *.hook.js (production) patterns.
 */
export class HookScriptLoader implements HookLoader {
  static DEFAULT_HOOKS_DIR = "hooks";

  private readonly hooksDir: string;

  /**
   * Creates a new HookScriptLoader instance.
   *
   * @param hooksDir - Directory to search for hook scripts. Can be relative or absolute path.
   */
  constructor(hooksDir = HookScriptLoader.DEFAULT_HOOKS_DIR) {
    this.hooksDir = path.isAbsolute(hooksDir)
      ? hooksDir
      : path.join(process.cwd(), hooksDir);
  }

  /**
   * Loads all hook scripts from the configured directory.
   *
   * @returns Promise that resolves to array of Hook instances.
   */
  async load(): Promise<Hook[]> {
    const hooks: Hook[] = [];

    if (!fs.existsSync(this.hooksDir)) {
      return hooks;
    }

    const hookFiles = this.findHookFiles(this.hooksDir);

    for (const filePath of hookFiles) {
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const exports = this.extractHooks(module);
        hooks.push(...exports);
      } catch (error) {
        console.error(`Failed to load hook from ${filePath}:`, error);
      }
    }

    return hooks;
  }

  /**
   * Recursively finds all files matching the strict pattern: *.hook.ts or *.hook.js
   *
   * @param dir - Directory to search in.
   * @returns Array of absolute file paths.
   */
  private findHookFiles(dir: string): string[] {
    const results: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...this.findHookFiles(fullPath));
      } else if (entry.isFile()) {
        if (
          entry.name.endsWith(".hook.js") ||
          // Enabled .ts for dev mode
          entry.name.endsWith(".hook.ts")
        ) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }

  /**
   * Extracts Hook instances from a module using a strict contract:
   * - default export MUST be a class (constructor) with zero-arg constructor
   * - the loader will instantiate it and validate the instance shape
   * Named exports and pre-built instances are ignored.
   *
   * @param module - The loaded module.
   * @returns Array of Hook instances.
   */
  private extractHooks(module: unknown): Hook[] {
    const hooks: Hook[] = [];

    if (!module || typeof module !== "object") {
      return hooks;
    }

    const moduleObj = module as Record<string, unknown>;
    const maybeCtor = moduleObj.default as unknown;
    if (typeof maybeCtor === "function") {
      try {
        const instance = new (maybeCtor as new () => unknown)();
        if (this.isHookInstance(instance)) {
          hooks.push(instance as Hook);
        }
      } catch (error) {
        console.error("Failed to instantiate default hook export:", error);
      }
    }

    return hooks;
  }

  /**
   * Checks if a value implements the Hook interface.
   *
   * @param value - Value to check.
   * @returns True if the value implements Hook interface.
   */
  private isHookInstance(value: unknown): value is Hook {
    if (!value || typeof value !== "object") {
      return false;
    }

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.getName === "function" &&
      typeof obj.getStage === "function" &&
      typeof obj.supports === "function" &&
      typeof obj.execute === "function"
    );
  }
}
