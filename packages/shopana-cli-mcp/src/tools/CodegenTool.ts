import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CodegenToolSchema = z.object({
  service: z
    .string()
    .optional()
    .describe('Generate types for specific service only. Available: apps, bootstrap, checkout, delivery, iam, inventory, listing, media, orders, payments, pricing, project, reviews, search'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class CodegenTool extends MCPTool<typeof CodegenToolSchema> {
  name = 'shopana_codegen';
  description = `Generate TypeScript types from GraphQL schemas using GraphQL Code Generator.

This tool runs codegen to generate TypeScript types for GraphQL operations and schemas.

Examples:
- Generate for all services: {}
- Generate for specific service: { "service": "checkout" }

Available services: apps, bootstrap, checkout, delivery, iam, inventory, listing, media, orders, payments, pricing, project, reviews, search`;

  schema = CodegenToolSchema;

  async execute(input: z.infer<typeof CodegenToolSchema>) {
    const { service, workingDir } = input;

    let command = 'yarn shopana codegen';

    if (service) {
      command += ` -s ${service}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir || process.cwd(),
        timeout: 120000, // 2 minutes timeout
        maxBuffer: 10 * 1024 * 1024
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

export default CodegenTool;
