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
      description: 'A modular e-commerce platform built with NestJS microservices architecture and GraphQL Federation',

      architecture: {
        type: 'Microservices with GraphQL Federation',
        framework: 'NestJS',
        database: 'PostgreSQL with Drizzle ORM',
        messaging: 'RabbitMQ',
        workflows: 'Temporal'
      },

      services: {
        apps: 'Application management and configuration',
        bootstrap: 'Service orchestrator and entrypoint',
        catalog: 'Products, variants, categories, tags, options, features',
        checkout: 'Shopping cart, checkout flow, and line items',
        delivery: 'Shipping providers integration (Nova Poshta, Meest)',
        events: 'Event persistence and dispatch',
        iam: 'Identity and access management',
        inventory: 'Stock levels and inventory management',
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
          'schema export': 'Export subgraph schemas from services',
          'schema compose': 'Compose supergraph from subgraphs',
          'schema build': 'Export + compose schemas',
          'db generate': 'Generate database migrations from ORM schema',
          'db migrate': 'Run database migrations',
          'test': 'Run Playwright e2e tests'
        },
        usage: 'Backend/services only: yarn shopana <command> [options]. Admin frontend commands are npm scripts in admin/.'
      },

      admin: {
        description: 'Next.js Admin frontend located in admin/. It is not part of the backend services list and is not managed by yarn shopana service commands.',
        packagePath: 'admin/package.json',
        framework: 'Next.js',
        commands: {
          codegen: 'cd admin && npm run codegen',
          build: 'cd admin && npm run build',
          lint: 'cd admin && npm run lint'
        },
        mcp: {
          tool: 'shopana_admin',
          note: 'This is an MCP helper action, not a yarn shopana CLI subcommand.',
          examples: {
            codegen: { action: 'codegen' },
            build: { action: 'build' },
            lint: { action: 'lint' }
          }
        },
        notes: [
          'Admin codegen reads infra/federation/supergraph-admin.graphql and writes admin/src/graphql/types.ts.',
          'Admin build runs the Next.js production build.',
          'Admin lint runs ESLint through the admin package script.'
        ]
      },

      testing: {
        description: 'Playwright is the PRIMARY method for testing all API functionality. Tests are located in the e2e/ directory and MUST be run from within that directory.',
        framework: 'Playwright',
        directory: 'e2e/',
        configFile: 'e2e/playwright.config.ts',
        important: 'All commands must be executed from the e2e/ directory. Navigate there first: cd e2e',
        quickStart: 'cd e2e && npx playwright test',
        commands: {
          'Run all tests': 'cd e2e && npx playwright test',
          'Run specific test': 'cd e2e && npx playwright test tests/users-api/sign-in.spec.ts',
          'Run tests in directory': 'cd e2e && npx playwright test tests/users-api',
          'Run with pattern': 'cd e2e && npx playwright test --grep "sign-in"',
          'Run in headed mode': 'cd e2e && npx playwright test --headed',
          'Run in debug mode': 'cd e2e && npx playwright test --debug',
          'Run single worker': 'cd e2e && npx playwright test --workers=1',
          'Show HTML report': 'cd e2e && npx playwright show-report'
        },
        testSuites: {
          'users-api': 'User authentication (sign-in, sign-up)',
          'project-api': 'Project management (create, members, isolation)',
          'roles-api': 'RBAC (permissions, system roles, organization isolation)'
        },
        environment: {
          'BASE_URL': 'API base URL (already configured in e2e/.env)',
          'CI': 'Set to "true" for CI mode (enables retries)',
          'WORKERS': 'Number of parallel workers (default: 5)'
        },
        notes: [
          'Playwright tests are the main way to test API endpoints',
          'Tests run against a live API, so services must be running',
          'Always run from e2e/ directory where playwright.config.ts is located',
          'Environment is already configured - no additional setup needed'
        ]
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
        ],
        testing: [
          '1. Start services: yarn shopana dev',
          '2. Run tests: cd e2e && npx playwright test',
          '3. View report (optional): cd e2e && npx playwright show-report'
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
