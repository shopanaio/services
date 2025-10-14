import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { WorkflowLoader, WorkflowScript } from "src/service/interface";

/**
 * Loads workflow scripts from a directory.
 * Recursively searches for files matching *.workflow.ts (dev mode) or *.workflow.js (production) patterns.
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
   * Recursively finds all files matching the strict pattern: *.workflow.ts or *.workflow.js
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
          entry.name.endsWith(".workflow.js") ||
          // Enabled .ts for dev mode
          entry.name.endsWith(".workflow.ts")
        ) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }

  /**
   * Extracts WorkflowScript instances from a module using a strict contract:
   * - default export MUST be a class (constructor) with zero-arg constructor
   * - the loader will instantiate it and validate the instance shape
   * Named exports and pre-built instances are ignored.
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
    console.log(moduleObj, "moduleObj --->");

    const maybeCtor = moduleObj.default as unknown;
    if (typeof maybeCtor === "function") {
      try {
        const instance = new (maybeCtor as new () => unknown)();
        console.log(instance, "instance --->");
        if (this.isWorkflowScriptInstance(instance)) {
          scripts.push(instance as WorkflowScript);
        }
      } catch (error) {
        console.error("Failed to instantiate default workflow export:", error);
      }
    }

    return scripts;
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
