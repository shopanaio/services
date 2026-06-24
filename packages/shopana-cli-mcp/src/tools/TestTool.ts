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
    .describe('Specific e2e spec file path for the generated command (e.g., "tests/users-api/sign-in.spec.ts")')
});

class TestTool extends MCPTool<typeof TestToolSchema> {
  name = 'shopana_get_e2e_test_command';
  description = `Return the correct Playwright end-to-end test command and manual run instructions.

This tool does not execute tests. It returns the command to run one specific spec file manually from the e2e/ package.

The tool resolves the repository root from the current process directory, then builds the Playwright command for e2e/ where playwright.config.ts is located.

Project rule:
  Run one spec file at a time. Do not run the entire suite or a whole directory.
  Admin UI tests must be run with --headed.

Examples:
- Get command for a specific test file: { "testPath": "tests/users-api/sign-in.spec.ts" }

Test directories (inside e2e/tests/):
- users-api: User authentication tests (sign-in, sign-up)
- project-api: Project management tests
- roles-api: Role-based access control tests

Environment variables (already configured in e2e/.env):
- BASE_URL: Base URL for the API
- NODE_OPTIONS: Include --experimental-transform-types when running the command manually`;

  schema = TestToolSchema;

  async execute(input: z.infer<typeof TestToolSchema>) {
    const { testPath } = input;

    let e2eDir: string;

    try {
      e2eDir = resolve(resolveE2eDir());
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

    const command = `yarn test ${shellQuote(testPath)}`;
    const headedCommand = `${command} --headed`;
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
            instructions: [
              'Do not start, stop, or restart services. The development server is managed separately.',
              'Run the command from the cwd shown above.',
              'Run one .spec.ts file at a time. Do not run the full suite or a whole directory.',
              'If the spec is an admin UI test, run the headedCommand value instead of command.',
              'If running from a shell that does not already include the NODE_OPTIONS value, prefix the command with the NODE_OPTIONS value shown above.'
            ],
            headedCommand,
            shellCommand: `cd ${shellQuote(e2eDir)} && NODE_OPTIONS=${shellQuote(nodeOptions)} ${command}`,
            headedShellCommand: `cd ${shellQuote(e2eDir)} && NODE_OPTIONS=${shellQuote(nodeOptions)} ${headedCommand}`
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
