import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const ListServicesToolSchema = z.object({
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

interface ServiceInfo {
  name: string;
  path: string;
  hasDbGenerate: boolean;
  hasDbMigrate: boolean;
  hasBuild: boolean;
  hasCodegen: boolean;
  description?: string;
}

class ListServicesTool extends MCPTool<typeof ListServicesToolSchema> {
  name = 'shopana_list_services';
  description = `List all available Shopana services with their capabilities.

Returns information about each service including:
- Service name and path
- Available scripts (build, codegen, db:generate, db:migrate)
- Service description from package.json

This is useful to understand the project structure and what operations are available for each service.`;

  schema = ListServicesToolSchema;

  async execute(input: z.infer<typeof ListServicesToolSchema>) {
    const workingDir = input.workingDir || process.cwd();
    const servicesDir = join(workingDir, 'services');

    try {
      const entries = await readdir(servicesDir);
      const services: ServiceInfo[] = [];

      for (const entry of entries) {
        const servicePath = join(servicesDir, entry);
        const stats = await stat(servicePath);

        if (!stats.isDirectory()) continue;

        const packageJsonPath = join(servicePath, 'package.json');

        try {
          const packageJson = JSON.parse(
            await readFile(packageJsonPath, 'utf-8')
          );

          const scripts = packageJson.scripts || {};

          services.push({
            name: entry,
            path: servicePath,
            hasDbGenerate: !!scripts['db:generate'],
            hasDbMigrate: !!scripts['db:migrate'],
            hasBuild: !!scripts['build'],
            hasCodegen: !!scripts['codegen'],
            description: packageJson.description
          });
        } catch {
          // No package.json or invalid
          services.push({
            name: entry,
            path: servicePath,
            hasDbGenerate: false,
            hasDbMigrate: false,
            hasBuild: false,
            hasCodegen: false
          });
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              total: services.length,
              services
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
              error: error.message
            }, null, 2)
          }
        ]
      };
    }
  }
}

export default ListServicesTool;
