# DBOS Transact Workflows Implementation Plan

## Overview

Integration of DBOS Transact for building durable workflows into Shopana services architecture.

### Why DBOS Transact?

| Criteria | Current State | DBOS Transact |
|----------|---------------|---------------|
| Durability | None (crash = state loss) | Automatic recovery |
| Orchestration | RabbitMQ events (fire-and-forget) | Full orchestration with guarantees |
| Retries | Manual implementation | Built-in with checkpointing |
| Visibility | Logs only | Full audit trail in PostgreSQL |
| Infrastructure | PostgreSQL already exists | Uses existing PostgreSQL |

---

## Phase 1: Infrastructure and Basic Integration

### 1.1 Create `@shopana/workflows` Package

```
packages/workflows/
├── src/
│   ├── index.ts                    # Public API exports
│   ├── BaseWorkflow.ts             # Base class for workflows
│   ├── WorkflowRegistry.ts         # Registry for registering and invoking workflows
│   ├── WorkflowModule.ts           # NestJS module
│   └── types.ts                    # Types and interfaces
├── package.json
└── tsconfig.json
```

**Dependencies:**
```json
{
  "dependencies": {
    "@dbos-inc/dbos-sdk": "^2.0.0",
    "@shopana/shared-kernel": "workspace:*"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0"
  }
}
```

### 1.2 DBOS Configuration

Add to `config.yml`:

```yaml
workflows:
  database:
    url: ${DBOS_DATABASE_URL:-postgres://localhost:5432/shopana_workflows}
  settings:
    recovery_enabled: true
    max_retries: 3
    checkpoint_interval_ms: 1000
```

### 1.3 Database Migrations

```sql
-- migrations/0001_dbos_system_tables.sql
CREATE SCHEMA IF NOT EXISTS dbos;
```

---

## Phase 2: BaseWorkflow and NestJS Integration

### 2.1 WorkflowRegistry

```typescript
// packages/workflows/src/WorkflowRegistry.ts
import { Injectable, Logger } from '@nestjs/common';
import { DBOS } from '@dbos-inc/dbos-sdk';
import type { BaseWorkflow } from './BaseWorkflow';

export interface WorkflowHandle<TResult> {
  workflowId: string;
  getResult(): Promise<TResult>;
  getStatus(): Promise<WorkflowStatus>;
}

export type WorkflowStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'RETRIES_EXCEEDED' | 'CANCELLED';

@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, BaseWorkflow>();

  /**
   * Register workflow instance by name
   * Called in service's onModuleInit() alongside broker.register()
   */
  register(name: string, workflow: BaseWorkflow): void {
    if (this.workflows.has(name)) {
      throw new Error(`Workflow "${name}" already registered`);
    }
    this.workflows.set(name, workflow);
    this.logger.debug(`Registered workflow: ${name}`);
  }

  /**
   * Deregister workflow (for graceful shutdown)
   */
  deregister(name: string): void {
    this.workflows.delete(name);
  }

  /**
   * Get list of registered workflows
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow by name (async, returns handle for monitoring)
   * Use for fire-and-forget or when workflow control is needed
   */
  async start<TParams, TResult>(
    name: string,
    params: TParams,
    options?: { workflowId?: string }
  ): Promise<WorkflowHandle<TResult>> {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow "${name}" not found. Available: ${this.list().join(', ')}`);
    }

    // DBOS startWorkflow returns handle for monitoring
    const handle = await DBOS.startWorkflow(
      (workflow as any).run.bind(workflow),
      params,
      { workflowId: options?.workflowId }
    );

    return {
      workflowId: handle.workflowId,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  /**
   * Start workflow and wait for result (blocking)
   * Use when result is needed immediately
   */
  async call<TParams, TResult>(
    name: string,
    params: TParams,
    options?: { workflowId?: string }
  ): Promise<TResult> {
    const handle = await this.start<TParams, TResult>(name, params, options);
    return handle.getResult();
  }

  /**
   * Get handle to existing workflow by ID
   * Use for checking status of running workflow
   */
  async retrieve<TResult>(workflowId: string): Promise<WorkflowHandle<TResult> | null> {
    try {
      const handle = DBOS.retrieveWorkflow(workflowId);
      if (!handle) return null;

      return {
        workflowId,
        getResult: () => handle.getResult(),
        getStatus: () => handle.getStatus(),
      };
    } catch {
      return null;
    }
  }
}
```

### 2.2 BaseWorkflow

```typescript
// packages/workflows/src/BaseWorkflow.ts
import type { ServiceBroker, Logger } from '@shopana/shared-kernel';

