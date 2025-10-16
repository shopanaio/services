import type {
  WorkflowScript,
  ScriptContext,
  GeneratedConfig,
  WorkflowYaml,
} from "@shopana/woodpecker-ci-config-service";

/**
 * Lint and type-check pipeline script.
 */
export default class LintWorkflow implements WorkflowScript {
  getName(): string {
    return "lint";
  }

  supports(_ctx: ScriptContext): boolean {
    return true;
  }

  async build(ctx: ScriptContext): Promise<GeneratedConfig[]> {
    // Scripts can now access env and metadata set by hooks!
    const isMainBranch = ctx.metadata.isMainBranch as boolean;

    const workflow: WorkflowYaml = {
      // Can use env variables from hooks
      variables: {
        REPO_NAME: ctx.env.REPO_NAME || ctx.repo.name,
        IS_MAIN: String(isMainBranch),
      },
      steps: [
        {
          name: "lint-and-type-check",
          image: "node:22-alpine",
          commands: [
            "yarn install --frozen-lockfile",
            "yarn lint",
            "yarn type-check",
          ],
        },
      ],
    };

    return [
      {
        name: ".woodpecker/lint.yml",
        workflow,
      },
    ];
  }
}
