import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { WorkflowLoader, WorkflowScript } from "src/service/interface";

/**
 * Loads workflow scripts from a directory.
 * Recursively searches for files matching *.workflow.ts or *.workflow.js patterns.
 */
export class WorkflowScriptLoader implements WorkflowLoader {
  static DEFAULT_WORKFLOWS_DIR = "workflows";

  private readonly workflowsDir: string;

  /**
   * Creates a new WorkflowScriptLoader instance.
   *
   * @param workflowsDir - Directory to search for workflow scripts. Can be relative or absolute path.
   */
  constructor(workflowsDir = WorkflowScriptLoader.DEFAULT_WORKFLOWS_DIR) {
    this.workflowsDir = path.isAbsolute(workflowsDir)
      ? workflowsDir
      : path.join(process.cwd(), workflowsDir);
  }

  /**
   * Loads all workflow scripts from the configured directory.
   *
   * @returns Promise that resolves to array of WorkflowScript instances.
   */
  async load(): Promise<WorkflowScript[]> {
    const scripts: WorkflowScript[] = [];

    if (!fs.existsSync(this.workflowsDir)) {
      return scripts;
    }

    const workflowFiles = this.findWorkflowFiles(this.workflowsDir);

    for (const filePath of workflowFiles) {
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const exports = this.extractWorkflowScripts(module);
        scripts.push(...exports);
      } catch (error) {
        console.error(`Failed to load workflow from ${filePath}:`, error);
      }
    }

    return scripts;
  }

  /**
   * Recursively finds all files matching *.workflow.ts or *.workflow.js patterns.
   *
   * @param dir - Directory to search in.
   * @returns Array of absolute file paths.
   */
  private findWorkflowFiles(dir: string): string[] {
    const results: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...this.findWorkflowFiles(fullPath));
      } else if (entry.isFile()) {
        if (
          entry.name.endsWith(".workflow.ts") ||
          entry.name.endsWith(".workflow.js")
        ) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }

  /**
   * Extracts WorkflowScript instances from a module.
   * Supports both default export and named exports.
   *
   * @param module - The loaded module.
   * @returns Array of WorkflowScript instances.
   */
  private extractWorkflowScripts(module: unknown): WorkflowScript[] {
    const scripts: WorkflowScript[] = [];

    if (!module || typeof module !== "object") {
      return scripts;
    }

    const moduleObj = module as Record<string, unknown>;

    // Check default export
    if (moduleObj.default && this.isWorkflowScript(moduleObj.default)) {
      scripts.push(moduleObj.default);
    }

    // Check named exports
    for (const [key, value] of Object.entries(moduleObj)) {
      if (key !== "default" && this.isWorkflowScript(value)) {
        scripts.push(value);
      }
    }

    return scripts;
  }

  /**
   * Checks if a value is a WorkflowScript instance or class.
   *
   * @param value - Value to check.
   * @returns True if the value is a WorkflowScript.
   */
  private isWorkflowScript(value: unknown): value is WorkflowScript {
    if (!value || typeof value !== "object") {
      return false;
    }

    // Check if it's a class constructor
    if (typeof value === "function") {
      try {
        const instance = new (value as new () => unknown)();
        return this.isWorkflowScriptInstance(instance);
      } catch {
        return false;
      }
    }

    // Check if it's already an instance
    return this.isWorkflowScriptInstance(value);
  }

  /**
   * Checks if a value implements the WorkflowScript interface.
   *
   * @param value - Value to check.
   * @returns True if the value implements WorkflowScript interface.
   */
  private isWorkflowScriptInstance(value: unknown): value is WorkflowScript {
    if (!value || typeof value !== "object") {
      return false;
    }

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.getName === "function" &&
      typeof obj.supports === "function" &&
      typeof obj.build === "function"
    );
  }
}
