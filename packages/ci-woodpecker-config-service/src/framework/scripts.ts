import type { Repo, Pipeline, Netrc } from "../woodpecker/payload";
import type { Logger } from "pino";
import type { WorkflowYaml } from "../woodpecker/yaml";

export interface ScriptContext {
  repo: Repo;
  pipeline: Pipeline;
  netrc: Netrc;
  tmpRepoDir?: string;
  env: Record<string, string | number | boolean>;
  clone(): Promise<string>;
  log: Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>;
}

export interface PipelineScript {
  getName(): string;
  supports(context: ScriptContext): Promise<boolean> | boolean;
  build(context: ScriptContext): Promise<GeneratedConfig[] | null>;
}

export interface ScriptDefinition {
  name: string;
  supports?: (ctx: ScriptContext) => boolean | Promise<boolean>;
  build: (ctx: ScriptContext) =>
    | GeneratedConfig[]
    | null
    | Promise<GeneratedConfig[] | null>;
}

export function defineScript(def: ScriptDefinition): PipelineScript {
  return {
    getName(): string {
      return def.name;
    },
    supports(ctx: ScriptContext): boolean | Promise<boolean> {
      return def.supports ? def.supports(ctx) : true;
    },
    async build(ctx: ScriptContext) {
      const result = await def.build(ctx);
      return result;
    },
  };
}

export interface GeneratedConfig {
  name: string;
  workflow: WorkflowYaml;
}
