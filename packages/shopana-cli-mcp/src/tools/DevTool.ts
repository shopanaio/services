import { MCPTool } from 'mcp-framework';
import { z } from 'zod';

const DevToolSchema = z.object({
  service: z
    .string()
    .optional()
    .describe('Specific service to run. If not provided, starts all services via orchestrator. Available: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class DevTool extends MCPTool<typeof DevToolSchema> {
  name = 'shopana_dev';
  description = `Start Shopana development environment with hot-reload.

This command starts the development server with file watching enabled. By default, it starts all services through the bootstrap orchestrator.

Features:
- Watches for file changes automatically
- Services restart automatically when code changes are detected
- No manual restart required during development

Examples:
- Start all services: {}
- Start specific service: { "service": "catalog" }

Available services: apps, bootstrap, catalog, checkout, delivery, events, iam, media, orders, payments, pricing, project, reviews, search

Note: This starts a long-running process. The server will continue running until stopped.`;

  schema = DevToolSchema;

  async execute(input: z.infer<typeof DevToolSchema>) {
    const { service, workingDir } = input;

    let command = 'yarn';
    const args = ['shopana', 'dev'];

    if (service) {
      args.push('-s', service);
    }

    const cwd = workingDir || process.cwd();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Development server command prepared',
            command: `${command} ${args.join(' ')}`,
            cwd,
            note: 'Run this command in your terminal to start the development server. This is a long-running process that will watch for changes.',
            manual_command: service
              ? `cd ${cwd} && yarn shopana dev -s ${service}`
              : `cd ${cwd} && yarn shopana dev`
          }, null, 2)
        }
      ]
    };
  }
}

export default DevTool;
