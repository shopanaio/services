import type {
  WorkflowScript,
  ScriptContext,
} from "@shopana/woodpecker-ci-config-service";
import { chunkArray, findSpecFiles } from "../utils/utils";

/**
 * Playwright tests pipeline script.
 */
export default class PlaywrightWorkflow implements WorkflowScript {
  getName(): string {
    return "playwright";
  }

  supports(_context: ScriptContext): boolean {
    return false;
  }

  async build(_context: ScriptContext) {
    const tmpRepoDir = "";
    const testFiles: string[] = await findSpecFiles(tmpRepoDir || "");
    const [first, ...rest] = testFiles;
    if (!first) {
      throw new Error("No test files found");
    }

    const toStep = (file: string, dependsOn: string[]) => ({
      name: file,
      image: "mcr.microsoft.com/playwright:v1.51.1-jammy",
      failure: "ignore",
      environment: {
        CI: true as const,
        BASE_URL: String(process.env.BASE_URL || ""),
        GRAPHQL_URL: String(process.env.GRAPHQL_URL || ""),
      },
      depends_on: dependsOn,
      commands: [
        "yarn install --frozen-lockfile",
        `npx playwright test ${file}`,
      ],
    });

    const maxParallel = Number(process.env.MAX_PARALLEL_STEPS || 4);
    const chunks = chunkArray(rest, maxParallel);
    const parallelSteps = chunks.flatMap((files, chunkIndex) =>
      files.map((file) => {
        const depends =
          chunkIndex === 0 ? [first] : [...chunks[chunkIndex - 1]];
        return toStep(file, depends);
      })
    );

    return [
      {
        name: ".woodpecker/playwright.yml",
        workflow: {
          steps: [
            toStep(first, []),
            ...parallelSteps,
            {
              name: "discord",
              image: "appleboy/drone-discord",
              depends_on: chunks.length > 0 ? chunks[chunks.length - 1] : [],
              settings: {
                webhook_id: { from_secret: "DISCORD_WEBHOOK_ID" },
                webhook_token: { from_secret: "DISCORD_WEBHOOK_TOKEN" },
                avatar_url:
                  "https://avatars.githubusercontent.com/u/2181346?v=4",
                username: "Drone CI",
                message:
                  "{{#success build.status}}✅{{else}}❌{{/success}} **Playwright [#{{build.number}}]({{build.link}})**\\n- Status `{{uppercase build.status}}`\\n- Branch `{{commit.branch}}`\\n- Author `{{commit.email}}`\\n",
              },
            },
          ],
        },
      },
    ];
  }
}