export interface WorkflowServices {
  broker: ServiceBroker;
  logger: Logger;
}

export abstract class BaseWorkflow<TServices extends WorkflowServices = WorkflowServices> {
  protected readonly broker: ServiceBroker;
  protected readonly logger: Logger;

  constructor(services: TServices) {
    this.broker = services.broker;
    this.logger = services.logger;
  }
}
```

### 2.3 WorkflowModule

```typescript
// packages/workflows/src/WorkflowModule.ts
import { DynamicModule, Global, Module, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { DBOS } from '@dbos-inc/dbos-sdk';
import { WorkflowRegistry } from './WorkflowRegistry';

export const WORKFLOW_REGISTRY = Symbol('WORKFLOW_REGISTRY');
export const WORKFLOW_CONFIG = Symbol('WORKFLOW_CONFIG');

export interface WorkflowModuleConfig {
  /** PostgreSQL connection string for DBOS system tables */
  databaseUrl: string;
  /** Application name for DBOS (used in system tables) */
  appName?: string;
}

@Global()
@Module({})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(WORKFLOW_CONFIG) private readonly config: WorkflowModuleConfig,
  ) {}

  static forRoot(config: WorkflowModuleConfig): DynamicModule {
    return {
      module: WorkflowModule,
      providers: [
        {
          provide: WORKFLOW_CONFIG,
          useValue: config,
        },
        {
          provide: WORKFLOW_REGISTRY,
          useClass: WorkflowRegistry,
        },
      ],
      exports: [WORKFLOW_REGISTRY],
    };
  }

  async onModuleInit() {
    // Configure and launch DBOS
    DBOS.setConfig({
      databaseUrl: this.config.databaseUrl,
      appName: this.config.appName ?? 'shopana',
    });
    await DBOS.launch();
  }

  async onModuleDestroy() {
    await DBOS.shutdown();
  }
}
```

### 2.4 Public API (index.ts)

```typescript
// packages/workflows/src/index.ts
export { BaseWorkflow, type WorkflowServices } from './BaseWorkflow';
export {
  WorkflowRegistry,
  type WorkflowHandle,
  type WorkflowStatus
} from './WorkflowRegistry';
export {
  WorkflowModule,
  WORKFLOW_REGISTRY,
  type WorkflowModuleConfig
} from './WorkflowModule';
```

### 2.5 Service Registration (alongside actions and event listeners)

```typescript
// services/project/src/project.nest-service.ts
import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';
import { WORKFLOW_REGISTRY, WorkflowRegistry } from '@shopana/workflows';
import { ProjectCreateWorkflow } from './workflows/ProjectCreateWorkflow';

@Injectable()
export class ProjectNestService implements OnModuleInit {
  private readonly logger = new Logger(ProjectNestService.name);

  constructor(
    @Inject(SERVICE_BROKER) private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
  ) {}

  async onModuleInit() {
    // 1. Register actions (as before)
    this.broker.register('getProject', (params) => ...);
    this.broker.register('createProject', (params) => ...);

    // 2. Register workflows (alongside actions)
    this.workflow.register('projectCreate', new ProjectCreateWorkflow({
      broker: this.broker,
      logger: this.logger,
    }));

    this.logger.log('Project service initialized');
  }
}
```

### 2.6 Module Connection in Bootstrap

```typescript
// services/bootstrap/src/bootstrap.module.ts
import { Module } from '@nestjs/common';
import { WorkflowModule } from '@shopana/workflows';
import { getServiceConfig } from '@shopana/shared-service-config';

const config = getServiceConfig('bootstrap');

@Module({
  imports: [
    WorkflowModule.forRoot({
      databaseUrl: config.workflows?.database?.url ?? process.env.DBOS_DATABASE_URL,
      appName: 'shopana',
    }),
    // ... other modules
  ],
})
export class BootstrapModule {}
```

### 2.7 Usage in Kernel Services

```typescript
// services/project/src/kernel/types.ts
import type { ServiceBroker, Logger } from '@shopana/shared-kernel';
import type { WorkflowRegistry } from '@shopana/workflows';

