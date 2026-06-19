import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { resolve } from 'path';
import { resolveE2eDir } from '../utils/paths.js';

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
  description = `Print the Playwright end-to-end test command and run instructions.

This tool does not execute tests. It prints the command to run manually from the e2e/ package.

The tool resolves the repository root from workingDir, then builds the Playwright command for e2e/ where playwright.config.ts is located. Both the repository root and the e2e/ directory are accepted as workingDir.

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
- WORKERS: Number of parallel workers
- NODE_OPTIONS: Include --experimental-transform-types when running the command manually`;

  schema = TestToolSchema;

  async execute(input: z.infer<typeof TestToolSchema>) {
    const { testPath, grep, project, headed, debug, workers, retries, reporter, updateSnapshots, workingDir } = input;

    let e2eDir: string;

    try {
      e2eDir = resolve(resolveE2eDir(workingDir));
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }
        ]
      };
    }

    const args = ['test'];

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
    const nodeOptions = withTransformTypesNodeOption();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            executed: false,
            command,
            cwd: e2eDir,
            env: {
              NODE_OPTIONS: nodeOptions
            },
            warning: 'If this is an admin UI test, --headed is required.',
            instructions: [
              'Do not start, stop, or restart services. The development server is managed separately.',
              'Run the command from the cwd shown above.',
              'Run one .spec.ts file at a time. Do not run the full suite or a whole directory.',
              'If running from a shell that does not already include the NODE_OPTIONS value, prefix the command with the NODE_OPTIONS value shown above.'
            ],
            shellCommand: `cd ${shellQuote(e2eDir)} && NODE_OPTIONS=${shellQuote(nodeOptions)} ${command}`
          }, null, 2)
        }
      ]
    };
  }
}

function withTransformTypesNodeOption() {
  const current = process.env.NODE_OPTIONS ?? '';

  if (current.split(/\s+/).includes('--experimental-transform-types')) {
    return current;
  }

  return [current, '--experimental-transform-types'].filter(Boolean).join(' ');
}

export default TestTool;
