import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function shellQuote(value: string) {
  return /^[a-zA-Z0-9_./:=+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

const TestToolSchema = z.object({
  testPath: z
    .string()
    .optional()
    .describe('Specific test file or directory to run (e.g., "tests/users-api" or "tests/users-api/sign-in.spec.ts")'),
  grep: z
    .string()
    .optional()
    .describe('Only run tests matching this regular expression'),
  project: z
    .string()
    .optional()
    .describe('Run tests in specific project (default: chromium)'),
  headed: z
    .boolean()
    .optional()
    .describe('Run tests in headed mode (show browser window)'),
  debug: z
    .boolean()
    .optional()
    .describe('Run tests in debug mode with Playwright Inspector'),
  workers: z
    .number()
    .optional()
    .describe('Number of parallel workers (default: 5)'),
  retries: z
    .number()
    .optional()
    .describe('Number of retries for failed tests'),
  reporter: z
    .enum(['list', 'dot', 'line', 'html', 'json'])
    .optional()
    .describe('Test reporter to use'),
  updateSnapshots: z
    .boolean()
    .optional()
    .describe('Update snapshots with actual results'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class TestTool extends MCPTool<typeof TestToolSchema> {
  name = 'shopana_test';
  description = `Run Playwright end-to-end tests through the Shopana CLI.

This tool runs: yarn shopana e2e test

The CLI executes Playwright from the e2e/ directory where playwright.config.ts is located.

Project rule:
  Run one spec file at a time. Do not run the entire suite or a whole directory.

Examples:
- Run specific test file: { "testPath": "tests/users-api/sign-in.spec.ts" }
- Run tests matching pattern: { "grep": "sign-in" }
- Run in headed mode: { "headed": true }
- Run in debug mode: { "debug": true }
- Run with specific workers: { "workers": 1 }

Test directories (inside e2e/tests/):
- users-api: User authentication tests (sign-in, sign-up)
- project-api: Project management tests
- roles-api: Role-based access control tests

Environment variables (already configured in e2e/.env):
- BASE_URL: Base URL for the API
- CI: Set to 'true' for CI mode (enables retries)
- WORKERS: Number of parallel workers`;

  schema = TestToolSchema;

  async execute(input: z.infer<typeof TestToolSchema>) {
    const { testPath, grep, project, headed, debug, workers, retries, reporter, updateSnapshots, workingDir } = input;

    const args = ['shopana', 'e2e', 'test'];

    if (testPath) {
      args.push(testPath);
    }

    if (grep) {
      args.push('--grep', grep);
    }

    if (project) {
      args.push('--project', project);
    }

    if (headed) {
      args.push('--headed');
    }

    if (debug) {
      args.push('--debug');
    }

    if (workers !== undefined) {
      args.push('--workers', workers.toString());
    }

    if (retries !== undefined) {
      args.push('--retries', retries.toString());
    }

    if (reporter) {
      args.push('--reporter', reporter);
    }

    if (updateSnapshots) {
      args.push('--update-snapshots');
    }

    const command = `yarn ${args.map(shellQuote).join(' ')}`;

    try {
      const { stdout, stderr } = await execFileAsync('yarn', args, {
        cwd: workingDir || process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        maxBuffer: 20 * 1024 * 1024
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              command,
              output: stdout,
              warnings: stderr || undefined
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              command,
              error: error.message,
              stdout: error.stdout,
              stderr: error.stderr
            }, null, 2)
          }
        ]
      };
    }
  }
}

export default TestTool;