export interface ProjectKernelServices {
  broker: ServiceBroker;
  workflow: WorkflowRegistry;  // Add workflow registry
  repository: Repository;
  logger: Logger;
}

// Call workflow from scripts, resolvers or other places via services:

// Async start (fire-and-forget)
const handle = await this.services.workflow.start('projectCreate', params);
console.log('Workflow started:', handle.workflowId);

// Sync call with result waiting
const result = await this.services.workflow.call('projectCreate', params);

// Check status of running workflow
const handle = await this.services.workflow.retrieve(workflowId);
const status = await handle.getStatus();
```

---

## Phase 3: Example - Project Creation Workflow

### 3.1 Current Implementation (ProjectCreateScript)

Current `ProjectCreateScript` only creates a database record:

```typescript
// services/project/src/scripts/project/ProjectCreateScript.ts
export class ProjectCreateScript extends BaseScript<ProjectCreateParams, ProjectCreateResult> {
  protected async execute(params: ProjectCreateParams): Promise<ProjectCreateResult> {
    const projectId = crypto.randomUUID();
    const project = await this.repository.project.create({
      id: projectId,
      name: params.name,
      slug: params.slug,
      // ...
    });
    return { project, userErrors: [] };
  }
}
```

**Problem:** Project creation also requires creating an organization in Casdoor (IAM). If a crash occurs between project and organization creation - data becomes inconsistent.

### 3.2 Durable Workflow Solution

**File:** `services/project/src/workflows/ProjectCreateWorkflow.ts`

```typescript
import { DBOS } from '@dbos-inc/dbos-sdk';
import { BaseWorkflow } from '@shopana/workflows';

interface ProjectCreateInput {
  name: string;
  slug: string;
  locales: string[];
  defaultCurrency: string;
  status: string;
  timezone: string;
  email: string;
  ownerId: string;
}

interface ProjectCreateOutput {
  projectId: string;
  casdoorOrganizationId: string;
}

export class ProjectCreateWorkflow extends BaseWorkflow {

  /**
   * Main workflow - orchestrates project creation
   */
  @DBOS.workflow()
  async run(input: ProjectCreateInput): Promise<ProjectCreateOutput> {
    const projectId = crypto.randomUUID();

    // Step 1: Create project in database
    await this.createProject(projectId, input);

    // Step 2: Create Casdoor organization (IAM)
    const casdoorOrg = await this.createCasdoorOrganization(input);

    // Step 3: Create Casdoor application
    const casdoorApp = await this.createCasdoorApplication(input, casdoorOrg.name);

    // Step 4: Link owner to project
    await this.linkOwnerToProject(projectId, input.ownerId);

    // Step 5: Update project with Casdoor data
    await this.updateProjectWithCasdoorData(projectId, casdoorOrg, casdoorApp);

    return {
      projectId,
      casdoorOrganizationId: casdoorOrg.name,
    };
  }

