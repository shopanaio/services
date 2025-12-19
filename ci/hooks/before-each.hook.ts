import type {
  Hook,
  HookContext,
  HookStage,
} from "@shopana/woodpecker-ci-config-service";

/**
 * BeforeEach hook that runs before each workflow script.
 * Use this hook to prepare context for specific workflow, validate prerequisites, or setup workflow-specific data.
 */
export default class BeforeEachHook implements Hook {
  getName(): string {
    return "before-each-workflow";
  }

  getStage(): HookStage {
    return "before-each" as HookStage;
  }

  supports(_context: HookContext): boolean {
    return true;
  }

  async execute(context: HookContext): Promise<void> {
    const workflowName = context.metadata.currentWorkflow as string;

    // Track workflow start time
    context.metadata.workflowStartTime = Date.now();

    // Increment workflow counter
    const count = (context.metadata.workflowCount as number) || 0;
    context.metadata.workflowCount = count + 1;

    console.log(
      `[BeforeEach] Generating workflow: ${workflowName} (${context.metadata.workflowCount})`
    );

    // Can prepare workflow-specific context here
    // For example, determine which tests to run based on changed files
  }
}
