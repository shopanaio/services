# Plan: Remove Casdoor from Project Service

## Goal

Completely remove Casdoor SDK from Project service. When a project is created, send an event via RabbitMQ that will be handled by the Identity service to create an organization in Casdoor.

---

## Current State

```
┌─────────────┐     ┌─────────────┐
│   Project   │     │    Users    │
│   Service   │     │   Service   │
│             │     │             │
│  Casdoor ◄──┼─────┼── Casdoor ◄─┤
│  SDK        │     │  SDK        │
└─────────────┘     └─────────────┘
```

**Problems:**
- Project directly uses Casdoor SDK (for certificates)
- No single point of identity management
- Project doesn't emit creation events

---

## Target Architecture

```
                        ┌──────────────────┐
                        │     Casdoor      │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │    Identity      │
                        │    Service       │
                        │                  │
                        │ Subscribes:      │
                        │ • project.created│
                        │ Publishes:       │
                        │ • project.ready  │
                        └────────┬─────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Project      │    │    Payments     │    │    ...other     │
│    Service      │    │    Service      │    │    services     │
│                 │    │                 │    │                 │
│ Publishes:      │    │ Subscribes:     │    │ Subscribes:     │
│ • project.created    │ • project.created    │ • project.created
│                 │    │ Publishes:      │    │ Publishes:      │
│ Subscribes:     │    │ • project.ready │    │ • project.ready │
│ • project.ready │    │   .payments     │    │   .{service}    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Project Readiness Status

### Problem

After project creation, initialization must be performed in multiple services:
- Identity: create organization in Casdoor
- Payments: configure payment methods (future)
- Media: create storage bucket (future)
- etc.

Project should have a readiness status that aggregates statuses from all services.

### Solution: Event-driven Readiness Tracking

#### Database Schema in Project Service

```typescript
// Add to project schema
export const projectReadiness = pgTable("project_readiness", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  service: varchar("service", { length: 50 }).notNull(), // "identity", "payments", etc.
  status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | processing | ready | failed
  error: text("error"), // error message if failed
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  unique: unique().on(table.projectId, table.service),
}));

// Add field to project
export const project = pgTable("project", {
  // ... existing fields
  readinessStatus: varchar("readiness_status", { length: 20 })
    .notNull()
    .default("initializing"),
    // initializing | ready | degraded | failed
});
```

#### Project Creation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PROJECT CREATION FLOW                          │
└──────────────────────────────────────────────────────────────────────┘

1. Client → Project Service: createProject(name, ownerId)

2. Project Service:
   ├── Creates project with readinessStatus = "initializing"
   ├── Creates records in project_readiness:
   │   ├── { service: "identity", status: "pending" }
   │   └── { service: "payments", status: "pending" }  // if needed
   └── Emits event: project.created
       {
         projectId: "proj_001",
         name: "My Shop",
         ownerId: "user_001",
         requiredServices: ["identity", "payments"]
       }

3. Identity Service (subscribed to project.created):
   ├── Creates organization in Casdoor
   ├── Adds owner as member with "owner" role
   └── Emits: project.ready.identity
       {
         projectId: "proj_001",
         service: "identity",
         status: "ready"
       }

4. Payments Service (subscribed to project.created):
   ├── Configures payment methods
   └── Emits: project.ready.payments
       {
         projectId: "proj_001",
         service: "payments",
         status: "ready"
       }

5. Project Service (subscribed to project.ready.*):
   ├── Updates project_readiness for the corresponding service
   ├── Checks: are all services ready?
   │   ├── Yes → readinessStatus = "ready"
   │   └── No → stays "initializing"
   └── If any failed → readinessStatus = "degraded" or "failed"
```

#### Events