  /**
   * Step: Create project in database
   */
  @DBOS.step()
  async createProject(projectId: string, input: ProjectCreateInput) {
    // Call another service via broker
    return this.broker.call('project.create', {
      id: projectId,
      name: input.name,
      slug: input.slug,
      locales: input.locales,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  /**
   * Step: Create Casdoor organization via IAM service
   */
  @DBOS.step()
  async createCasdoorOrganization(input: ProjectCreateInput) {
    return this.broker.call('iam.createOrganization', {
      name: input.slug,
      displayName: input.name,
      owner: 'admin',
      websiteUrl: `https://${input.slug}.shopana.io`,
      enableSoftDeletion: true,
    });
  }

  /**
   * Step: Create Casdoor application
   */
  @DBOS.step()
  async createCasdoorApplication(input: ProjectCreateInput, organizationName: string) {
    return this.broker.call('iam.createApplication', {
      name: `${input.slug}-app`,
      displayName: `${input.name} Application`,
      organization: organizationName,
      enablePassword: true,
      enableSignUp: true,
      redirectUris: [`https://${input.slug}.shopana.io/callback`],
    });
  }

  /**
   * Step: Link owner to project
   */
  @DBOS.step()
  async linkOwnerToProject(projectId: string, ownerId: string) {
    return this.broker.call('project.addMember', {
      projectId,
      userId: ownerId,
      role: 'owner',
    });
  }

  /**
   * Step: Update project with Casdoor data
   */
  @DBOS.step()
  async updateProjectWithCasdoorData(
    projectId: string,
    casdoorOrg: { name: string },
    casdoorApp: { name: string; clientId: string }
  ) {
    return this.broker.call('project.update', {
      id: projectId,
      casdoorOrganization: casdoorOrg.name,
      casdoorApplication: casdoorApp.name,
      casdoorClientId: casdoorApp.clientId,
    });
  }
}
```

### 3.3 Workflow Approach Benefits

| Scenario | Without DBOS | With DBOS |
|----------|--------------|-----------|
| Crash after Step 1 | Project without Casdoor org | Automatically continues from Step 2 |
| Crash after Step 2 | Org without application | Automatically continues from Step 3 |
| Repeated call with same ID | Duplicate project | Idempotency - returns existing |
| Casdoor API timeout | Unknown state | Retry with at-least-once guarantee |

### 3.4 GraphQL Resolver Integration

```typescript
// services/project/src/api/graphql-admin/resolvers/mutations/project.ts
export const projectCreate = async (_, { input }, context) => {
  // Call workflow via services.workflow
  // workflowId ensures idempotency - repeated call with same slug
  // returns previous execution result instead of creating duplicate
  const result = await context.services.workflow.call(
    'projectCreate',
    {
      ...input,
      ownerId: context.user.id,
    },
    {
      workflowId: `project-create-${input.slug}`, // Idempotency key
    }
  );

  return {
    project: await context.services.repository.project.getById(result.projectId),
    userErrors: [],
  };
};

// Async start example (for long-running operations)
export const projectCreateAsync = async (_, { input }, context) => {
  const handle = await context.services.workflow.start(
    'projectCreate',
    { ...input, ownerId: context.user.id },
    { workflowId: `project-create-${input.slug}` }
  );

  // Return ID for status polling
  return {
    workflowId: handle.workflowId,
    status: 'PENDING',
  };
};

// Query for status checking
export const projectCreateStatus = async (_, { workflowId }, context) => {
  const handle = await context.services.workflow.retrieve(workflowId);
  if (!handle) {
    return { status: 'NOT_FOUND' };
  }

  const status = await handle.getStatus();
  return { workflowId, status };
};
```

### 3.5 Compensation (Saga Pattern) for Rollback

```typescript
export class ProjectCreateWorkflowWithCompensation extends BaseWorkflow {

  @DBOS.workflow()
  async run(input: ProjectCreateInput): Promise<ProjectCreateOutput> {
    const projectId = crypto.randomUUID();

    try {
      // Step 1: Create project
      await this.createProject(projectId, input);

      // Step 2: Create Casdoor organization
      const casdoorOrg = await this.createCasdoorOrganization(input);

      // Step 3: Create Casdoor application
      const casdoorApp = await this.createCasdoorApplication(input, casdoorOrg.name);

      return { projectId, casdoorOrganizationId: casdoorOrg.name };

    } catch (error) {
      // Rollback in reverse order
      await this.compensate(projectId, input.slug);
      throw error;
    }
  }

  @DBOS.step()
  async compensate(projectId: string, slug: string) {
    // Delete in reverse order
    await this.broker.call('iam.deleteApplication', { name: `${slug}-app` });
    await this.broker.call('iam.deleteOrganization', { name: slug });
    await this.broker.call('project.delete', { id: projectId });
  }

  // ... other steps
}
```

---

## Phase 4: Observability

### 4.1 Metrics

```typescript
export const workflowMetrics = {
  started: new Counter('workflow_started_total'),
  completed: new Counter('workflow_completed_total'),
  failed: new Counter('workflow_failed_total'),
  duration: new Histogram('workflow_duration_seconds'),
};
```

### 4.2 Tracing

```typescript
DBOS.setConfig({
  telemetry: {
    logs: { logger: pinoLogger },
    traces: { exporter: 'otlp' },
  },
});
```

---

## Phase 5: Testing

### 5.1 Unit Tests

```typescript
import { DBOS } from '@dbos-inc/dbos-sdk';
import { ProjectCreateWorkflow } from './workflows/ProjectCreateWorkflow';

describe('ProjectCreateWorkflow', () => {
  let workflow: ProjectCreateWorkflow;
  let mockBroker: jest.Mocked<ServiceBroker>;

  beforeEach(async () => {
    // Mock broker for tests
    mockBroker = {
      call: jest.fn(),
    } as any;

    workflow = new ProjectCreateWorkflow({
      broker: mockBroker,
      logger: console as any,
    });

    // Setup mocks
    mockBroker.call.mockImplementation((action, params) => {
      if (action === 'iam.createOrganization') {
        return Promise.resolve({ name: params.name });
      }
      if (action === 'iam.createApplication') {
        return Promise.resolve({ name: `${params.name}`, clientId: 'client-123' });
      }
      return Promise.resolve({});
    });
  });

  it('should create project and Casdoor organization', async () => {
    const result = await workflow.run({
      name: 'Test Store',
      slug: 'test-store',
      ownerId: 'user-123',
      locales: ['uk'],
      defaultCurrency: 'UAH',
      status: 'active',
      timezone: 'Europe/Kyiv',
      email: 'test@example.com',
    });

    expect(result.projectId).toBeDefined();
    expect(result.casdoorOrganizationId).toBe('test-store');

    // Verify all steps were called
    expect(mockBroker.call).toHaveBeenCalledWith('project.create', expect.any(Object));
    expect(mockBroker.call).toHaveBeenCalledWith('iam.createOrganization', expect.any(Object));
    expect(mockBroker.call).toHaveBeenCalledWith('iam.createApplication', expect.any(Object));
  });

  it('should call steps in correct order', async () => {
    const callOrder: string[] = [];
    mockBroker.call.mockImplementation((action) => {
      callOrder.push(action);
      return Promise.resolve({ name: 'test', clientId: 'client-123' });
    });

    await workflow.run({
      name: 'Test',
      slug: 'test',
      ownerId: 'user-1',
      locales: ['uk'],
      defaultCurrency: 'UAH',
      status: 'active',
      timezone: 'Europe/Kyiv',
      email: 'test@test.com',
    });

    expect(callOrder).toEqual([
      'project.create',
      'iam.createOrganization',
      'iam.createApplication',
      'project.addMember',
      'project.update',
    ]);
  });
});
```

### 5.2 Integration Tests with DBOS

```typescript
import { DBOS } from '@dbos-inc/dbos-sdk';

describe('ProjectCreateWorkflow Integration', () => {
  beforeAll(async () => {
    await DBOS.launch();
  });

  afterAll(async () => {
    await DBOS.shutdown();
  });

  it('should be idempotent with same workflowId', async () => {
    const workflow = new ProjectCreateWorkflow({ broker, logger });
    const workflowId = 'test-idempotency-123';

    // First call
    const handle1 = await DBOS.startWorkflow(
      workflow.run.bind(workflow),
      { slug: 'idempotent-test', ... },
      { workflowId }
    );
    const result1 = await handle1.getResult();

    // Second call with same ID - should return same result
    const handle2 = await DBOS.startWorkflow(
      workflow.run.bind(workflow),
      { slug: 'idempotent-test', ... },
      { workflowId }
    );
    const result2 = await handle2.getResult();

    expect(result1.projectId).toBe(result2.projectId);
  });
});
```

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PostgreSQL load from checkpoints | Medium | Medium | Separate DB/schema for DBOS tables, monitoring |
| Latency overhead per step | Low | Low | Group small operations into single step |
| Casdoor API unavailable | Medium | High | Retry with exponential backoff, circuit breaker |
| DBOS version incompatibility | Low | High | Pinned versions, tests on upgrade |
| Workflow stuck in PENDING | Low | Medium | Monitoring + alerts, manual recovery API |

---

## Implementation Checklist

- [ ] Create `packages/workflows` package
- [ ] Implement `BaseWorkflow`, `WorkflowRegistry`, `WorkflowModule`
- [ ] Add configuration to `config.yml`
- [ ] Create migration for DBOS schema
- [ ] Connect `WorkflowModule` in `BootstrapModule`
- [ ] Implement `ProjectCreateWorkflow`
- [ ] Register workflow in `ProjectNestService`
- [ ] Add actions in IAM for Casdoor operations
- [ ] Write unit and integration tests
- [ ] Setup workflow monitoring

---

## References

- [DBOS TypeScript Docs](https://docs.dbos.dev/typescript/programming-guide)
- [DBOS GitHub](https://github.com/dbos-inc/dbos-transact-ts)
- [Workflows Tutorial](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial)
- [DBOS v2.0 Announcement](https://www.dbos.dev/blog/dbos-transact-v2-typescript)
