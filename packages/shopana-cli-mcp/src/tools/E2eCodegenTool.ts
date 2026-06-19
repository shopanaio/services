import { execFile } from 'child_process';
import { MCPTool } from 'mcp-framework';
import { promisify } from 'util';
import { z } from 'zod';

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

This tool runs: yarn shopana e2e codegen`;

  schema = E2eCodegenToolSchema;

  async execute(input: z.infer<typeof E2eCodegenToolSchema>) {
    const command = 'yarn shopana e2e codegen';

    try {
      const { stdout, stderr } = await execFileAsync('yarn', ['shopana', 'e2e', 'codegen'], {
        cwd: input.workingDir || process.cwd(),
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

export default E2eCodegenTool;
