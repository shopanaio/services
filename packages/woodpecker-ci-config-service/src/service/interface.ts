import { Request } from "express";
import { Netrc, Pipeline, Repo } from "src/woodpecker/payload";
import { WorkflowYaml } from "src/woodpecker/yaml";

export interface ScriptContext {
  repo: Repo;
  pipeline: Pipeline;
  netrc: Netrc;
}

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
