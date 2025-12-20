import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

const ProjectInfoToolSchema = z.object({
  workingDir: z
    .string()
    .optional()
    .describe('Working directory (defaults to current directory)')
});

class ProjectInfoTool extends MCPTool<typeof ProjectInfoToolSchema> {
  name = 'shopana_project_info';
  description = `Get comprehensive information about the Shopana project.

Returns:
- Project overview and architecture
- Available CLI commands
- Service descriptions
- Development workflow
- Common tasks and examples`;

  schema = ProjectInfoToolSchema;

  async execute(input: z.infer<typeof ProjectInfoToolSchema>) {
    const workingDir = input.workingDir || process.cwd();

    const projectInfo = {
      name: 'Shopana Services',
      description: 'A modular e-commerce platform built with NestJS microservices architecture and Apollo GraphQL Federation',

      architecture: {
        type: 'Microservices with GraphQL Federation',
        framework: 'NestJS',
        gateway: 'Apollo Router',
        database: 'PostgreSQL with Drizzle ORM',
        messaging: 'RabbitMQ',
        workflows: 'Temporal'
      },

      services: {
        apps: 'Application management and configuration',
        bootstrap: 'Service orchestrator and entrypoint',
        checkout: 'Shopping cart, checkout flow, and line items',
        delivery: 'Shipping providers integration (Nova Poshta, Meest)',
        iam: 'Identity and access management',
        inventory: 'Products, variants, collections, and stock',
        listing: 'Product listings',
        media: 'File storage and media assets management',
        orders: 'Order processing and fulfillment',
        payments: 'Payment providers integration',
        pricing: 'Price calculations and promotions',
        project: 'Project settings, locales, and currencies',
        reviews: 'Product reviews',
        search: 'Search functionality'
      },

      cli: {
        commands: {
          'dev': 'Start development environment with hot-reload',
          'build': 'Build packages and services for production',
          'migrate': 'Run database migrations',
          'codegen': 'Generate TypeScript types from GraphQL schemas',
          'gateway': 'Start GraphQL federation gateway',
          'schema export': 'Export subgraph schemas from services',
          'schema compose': 'Compose supergraph from subgraphs',
          'schema build': 'Export + compose schemas',
          'db generate': 'Generate database migrations from ORM schema',
          'db migrate': 'Run database migrations'
        },
        usage: 'yarn shopana <command> [options]'
      },

      workflow: {
        setup: [
          '1. corepack enable',
          '2. yarn install',
          '3. yarn shopana build --packages',
          '4. docker-compose up -d',
          '5. yarn shopana migrate',
          '6. yarn shopana dev'
        ],
        schemaChanges: [
          '1. Modify GraphQL schema in service',
          '2. yarn shopana codegen',
          '3. Update resolvers',
          '4. yarn shopana schema build'
        ],
        databaseChanges: [
          '1. Modify Drizzle schema in service',
          '2. yarn shopana db generate -s <service>',
          '3. yarn shopana migrate -s <service>'
        ]
      },

      endpoints: {
        'Apps API': 'http://localhost:10001/graphql',
        'Checkout API': 'http://localhost:10002/graphql',
        'Orders API': 'http://localhost:10003/graphql',
        'Metrics': 'http://localhost:3030/metrics'
      },

      prerequisites: {
        'Node.js': '20+',
        'Yarn': '4.x (via Corepack)',
        'PostgreSQL': '15+',
        'RabbitMQ': '3.x',
        'Docker': 'optional, for infrastructure'
      }
    };

    // Try to read README for additional context
    try {
      const readme = await readFile(join(workingDir, 'README.md'), 'utf-8');
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              ...projectInfo,
              readme_available: true,
              readme_preview: readme.substring(0, 500) + '...'
            }, null, 2)
          }
        ]
      };
    } catch {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              ...projectInfo,
              readme_available: false
            }, null, 2)
          }
        ]
      };
    }
  }
}

export default ProjectInfoTool;
