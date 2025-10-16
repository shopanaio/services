import type {
  Hook,
  HookContext,
  HookStage,
} from "@shopana/woodpecker-ci-config-service";

/**
 * BeforeAll hook that runs once before any workflow generation starts.
 * Use this hook to setup global context, load configurations, or initialize resources.
 */
export default class BeforeAllHook implements Hook {
  getName(): string {
    return "before-all-setup";
  }

  getStage(): HookStage {
    return "before-all" as HookStage;
  }

  supports(_context: HookContext): boolean {
    // Always run this hook
    return true;
  }

  async execute(context: HookContext): Promise<void> {
    const { repo, pipeline } = context;

    // Setup global environment variables
    context.env.REPO_NAME = repo.name;
    context.env.REPO_OWNER = repo.owner;
    context.env.REPO_FULL_NAME = repo.full_name;
    context.env.PIPELINE_EVENT = pipeline.event;
    context.env.COMMIT_SHA = pipeline.commit.sha;
    context.env.COMMIT_BRANCH = pipeline.commit.branch;

    // Setup global metadata
    context.metadata.startTime = Date.now();
    context.metadata.workflowCount = 0;
    context.metadata.isMainBranch = pipeline.commit.branch === "main";

    console.log(
      `[BeforeAll] Starting workflow generation for ${repo.full_name} @ ${pipeline.commit.sha.substring(0, 7)}`
    );
    console.log(`[BeforeAll] Event: ${pipeline.event}, Branch: ${pipeline.commit.branch}`);
  }
}
