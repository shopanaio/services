/**
 * Drone/Woodpecker step definition used by our generator.
 */
export interface DroneStep {
  name: string;
  image: string;
  failure?: 'ignore' | 'cancel' | 'fail';
  environment?: Record<string, unknown>;
  depends_on?: string[];
  commands?: string[];
  settings?: Record<string, unknown>;
}

/**
 * Drone/Woodpecker pipeline definition used by our generator.
 */
export interface DronePipeline {
  kind: 'pipeline';
  type: 'docker';
  name: string;
  steps: DroneStep[];
  trigger?: Record<string, unknown>;
  clone?: { disable?: boolean };
}

/**
 * Execution context passed to all scripts.
 */
export interface ScriptContext {
  repoSlug: string;
  commitSha: string;
  sourceBranch: string;
  defaultBranch: string;
  tmpRepoDir: string;
  env: {
    MAX_PARALLEL_STEPS: number;
    BASE_URL: string;
    GRAPHQL_URL: string;
    BITBUCKET_TOKEN: string;
  };
}

/**
 * Interface for dynamic pipeline scripts.
 */
export interface PipelineScript {
  /** Unique script name */
  getName(): string;
  /** Whether this script should run for the given context */
  supports(context: ScriptContext): Promise<boolean> | boolean;
  /** Build pipelines for the given context */
  build(context: ScriptContext): Promise<DronePipeline[] | DronePipeline | null>;
}
