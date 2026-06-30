import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BuildToolSchema = z.object({
  services: z
    .array(z.string())
    .optional()
    .describe('Specific service(s) to build. Available: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search'),
  packagesOnly: z
    .boolean()
    .optional()
    .describe('Build only packages (shared libraries)'),
  parallel: z
    .boolean()
    .optional()
    .describe('Build services in parallel for faster builds'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class BuildTool extends MCPTool<typeof BuildToolSchema> {
  name = 'shopana_build';
  description = `Build Shopana packages and services for production.

TypeScript type checking is enabled by default and will fail the build if there are type errors.

Examples:
- Build everything: {}
- Build packages only: { "packagesOnly": true }
- Build specific services: { "services": ["checkout", "orders"] }
- Build in parallel: { "parallel": true }

Available services: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search`;

  schema = BuildToolSchema;

  async execute(input: z.infer<typeof BuildToolSchema>) {
    const { services, packagesOnly, parallel, workingDir } = input;

    let command = 'yarn shopana build';

    if (packagesOnly) {
      command += ' --packages';
    } else if (services && services.length > 0) {
      command += ` -s ${services.join(' ')}`;
    }

    if (parallel) {
      command += ' --parallel';
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir || process.cwd(),
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
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

export default BuildTool;
