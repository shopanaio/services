import { DronePipeline, PipelineScript, ScriptContext } from './types';

/**
 * Registry for pipeline scripts. Allows registering multiple scripts and
 * building their pipelines for a given execution context.
 */
export class ScriptRegistry {
  private readonly scripts: PipelineScript[] = [];

  register(script: PipelineScript): void {
    this.scripts.push(script);
  }

  async buildPipelines(context: ScriptContext): Promise<DronePipeline[]> {
    const results: DronePipeline[] = [];
    for (const script of this.scripts) {
      const isSupported = await script.supports(context);
      if (!isSupported) continue;
      const pipelines = await script.build(context);
      if (!pipelines) continue;
      results.push(...(Array.isArray(pipelines) ? pipelines : [pipelines]));
    }
    return results;
  }
}