```typescript
// packages/shared-service-events/src/project.ts

export interface ProjectCreatedEvent {
  projectId: string;
  name: string;
  slug: string;
  ownerId: string;
  requiredServices: string[]; // ["identity", "payments", ...]
  timestamp: string;
}

export interface ProjectReadyEvent {
  projectId: string;
  service: string;           // "identity", "payments", etc.
  status: "ready" | "failed";
  error?: string;            // if failed
  timestamp: string;
}

// Routing keys:
// project.created          - project created, needs initialization
// project.ready.identity   - identity is ready
// project.ready.payments   - payments is ready
// project.ready.*          - any service ready (for Project to listen)
```

#### Subscriber in Project Service

```typescript
// services/project/src/events/ProjectReadySubscriber.ts

@RabbitSubscribe({
  exchange: "shopana.events",
  routingKey: "project.ready.*",
  queue: "project-readiness-events",
})
async handleProjectReady(payload: ProjectReadyEvent) {
  // 1. Update service status
  await this.readinessRepo.updateStatus(
    payload.projectId,
    payload.service,
    payload.status,
    payload.error
  );

  // 2. Check overall project status
  const readiness = await this.readinessRepo.getByProject(payload.projectId);
  const allReady = readiness.every(r => r.status === "ready");
  const anyFailed = readiness.some(r => r.status === "failed");
  const allResolved = readiness.every(r =>
    r.status === "ready" || r.status === "failed"
  );

  // 3. Update project status
  if (allReady) {
    await this.projectRepo.updateReadinessStatus(payload.projectId, "ready");
    await this.broker.emit("project.fully.ready", { projectId: payload.projectId });
  } else if (anyFailed && allResolved) {
    await this.projectRepo.updateReadinessStatus(payload.projectId, "degraded");
  }
}
```

---

## Detailed Implementation Plan

### Phase 1: Prepare Events Infrastructure

#### 1.1 Create events package
```
packages/shared-service-events/
├── src/
│   ├── index.ts
│   ├── project/
│   │   ├── ProjectCreatedEvent.ts
│   │   ├── ProjectReadyEvent.ts
│   │   └── index.ts
│   └── identity/
│       ├── MemberAddedEvent.ts
│       └── index.ts
├── package.json
└── tsconfig.json
```

#### 1.2 Define event types

```typescript
// packages/shared-service-events/src/project/ProjectCreatedEvent.ts

export const PROJECT_CREATED_ROUTING_KEY = "project.created";

export interface ProjectCreatedPayload {
  projectId: string;
  name: string;
  slug: string;
  ownerId: string;
  timezone: string;
  requiredServices: string[];
  createdAt: string;
}

export interface ProjectCreatedEvent {
  type: "project.created";
  payload: ProjectCreatedPayload;
  meta: {
    correlationId: string;
    timestamp: string;
  };
}
```

### Phase 2: Update Project Service

#### 2.1 Add readiness schema

```typescript
// services/project/src/repositories/models/projectReadiness.ts

import { pgTable, uuid, varchar, text, timestamp, unique } from "drizzle-orm/pg-core";
import { project } from "./project";

export const projectReadiness = pgTable("project_readiness", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  service: varchar("service", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  projectServiceUnique: unique().on(table.projectId, table.service),
}));
```

#### 2.2 Update project schema

```typescript
// Add readinessStatus field
readinessStatus: varchar("readiness_status", { length: 20 })
  .notNull()
  .default("initializing"),
```

#### 2.3 Remove Casdoor from Repository

```typescript
// services/project/src/repositories/Repository.ts
// REMOVE:
// - import CasdoorNodeClient
// - casdoor field
// - casdoor initialization logic

export class Repository {
  constructor(
    public readonly db: DrizzleClient,
    // NO casdoor
  ) {}

  static async create(config: RepositoryConfig): Promise<Repository> {
    const db = createDrizzleClient(config.db);
    return new Repository(db);
  }
}
```

#### 2.4 Implement ProjectCreateScript

