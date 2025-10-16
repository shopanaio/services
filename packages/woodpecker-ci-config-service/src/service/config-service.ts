import yaml from "js-yaml";
import type { ConfigExtensionRequest, ConfigFile } from "../woodpecker/payload";
import { WorkflowRegistry } from "./workflow-registry";
import { HookRegistry } from "./hook-registry";
import type {
  WorkflowContext,
  WorkflowLoader,
  HookLoader,
  GeneratedConfig,
} from "./interface";
import { HookStage } from "./interface";
import { WorkflowScriptLoader } from "./workflow-loader";
import { HookScriptLoader } from "./hook-loader";

/**
 * Configuration service that manages workflows and hooks lifecycle.
 * Hooks are executed in the following order:
 * 1. BeforeAll - once before any workflow generation
 * 2. For each workflow:
 *    - BeforeEach - before workflow script
 *    - [workflow is built]
 *    - AfterEach - after workflow script
 * 3. AfterAll - once after all workflows (always runs, even on errors)
 */
export class ConfigService {
  private readonly workflowLoader!: WorkflowLoader;
  private readonly hookLoader!: HookLoader;

  constructor(params?: { loader?: WorkflowLoader; hookLoader?: HookLoader }) {
    this.workflowLoader = params?.loader || new WorkflowScriptLoader();
    this.hookLoader = params?.hookLoader || new HookScriptLoader();
  }

  async generate(body: ConfigExtensionRequest): Promise<ConfigFile[]> {
    const { repo, pipeline, netrc } = body;

    // Initialize unified context for both hooks and scripts
    const context: WorkflowContext = {
      repo,
      pipeline,
      netrc,
      env: {},
      metadata: {},
      errors: [],
    };

    // Load and register hooks
    const hooks = await this.hookLoader.load();
    const hookRegistry = new HookRegistry();
    for (const hook of hooks) {
      hookRegistry.register(hook);
    }

    try {
      // Execute BeforeAll hooks
      await hookRegistry.executeStage(HookStage.BeforeAll, context);

      // Load workflow scripts
      const scripts = await this.workflowLoader.load();

      // Build workflows with BeforeEach/AfterEach hooks
      const allGeneratedConfigs: GeneratedConfig[] = [];

      for (const script of scripts) {
        if (await script.supports(context)) {
          // Store current workflow name in metadata
          context.metadata.currentWorkflow = script.getName();

          // Execute BeforeEach for this workflow
          await hookRegistry.executeStage(HookStage.BeforeEach, context);

          // Build workflow - script receives same context as hooks
          const configs = await script.build(context);
          if (configs && configs.length > 0) {
            allGeneratedConfigs.push(...configs);
            // Store current workflow's generated configs
            context.generatedConfigs = configs;
          }

          // Execute AfterEach for this workflow
          await hookRegistry.executeStage(HookStage.AfterEach, context);
        }
      }

      if (allGeneratedConfigs.length === 0) {
        throw new Error("No workflows produced by scripts");
      }

      // Store all generated configs in context
      context.generatedConfigs = allGeneratedConfigs;

      return allGeneratedConfigs.map((g) => ({
        name: g.name,
        data: yaml.dump(g.workflow),
      }));
    } finally {
      // Always execute AfterAll hooks
      await hookRegistry.executeStage(HookStage.AfterAll, context);
    }
  }
}
