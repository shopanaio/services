import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { formatServiceNames, MIGRATION_SERVICE_NAMES } from '../serviceNames.js';

const execAsync = promisify(exec);

const MigrateToolSchema = z.object({
  service: z
    .string()
    .min(1)
    .optional()
    .describe(`Migrate specific service only. Available: ${formatServiceNames(MIGRATION_SERVICE_NAMES)}`),
  app: z
    .string()
    .min(1)
    .optional()
    .describe('Migrate a specific hosted App from apps/*'),
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

Available services: ${formatServiceNames(MIGRATION_SERVICE_NAMES)}

Note: Make sure the database is running before executing migrations.`;

  schema = MigrateToolSchema;

  async execute(input: z.infer<typeof MigrateToolSchema>) {
    const { service, app, workingDir } = input;

    if (service && app) {
      throw new Error('Choose either service or app');
    }

    let command = 'yarn shopana db migrate';

    if (service) {
      command += ` -s ${service}`;
    } else if (app) {
      command += ` --app ${app}`;
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
