import chalk from "chalk";
import { runE2eCodegen, runE2eTests } from "../scripts/e2e.js";

interface E2eTestOptions {
  grep?: string;
  project?: string;
  headed?: boolean;
  debug?: boolean;
  workers?: number;
  retries?: number;
  reporter?: string;
  updateSnapshots?: boolean;
}

export async function e2eTestCommand(testPath: string | undefined, options: E2eTestOptions) {
  console.log(chalk.cyan("\n🎭 E2E Playwright Tests\n"));
  await runE2eTests({ testPath, ...options });
}

export async function e2eCodegenCommand() {
  console.log(chalk.cyan("\n🔧 E2E GraphQL Codegen\n"));
  await runE2eCodegen();
}
