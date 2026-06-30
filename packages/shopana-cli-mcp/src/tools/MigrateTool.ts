import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MigrateToolSchema = z.object({
  service: z
    .string()
    .optional()
    .describe('Migrate specific service only. Available: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class MigrateTool extends MCPTool<typeof MigrateToolSchema> {
  name = 'shopana_migrate';
  description = `Run Drizzle database migrations.

This command applies pending database migrations to the PostgreSQL database.

Examples:
- Migrate all services: {}
- Migrate specific service: { "service": "catalog" }

Available services: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search

Note: Make sure the database is running before executing migrations.`;

  schema = MigrateToolSchema;

  async execute(input: z.infer<typeof MigrateToolSchema>) {
    const { service, workingDir } = input;

    let command = 'yarn shopana db migrate';

    if (service) {
      command += ` -s ${service}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir || process.cwd(),
        timeout: 120000,
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

export default MigrateTool;
