import { Request } from "express";
import { Netrc, Pipeline, Repo } from "src/woodpecker/payload";
import { WorkflowYaml } from "src/woodpecker/yaml";

/**
 * Base workflow context that contains all information available during workflow generation.
 * This is the unified context used by both hooks and workflow scripts.
 */
export interface WorkflowContext {
  /** Original Woodpecker request data */
  readonly repo: Repo;
  readonly pipeline: Pipeline;
  readonly netrc: Netrc;
  /** Environment variables set by hooks */
  env: Record<string, string>;
  /** Metadata that can be shared between hooks and scripts */
  metadata: Record<string, unknown>;
  /** Errors accumulated during execution */
  errors: Array<{ stage: HookStage; hookName: string; error: Error }>;
  /** Generated configs (populated after each workflow build) */
  generatedConfigs?: GeneratedConfig[];
}

/**
 * Context for workflow scripts - semantically named alias of WorkflowContext.
 * Scripts receive the same context as hooks, allowing them to read env variables
 * and metadata set by hooks.
 */
export type ScriptContext = WorkflowContext;

/**
 * Context for hooks - semantically named alias of WorkflowContext.
 * Hooks can modify env, metadata, and generatedConfigs which will be
 * available to subsequent hooks and workflow scripts.
 */
export type HookContext = WorkflowContext;

export interface WorkflowScript {
  getName(): string;
  supports(context: ScriptContext): Promise<boolean> | boolean;
  build(context: ScriptContext): Promise<GeneratedConfig[] | null>;
}

export interface ScriptDefinition {
  name: string;
  supports?: (ctx: ScriptContext) => boolean | Promise<boolean>;
  build: (
    ctx: ScriptContext
  ) => GeneratedConfig[] | null | Promise<GeneratedConfig[] | null>;
}

export interface WorkflowLoader {
  load(): Promise<WorkflowScript[]>;
}

export interface SignatureVerifier {
  /**
   * Verifies request signature
   * @param req - Express request object
   * @returns Promise resolving to true if signature is valid, false otherwise
   */
  verify(req: Request): Promise<boolean>;
}

export interface GeneratedConfig {
  name: string;
  workflow: WorkflowYaml;
}

/**
 * Hook lifecycle stages - similar to test framework hooks (beforeAll/afterAll pattern)
 */
export enum HookStage {
  /** Executed once before any workflow generation starts */
  BeforeAll = "before-all",
  /** Executed before each workflow script */
  BeforeEach = "before-each",
  /** Executed after each workflow script */
  AfterEach = "after-each",
  /** Executed once after all workflows generated, always runs even on errors */
  AfterAll = "after-all",
}


/**
 * Hook interface - similar to Buildkite CI hooks
 */
export interface Hook {
  /**
   * Returns the name of the hook
   */
  getName(): string;

  /**
   * Returns the stage when this hook should be executed
   */
  getStage(): HookStage;

  /**
   * Determines if this hook should run for the given context
   * @param context - Hook context
   * @returns Promise or boolean indicating if hook should execute
   */
  supports(context: HookContext): Promise<boolean> | boolean;

  /**
   * Executes the hook and can modify the context
   * @param context - Hook context that can be modified
   * @returns Promise that resolves when hook execution is complete
   */
  execute(context: HookContext): Promise<void>;
}

/**
 * Loader interface for hooks
 */
export interface HookLoader {
  /**
   * Loads all hooks from the configured source
   * @returns Promise that resolves to array of Hook instances
   */
  load(): Promise<Hook[]>;
}
