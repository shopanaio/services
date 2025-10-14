import type {
  PipelineScript,
  ScriptContext,
  GeneratedConfig,
  WorkflowYaml,
} from "@shopana/ci-woodpecker-config-service";

/**
 * Lint and type-check pipeline script.
 */
export class LintWorkflow implements PipelineScript {
  getName(): string {
    return "lint";
  }

  supports(_context: ScriptContext): boolean {
    return true;
  }

  async build(_ctx: ScriptContext): Promise<GeneratedConfig[]> {
    const workflow: WorkflowYaml = {
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
        {
          name: "discord",
          image: "appleboy/drone-discord",
          settings: {
            webhook_id: { from_secret: "DISCORD_WEBHOOK_ID" },
            webhook_token: { from_secret: "DISCORD_WEBHOOK_TOKEN" },
            avatar_url: "https://avatars.githubusercontent.com/u/2181346?v=4",
            username: "Drone CI",
            message:
              "**Lint & Type Check [#{{build.number}}]({{build.link}})**\\n- Branch `{{commit.branch}}`\\n- Author `{{commit.email}}`",
          },
        },
      ],
    };
    return [{ name: ".woodpecker/lint.yml", workflow }];
  }
}