```typescript
// services/project/src/scripts/project/ProjectCreateScript.ts

export class ProjectCreateScript extends BaseScript<CreateProjectInput, Project> {
  async execute(input: CreateProjectInput): Promise<Project> {
    // 1. Create project
    const project = await this.repository.project.create({
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      timezone: input.timezone,
      readinessStatus: "initializing",
    });

    // 2. Determine required services
    const requiredServices = ["identity"]; // later add payments, media, etc.

    // 3. Create readiness records
    for (const service of requiredServices) {
      await this.repository.projectReadiness.create({
        projectId: project.id,
        service,
        status: "pending",
      });
    }

    // 4. Emit event
    await this.broker.emit("project.created", {
      projectId: project.id,
      name: project.name,
      slug: project.slug,
      ownerId: input.ownerId,
      timezone: project.timezone,
      requiredServices,
      createdAt: project.createdAt.toISOString(),
    });

    return project;
  }
}
```

#### 2.5 Add subscriber for project.ready.*

```typescript
// services/project/src/events/ProjectReadySubscriber.ts

@Injectable()
export class ProjectReadySubscriber {
  constructor(
    private readonly readinessRepo: ProjectReadinessRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly broker: ServiceBroker,
  ) {}

  @RabbitSubscribe({
    exchange: "shopana.events",
    routingKey: "project.ready.#",
    queue: "project-readiness-updates",
    queueOptions: {
      durable: true,
      deadLetterExchange: "shopana.dlx",
    },
  })
  async handleProjectReady(payload: ProjectReadyEvent) {
    const { projectId, service, status, error } = payload;

    // 1. Update service status
    await this.readinessRepo.upsert({
      projectId,
      service,
      status,
      error,
      updatedAt: new Date(),
    });

    // 2. Get all statuses
    const allReadiness = await this.readinessRepo.findByProject(projectId);

    // 3. Calculate overall status
    const allReady = allReadiness.every(r => r.status === "ready");
    const anyFailed = allReadiness.some(r => r.status === "failed");
    const allResolved = allReadiness.every(r =>
      r.status === "ready" || r.status === "failed"
    );

    // 4. Update project status
    let newStatus: string;
    if (allReady) {
      newStatus = "ready";
    } else if (anyFailed && allResolved) {
      newStatus = "degraded";
    } else if (anyFailed) {
      newStatus = "initializing"; // still waiting for other services
    } else {
      newStatus = "initializing";
    }

    const project = await this.projectRepo.updateReadinessStatus(projectId, newStatus);

    // 5. If project is fully ready - emit event
    if (newStatus === "ready") {
      await this.broker.emit("project.fully.ready", {
        projectId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

### Phase 3: Create Identity Service

#### 3.1 Service structure

```
services/identity/
├── src/
│   ├── identity.module.ts
│   ├── identity.nest-service.ts
│   │
│   ├── adapters/
│   │   └── casdoor/
│   │       ├── CasdoorClient.ts
│   │       ├── OrganizationAdapter.ts
│   │       ├── UserAdapter.ts
│   │       └── mappers.ts
│   │
│   ├── repositories/
│   │   ├── Repository.ts
│   │   ├── orgMapping/
│   │   │   └── OrgMappingRepository.ts
│   │   ├── membership/
│   │   │   └── MembershipRepository.ts
│   │   └── models/
│   │       ├── orgMapping.ts
│   │       └── membership.ts
│   │
│   ├── scripts/
│   │   ├── organization/
│   │   │   └── CreateOrganizationScript.ts
│   │   └── membership/
│   │       └── AddMemberScript.ts
│   │
│   └── events/
│       └── subscribers/
│           └── ProjectCreatedSubscriber.ts
│
├── drizzle.config.ts
└── package.json
```

#### 3.2 Subscriber for project.created

```typescript
// services/identity/src/events/subscribers/ProjectCreatedSubscriber.ts

@Injectable()
export class ProjectCreatedSubscriber {
  constructor(
    private readonly casdoorAdapter: CasdoorAdapter,
    private readonly orgMappingRepo: OrgMappingRepository,
    private readonly membershipService: MembershipService,
    private readonly broker: ServiceBroker,
  ) {}

