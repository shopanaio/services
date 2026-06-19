import { execFile } from 'child_process';
import { MCPTool } from 'mcp-framework';
import { promisify } from 'util';
import { z } from 'zod';
import { resolveE2eDir } from '../utils/paths.js';

const execFileAsync = promisify(execFile);

const E2eCodegenToolSchema = z.object({
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class E2eCodegenTool extends MCPTool<typeof E2eCodegenToolSchema> {
  name = 'shopana_e2e_codegen';
  description = `Generate E2E GraphQL TypeScript types through the Shopana CLI.

This tool runs: yarn codegen in the e2e/ package.

The tool resolves the repository root from workingDir, then executes codegen from e2e/. Both the repository root and the e2e/ directory are accepted as workingDir.`;

  schema = E2eCodegenToolSchema;

  async execute(input: z.infer<typeof E2eCodegenToolSchema>) {
    let e2eDir: string;

    try {
      e2eDir = resolveE2eDir(input.workingDir);
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

    const command = 'yarn codegen';

    try {
      const { stdout, stderr } = await execFileAsync('yarn', ['codegen'], {
        cwd: e2eDir,
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 20 * 1024 * 1024
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              command,
              cwd: e2eDir,
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
              cwd: e2eDir,
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

export default E2eCodegenTool;
