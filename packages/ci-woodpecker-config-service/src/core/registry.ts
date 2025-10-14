import {
  PipelineScript,
  ScriptContext,
  GeneratedConfig,
} from "../framework/scripts";

export class ScriptRegistry {
  private readonly scripts: PipelineScript[] = [];

  register(script: PipelineScript): void {
    this.scripts.push(script);
  }

  async buildPipelines(context: ScriptContext): Promise<GeneratedConfig[]> {
    const results: GeneratedConfig[] = [];
    for (const script of this.scripts) {
      if (!(await script.supports(context))) {
        continue;
      }

      const configs = await script.build(context);
      if (!configs) {
        continue;
      }

      results.push(...configs);
    }
    return results;
  }
}
