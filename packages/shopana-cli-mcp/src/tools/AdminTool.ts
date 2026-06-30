import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

const AdminToolSchema = z.object({
  action: z
    .enum(['codegen', 'build', 'lint'])
    .describe('Admin frontend action. codegen runs GraphQL Code Generator. build runs Next.js production build. lint runs ESLint.'),
  workingDir: z
    .string()
    .optional()
    .describe('Shopana services repository root (defaults to current directory)'),
  adminDir: z
    .string()
    .optional()
    .describe('Admin frontend directory (defaults to <workingDir>/admin)')
});

class AdminTool extends MCPTool<typeof AdminToolSchema> {
  name = 'shopana_admin';
  description = `Run Admin frontend maintenance commands.

The Admin frontend lives in the separate admin/ package and is not a backend service.
Use this tool for Admin GraphQL codegen, production build verification, and linting.

Important:
- Admin codegen: { "action": "codegen" } runs npm run codegen in admin/
- Admin build: { "action": "build" } runs npm run build in admin/
- Admin lint: { "action": "lint" } runs npm run lint in admin/

Examples:
- Generate Admin GraphQL types: { "action": "codegen" }
- Build Admin frontend: { "action": "build" }
- Lint Admin frontend: { "action": "lint" }`;

  schema = AdminToolSchema;

  async execute(input: z.infer<typeof AdminToolSchema>) {
    const workingDir = input.workingDir || process.cwd();
    const adminDir = input.adminDir || join(workingDir, 'admin');
    const commands = {
      codegen: 'npm run codegen',
      build: 'npm run build',
      lint: 'npm run lint'
    } as const;
    const command = commands[input.action];

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: adminDir,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              action: input.action,
              command,
              cwd: adminDir,
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
              action: input.action,
              command,
              cwd: adminDir,
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

export default AdminTool;
