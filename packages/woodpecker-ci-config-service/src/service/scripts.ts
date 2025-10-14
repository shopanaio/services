import {
  ScriptDefinition,
  WorkflowScript,
  ScriptContext,
} from "src/service/interface";

export function defineScript(def: ScriptDefinition): WorkflowScript {
  return {
    getName(): string {
      return def.name;
    },
    supports(ctx: ScriptContext): boolean | Promise<boolean> {
      return typeof def.supports === "function" ? def.supports(ctx) : true;
    },
    async build(ctx: ScriptContext) {
      return typeof def.build === "function" ? def.build(ctx) : null;
    },
  };
}
