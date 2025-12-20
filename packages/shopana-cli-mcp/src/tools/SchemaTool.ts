import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SchemaToolSchema = z.object({
  action: z
    .enum(['export', 'compose', 'build'])
    .describe('Schema action: export (extract subgraphs), compose (create supergraph), build (export + compose)'),
  output: z
    .string()
    .optional()
    .describe('Output file path for compose/build (default: apollo/supergraph.graphql)'),
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class SchemaTool extends MCPTool<typeof SchemaToolSchema> {
  name = 'shopana_schema';
  description = `Manage GraphQL federation schemas.

Actions:
- export: Extract subgraph schemas from each service
- compose: Compose supergraph schema using Hive CLI from subgraphs
- build: Run export + compose in sequence (recommended)

Examples:
- Export subgraphs: { "action": "export" }
- Compose supergraph: { "action": "compose" }
- Full schema build: { "action": "build" }
- Custom output: { "action": "build", "output": "custom/path.graphql" }

Default output: apollo/supergraph.graphql`;

  schema = SchemaToolSchema;

  async execute(input: z.infer<typeof SchemaToolSchema>) {
    const { action, output, workingDir } = input;

    let command = `yarn shopana schema ${action}`;

    if ((action === 'compose' || action === 'build') && output) {
      command += ` -o ${output}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir || process.cwd(),
        timeout: 180000, // 3 minutes
        maxBuffer: 10 * 1024 * 1024
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              command,
              action,
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
              action,
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

export default SchemaTool;
