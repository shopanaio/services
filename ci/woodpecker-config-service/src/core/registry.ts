import { PipelineScript, ScriptContext, GeneratedConfig } from '../framework/scripts';

/**
 * Registry for pipeline scripts. Allows registering multiple scripts and
 * building their pipelines for a given execution context.
 */
export class ScriptRegistry {
  private readonly scripts: PipelineScript[] = [];

  register(script: PipelineScript): void {
    this.scripts.push(script);
  }

  async buildPipelines(context: ScriptContext): Promise<GeneratedConfig[]> {
    const results: GeneratedConfig[] = [];
    for (const script of this.scripts) {
      const isSupported = await script.supports(context);
      if (!isSupported) continue;
      const configs = await script.build(context);
      if (!configs) continue;
      results.push(...configs);
    }
    return results;
  }
}
