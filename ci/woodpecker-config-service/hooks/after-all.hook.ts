import type {
  Hook,
  HookContext,
  HookStage,
} from "@shopana/woodpecker-ci-config-service";

/**
 * AfterAll hook that always runs once after all workflows are generated.
 * Use this hook for cleanup, logging, sending metrics, or notifications.
 * This hook runs even if errors occurred during generation.
 */
export default class AfterAllHook implements Hook {
  getName(): string {
    return "after-all-cleanup";
  }

  getStage(): HookStage {
    return "after-all" as HookStage;
  }

  supports(_context: HookContext): boolean {
    // Always run this hook
    return true;
  }

  async execute(context: HookContext): Promise<void> {
    const { repo, pipeline, errors, generatedConfigs, metadata } = context;

    const startTime = metadata.startTime as number;
    const duration = Date.now() - startTime;
    const hasErrors = errors.length > 0;

    console.log(`\n[AfterAll] Workflow generation completed:`);
    console.log(`  - Repository: ${repo.full_name}`);
    console.log(`  - Event: ${pipeline.event}`);
    console.log(`  - Branch: ${pipeline.commit.branch}`);
    console.log(`  - Commit: ${pipeline.commit.sha.substring(0, 7)}`);
    console.log(`  - Workflows processed: ${metadata.workflowCount || 0}`);
    console.log(`  - Generated configs: ${generatedConfigs?.length || 0}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Status: ${hasErrors ? "❌ WITH ERRORS" : "✅ SUCCESS"}`);

    if (hasErrors) {
      console.error(`\n[AfterAll] Errors encountered during generation:`);
      for (const error of errors) {
        console.error(
          `  - Stage: ${error.stage}, Hook: ${error.hookName}`
        );
        console.error(`    Error: ${error.error.message}`);
      }
    }

    // Could send metrics, notifications, or cleanup resources here
    // For example:
    // - Send metrics to monitoring system
    // - Send notification to Slack/Discord
    // - Close database connections
    // - Clean up temporary files
  }
}
