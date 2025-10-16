import type {
  WorkflowScript,
  ScriptContext,
} from "@shopana/woodpecker-ci-config-service";

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

import fs from "fs/promises";
import path from "path";

/**
 * Split an array into chunks of a given size.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  return items.reduce<T[][]>((acc, item, index) => {
    if (index % chunkSize === 0) {
      acc.push([item]);
    } else {
      acc[acc.length - 1].push(item);
    }
    return acc;
  }, []);
}

/**
 * Recursively find all test spec files under tests/ and return paths relative to tests/.
 */
export async function findSpecFiles(tempRepoDir: string): Promise<string[]> {
  const testsRoot = path.join(tempRepoDir, "tests");
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".spec.ts")) {
        const relativeFromTests = path.relative(testsRoot, fullPath);
        result.push(relativeFromTests);
      }
    }
  }

  try {
    await walk(testsRoot);
  } catch {
    // tests directory may not exist
  }

  return result.sort();
}
