import type {
  Hook,
  HookContext,
  HookStage,
} from "@shopana/woodpecker-ci-config-service";

/**
 * AfterEach hook that runs after each workflow script.
 * Use this hook to modify generated workflows, add common steps, or validate workflow output.
 */
export default class AfterEachHook implements Hook {
  getName(): string {
    return "after-each-workflow";
  }

  getStage(): HookStage {
    return "after-each" as HookStage;
  }

  supports(_context: HookContext): boolean {
    return true;
  }

  async execute(context: HookContext): Promise<void> {
    const workflowName = context.metadata.currentWorkflow as string;
    const { generatedConfigs } = context;

    // Modify generated configs for this workflow
    if (generatedConfigs && generatedConfigs.length > 0) {
      for (const config of generatedConfigs) {
        // Add common variables to workflow
        if (!config.workflow.variables) {
          config.workflow.variables = {};
        }

        // Add metadata from global hooks
        config.workflow.variables.GENERATED_AT = new Date().toISOString();
        if (context.metadata.buildTimestamp) {
          config.workflow.variables.BUILD_TIMESTAMP = String(
            context.metadata.buildTimestamp
          );
        }
        if (context.metadata.isMainBranch !== undefined) {
          config.workflow.variables.IS_MAIN_BRANCH = String(
            context.metadata.isMainBranch
          );
        }

        // Add environment variables from BeforeAll hook
        Object.entries(context.env).forEach(([key, value]) => {
          if (config.workflow.variables) {
            config.workflow.variables[key] = value;
          }
        });
      }
    }

    // Calculate workflow generation time
    const startTime = context.metadata.workflowStartTime as number;
    const duration = Date.now() - startTime;

    console.log(
      `[AfterEach] Completed workflow: ${workflowName} (${generatedConfigs?.length || 0} configs, ${duration}ms)`
    );
  }
}