  @RabbitSubscribe({
    exchange: "shopana.events",
    routingKey: "project.created",
    queue: "identity-project-created",
    queueOptions: {
      durable: true,
      deadLetterExchange: "shopana.dlx",
    },
  })
  async handleProjectCreated(payload: ProjectCreatedPayload) {
    try {
      const casdoorOrgName = `project-${payload.projectId}`;

      // 1. Create organization in Casdoor
      await this.casdoorAdapter.createOrganization({
        name: casdoorOrgName,
        displayName: payload.name,
      });

      // 2. Save mapping
      await this.orgMappingRepo.create({
        projectId: payload.projectId,
        casdoorOrganization: casdoorOrgName,
      });

      // 3. Add owner as member
      await this.membershipService.addMember({
        projectId: payload.projectId,
        userId: payload.ownerId,
        role: "owner",
      });

      // 4. Emit readiness event
      await this.broker.emit("project.ready.identity", {
        projectId: payload.projectId,
        service: "identity",
        status: "ready",
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      // Emit failure event
      await this.broker.emit("project.ready.identity", {
        projectId: payload.projectId,
        service: "identity",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

### Phase 4: Remove Users Service

After creating Identity service:
1. Move all logic from users to identity
2. Delete services/users
3. Update bootstrap.module.ts

### Phase 5: Data Migration (if applicable)

```sql
-- Migration for project
ALTER TABLE project
ADD COLUMN readiness_status VARCHAR(20) NOT NULL DEFAULT 'ready';

-- For existing projects set to ready
UPDATE project SET readiness_status = 'ready' WHERE readiness_status = 'initializing';

-- Create readiness table
CREATE TABLE project_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, service)
);

-- For existing projects create records as ready
INSERT INTO project_readiness (project_id, service, status)
SELECT id, 'identity', 'ready' FROM project;
```

---

## Alternative Approaches to Readiness Status

### Approach 1: Polling (not recommended)

Project periodically queries services:
```typescript
const isIdentityReady = await broker.call("identity.isProjectReady", { projectId });
```

**Cons:**
- Additional load
- Delayed readiness detection
- Harder to scale

### Approach 2: Saga Orchestrator

A separate Saga service coordinates all steps:
```
Saga → Identity: "create organization"
Identity → Saga: "done"
Saga → Payments: "configure payments"
Payments → Saga: "done"
Saga → Project: "all ready"
```

**Pros:**
- Centralized management
- Easy to add rollback

**Cons:**
- Additional service
- Single point of failure

### Approach 3: Event Sourcing (current choice)

Choreography through events:
```
Project → event: project.created
Identity → event: project.ready.identity
Payments → event: project.ready.payments
Project listens to project.ready.* and aggregates status
```

**Pros:**
- Loosely coupled
- Easy to add new services
- No single point of failure

**Cons:**
- Eventual consistency
- Harder to debug

---

## GraphQL API for Readiness Status

```graphql
type Project {
  id: ID!
  name: String!
  slug: String!

  # Readiness status
  readinessStatus: ProjectReadinessStatus!
  readiness: [ServiceReadiness!]!
}

enum ProjectReadinessStatus {
  INITIALIZING   # Still initializing
  READY          # Fully ready
  DEGRADED       # Some services failed, but works
  FAILED         # Critical error
}

type ServiceReadiness {
  service: String!
  status: ServiceStatus!
  error: String
  updatedAt: DateTime!
}

enum ServiceStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}

# Query
type Query {
  project(id: ID!): Project
  projectReadiness(projectId: ID!): [ServiceReadiness!]!
}
```

---

## Configuration

```yaml
# config.yml
services:
  project:
    ports:
      admin_graphql: 10009
      metrics: 3036
    db:
      host: localhost
      port: 5432
      database: portal
      schema: portal
    # Casdoor REMOVED
    events:
      publish:
        - project.created
        - project.deleted
        - project.updated
      subscribe:
        - project.ready.*
    readiness:
      required_services:
        - identity
        # - payments  # enable later
        # - media     # enable later

  identity:
    ports:
      admin_graphql: 10020
      metrics: 3038
    db:
      host: localhost
      port: 5432
      database: portal
      schema: identity
    casdoor:
      endpoint: http://localhost:9011
      client_id: app-shopana-client-id
      client_secret: app-shopana-client-secret
      application_name: app-shopana
      certificate: cert-shopana
    events:
      publish:
        - project.ready.identity
        - identity.member.added
        - identity.member.removed
      subscribe:
        - project.created
        - project.deleted
```

---

## Execution Order

1. **Create events package** (`packages/shared-service-events`)
2. **Update Project schema** (add readiness)
3. **Create DB migration** for project_readiness
4. **Remove Casdoor from Project Repository**
5. **Implement ProjectCreateScript** with event emission
6. **Add ProjectReadySubscriber** to Project
7. **Create Identity service**
8. **Add ProjectCreatedSubscriber** to Identity
9. **Move logic from Users to Identity**
10. **Remove Users service**
11. **Update bootstrap.module.ts**
12. **E2E testing**

---

## Sequence Diagram

```
Client          Project         RabbitMQ        Identity        Casdoor
  │                │                │               │               │
  │ createProject  │                │               │               │
  ├───────────────►│                │               │               │
  │                │                │               │               │
  │                │ INSERT project │               │               │
  │                │ (initializing) │               │               │
  │                │                │               │               │
  │                │ INSERT readiness               │               │
  │                │ (identity:pending)             │               │
  │                │                │               │               │
  │                │ emit project.created           │               │
  │                │───────────────►│               │               │
  │                │                │               │               │
  │ ◄──────────────│                │ project.created               │
  │ { id, status:  │                │──────────────►│               │
  │   initializing}│                │               │               │
  │                │                │               │ createOrg     │
  │                │                │               │──────────────►│
  │                │                │               │               │
  │                │                │               │◄──────────────│
  │                │                │               │               │
  │                │                │ project.ready.identity        │
  │                │◄───────────────│◄──────────────│               │
  │                │                │               │               │
  │                │ UPDATE readiness               │               │
  │                │ (identity:ready)               │               │
  │                │                │               │               │
  │                │ UPDATE project │               │               │
  │                │ (status:ready) │               │               │
  │                │                │               │               │
  │                │ emit project.fully.ready       │               │
  │                │───────────────►│               │               │
  │                │                │               │               │
```

---

## Retry and Error Handling

### Retry Policy

```typescript
@RabbitSubscribe({
  exchange: "shopana.events",
  routingKey: "project.created",
  queue: "identity-project-created",
  queueOptions: {
    durable: true,
    deadLetterExchange: "shopana.dlx",
    deadLetterRoutingKey: "project.created.failed",
    arguments: {
      "x-message-ttl": 30000, // retry after 30 sec
    },
  },
})
```

### DLX Handling

```typescript
// Separate subscriber for failed messages
@RabbitSubscribe({
  exchange: "shopana.dlx",
  routingKey: "project.created.failed",
  queue: "identity-project-created-dlx",
})
async handleFailedProjectCreated(payload: ProjectCreatedPayload) {
  // Log the failure
  // Send alert notification
  // Optionally: mark project as failed
}
```

---

## Monitoring

### Metrics

```typescript
// Prometheus metrics
project_created_total{status="success|failed"}
project_readiness_status{project_id, service, status}
project_readiness_duration_seconds{service}
```

### Alerts

```yaml
# Project stuck in initializing for more than 5 minutes
- alert: ProjectInitializationStuck
  expr: |
    time() - project_created_timestamp{status="initializing"} > 300
  for: 1m
  labels:
    severity: warning
```
