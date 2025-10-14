import { WorkflowScript, ScriptContext, GeneratedConfig } from "./interface";

export class WorkflowRegistry {
  private readonly scripts: WorkflowScript[] = [];

  register(script: WorkflowScript): void {
    this.scripts.push(script);
  }

  async buildWorkflows(context: ScriptContext): Promise<GeneratedConfig[]> {
    const results = await Promise.all(
      this.scripts.map(async (script) => {
        if (await script.supports(context)) {
          return (await script.build(context)) || [];
        }
        return [];
      })
    );

    return results.flat();
  }
}
