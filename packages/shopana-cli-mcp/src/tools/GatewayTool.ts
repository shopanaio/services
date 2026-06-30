import { MCPTool } from 'mcp-framework';
import { z } from 'zod';

const GatewayToolSchema = z.object({
  admin: z
    .boolean()
    .optional()
    .describe('Start admin gateway only'),
  storefront: z
    .boolean()
    .optional()
    .describe('Start storefront gateway only'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class GatewayTool extends MCPTool<typeof GatewayToolSchema> {
  name = 'shopana_gateway';
  description = `Start GraphQL federation gateway (Apollo Router).

The gateway composes all service subgraphs into a unified GraphQL API.

Examples:
- Start all gateways: {}
- Start admin gateway only: { "admin": true }
- Start storefront gateway only: { "storefront": true }

Gateways:
- Admin Gateway: Internal operations and management
- Storefront Gateway: Public-facing customer operations

Note: This starts a long-running process.`;

  schema = GatewayToolSchema;

  async execute(input: z.infer<typeof GatewayToolSchema>) {
    const { admin, storefront, workingDir } = input;
    const cwd = workingDir || process.cwd();
    let command = 'yarn shopana gateway';

    if (admin) {
      command += ' --admin';
    } else if (storefront) {
      command += ' --storefront';
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Gateway command prepared',
            command,
            cwd,
            note: 'Run this command in your terminal to start the GraphQL gateway. This is a long-running process.',
            manual_command: `cd ${cwd} && ${command}`
          }, null, 2)
        }
      ]
    };
  }
}

export default GatewayTool;
