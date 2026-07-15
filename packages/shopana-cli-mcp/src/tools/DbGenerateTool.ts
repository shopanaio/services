import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DB_GENERATE_SERVICE_NAMES, formatServiceNames } from '../serviceNames.js';

const execAsync = promisify(exec);

const DbGenerateToolSchema = z.object({
  service: z
    .enum(DB_GENERATE_SERVICE_NAMES)
    .optional()
    .describe(`Generate migrations for specific service only. Available: ${formatServiceNames(DB_GENERATE_SERVICE_NAMES)}`),
  list: z
    .boolean()
    .optional()
    .describe('List services with db:generate script'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class DbGenerateTool extends MCPTool<typeof DbGenerateToolSchema> {
  name = 'shopana_db_generate';
  description = `Generate database migrations from Drizzle ORM schema.

This command analyzes your schema changes and generates SQL migration files.

Examples:
- Generate for all services: {}
- Generate for specific service: { "service": "catalog" }
- List services with db:generate: { "list": true }

Available services: ${formatServiceNames(DB_GENERATE_SERVICE_NAMES)}

Workflow:
1. Modify your Drizzle schema in the service
2. Run db:generate to create migration files
3. Run migrate to apply the migrations`;

  schema = DbGenerateToolSchema;

  async execute(input: z.infer<typeof DbGenerateToolSchema>) {
    const { service, list, workingDir } = input;

    let command = 'yarn shopana db generate';

    if (list) {
      command += ' -l';
    } else if (service) {
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

export default DbGenerateTool;
