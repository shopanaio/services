---
tags:
  - dbos
  - workflow
  - durable
  - decorator
related:
  - dbos/index
  - dbos/registry
  - dbos/errors
  - shared-kernel/base-classes
---
# Workflows

Durable workflows with step-based execution and automatic persistence.

## Overview

Workflows are durable functions that survive crashes and resume from the last checkpoint. Each step's result is persisted, and on replay, completed steps return their stored results without re-executing.

## BaseWorkflow

Abstract base class for simple durable workflows:

```typescript
import { BaseWorkflow, Workflow, WorkflowStep, WorkflowRegistry } from "@shopana/dbos";

@Injectable()
class StoreCreateWorkflow extends BaseWorkflow<StoreCreateInput, StoreCreateOutput> {
  constructor(
    registry: WorkflowRegistry,
    private readonly storeService: StoreService,
    private readonly emailService: EmailService,
  ) {
    super(registry, "project");  // Service name prefix
  }

  @Workflow("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateStoreId();
    await this.createStore(storeId, input);
    await this.sendWelcomeEmail(input.email);
    return { storeId };
  }

  @WorkflowStep()
  private async generateStoreId(): Promise<string> {
    return uuidv7();  // Durable: same ID on replay
  }

  @WorkflowStep({ retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 } })
  private async createStore(storeId: string, input: StoreCreateInput): Promise<void> {
    await this.storeService.create(storeId, input);
  }

  @WorkflowStep({ retriesAllowed: false })  // Fire-and-forget
  private async sendWelcomeEmail(email: string): Promise<void> {
    await this.emailService.send(email, "welcome");
  }
}
```

## @Workflow Decorator

Marks the `run()` method as workflow entry point:

```typescript
@Workflow(name: string, options?: WorkflowOptions)
```

### Options

```typescript
interface WorkflowOptions {
  idempotencyStrategy?: "client" | "workflow" | "content";
}
```

### Naming

The workflow is registered with qualified name: `{serviceName}.{name}`

```typescript
class StoreWorkflow extends BaseWorkflow<...> {
  constructor(registry: WorkflowRegistry) {
    super(registry, "project");  // Service name
  }

  @Workflow("storeCreate")  // Registered as "project.storeCreate"
  async run(input: Input): Promise<Output> { ... }
}
```

**Important:** The decorated method MUST be named `run` for `WorkflowRegistry.start()` to work.

## @WorkflowStep Decorator

Marks a method as a durable step within workflow:

```typescript
@WorkflowStep(options?: WorkflowStepOptions)
```

### Options

```typescript
interface WorkflowStepOptions {
  name?: string;              // Step name for logging
  timeoutMs?: number;         // Execution timeout (default: 30000)
  retry?: RetryPolicy;        // Retry configuration
  retriesAllowed?: boolean;   // Enable/disable retries (default: true)
}
```

### Step Behavior

| Behavior | Description |
|----------|-------------|
| **Timeout** | Non-retryable `StepTimeoutError` thrown on timeout |
| **Retryable errors** | Network/transient errors trigger DBOS automatic retry |
| **Fatal errors** | Business logic errors skip retry, fail immediately |
| **Durable** | Results persisted, skipped on workflow replay |

### Retry Configuration

```typescript
@WorkflowStep({
  retry: {
    maxAttempts: 5,        // Total attempts (1 = no retry)
    intervalSeconds: 2,    // Initial delay between retries
    backoffRate: 2,        // Exponential: 2s, 4s, 8s, 16s
  }
})
private async callExternalApi(): Promise<Response> {
  return fetch(apiUrl);
}
```

### Timeout Configuration

```typescript
@WorkflowStep({ timeoutMs: 60_000 })  // 60 second timeout
private async longRunningOperation(): Promise<void> {
  // Access abort signal
  const signal = getSignal();
  await fetch(url, { signal });
}
```

### Fire-and-Forget Steps

```typescript
@WorkflowStep({ retriesAllowed: false })
private async sendNotification(): Promise<void> {
  // Non-critical: failure doesn't affect workflow
  await this.notificationService.send(message);
}
```

## Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow: storeCreate                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: { name: "My Store", email: "user@example.com" }         │
│                                                                  │
│  Step 1: generateStoreId()                                       │
│    ├── Execute: uuidv7() → "store_abc123"                        │
│    └── Persist: step_result["generateStoreId"] = "store_abc123" │
│                                                                  │
│  Step 2: createStore("store_abc123", input)                      │
│    ├── Execute: storeService.create(...)                         │
│    └── Persist: step_result["createStore"] = void                │
│                                                                  │
│  Step 3: sendWelcomeEmail("user@example.com")                    │
│    ├── Execute: emailService.send(...)                           │
│    └── Persist: step_result["sendWelcomeEmail"] = void           │
│                                                                  │
│  Output: { storeId: "store_abc123" }                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Replay Behavior

When a workflow is replayed (after crash or restart):

```typescript
@Workflow("storeCreate")
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  // Step 1: Already completed → returns stored "store_abc123"
  const storeId = await this.generateStoreId();

  // Step 2: Already completed → skipped
  await this.createStore(storeId, input);

  // Step 3: NOT completed (crashed here) → executes now
  await this.sendWelcomeEmail(input.email);

  return { storeId };
}
```

**Key principle:** Steps must be deterministic. Same inputs → same outputs.

## Non-Deterministic Operations

Wrap non-deterministic operations in steps:

```typescript
// BAD: Non-deterministic outside step
@Workflow("example")
async run(input: Input): Promise<Output> {
  const id = uuidv7();  // Different on replay!
  await this.doSomething(id);
}

// GOOD: Non-deterministic inside step
@Workflow("example")
async run(input: Input): Promise<Output> {
  const id = await this.generateId();  // Same on replay
  await this.doSomething(id);
}

@WorkflowStep()
private async generateId(): Promise<string> {
  return uuidv7();  // Persisted, returns same value on replay
}
```

## Full Example

```typescript
import {
  BaseWorkflow,
  Workflow,
  WorkflowStep,
  WorkflowRegistry,
  RetryableError,
  FatalError,
} from "@shopana/dbos";
import { Injectable } from "@nestjs/common";

interface FileProcessInput {
  fileId: string;
  userId: string;
}

interface FileProcessOutput {
  thumbnailUrl: string;
  metadata: object;
}

@Injectable()
export class FileProcessWorkflow extends BaseWorkflow<FileProcessInput, FileProcessOutput> {
  constructor(
    registry: WorkflowRegistry,
    private readonly storage: StorageService,
    private readonly processor: ProcessorService,
    private readonly notifications: NotificationService,
  ) {
    super(registry, "media");
  }

  @Workflow("processFile")
  async run(input: FileProcessInput): Promise<FileProcessOutput> {
    // Step 1: Download file
    const file = await this.downloadFile(input.fileId);

    // Step 2: Extract metadata
    const metadata = await this.extractMetadata(file);

    // Step 3: Generate thumbnail
    const thumbnailUrl = await this.generateThumbnail(file, input.fileId);

    // Step 4: Notify user (non-critical)
    await this.notifyUser(input.userId, thumbnailUrl);

    return { thumbnailUrl, metadata };
  }

  @WorkflowStep({ timeoutMs: 60_000 })
  private async downloadFile(fileId: string): Promise<Buffer> {
    try {
      return await this.storage.download(fileId);
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        throw new FatalError("File not found", undefined, "FILE_NOT_FOUND");
      }
      throw new RetryableError("Storage unavailable", error);
    }
  }

  @WorkflowStep()
  private async extractMetadata(file: Buffer): Promise<object> {
    return this.processor.extractMetadata(file);
  }

  @WorkflowStep({
    retry: { maxAttempts: 3, intervalSeconds: 5, backoffRate: 2 }
  })
  private async generateThumbnail(file: Buffer, fileId: string): Promise<string> {
    const thumbnail = await this.processor.generateThumbnail(file);
    return this.storage.upload(`thumbnails/${fileId}`, thumbnail);
  }

  @WorkflowStep({ retriesAllowed: false })
  private async notifyUser(userId: string, thumbnailUrl: string): Promise<void> {
    await this.notifications.send(userId, {
      type: "FILE_PROCESSED",
      thumbnailUrl,
    });
  }
}
```

## Broker Integration

Use `BrokerWorkflows` from `@shopana/shared-kernel` for broker integration:

```typescript
import { BrokerWorkflows, Workflow, WorkflowStep, InjectBroker } from "@shopana/shared-kernel";

@Injectable()
class FileCleanupWorkflow extends BrokerWorkflows<string, CleanupResult> {
  constructor(@InjectBroker("media") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("fileCleanup")
  async run(fileId: string): Promise<CleanupResult> {
    await this.deleteFile(fileId);
    await this.notifyCleanup(fileId);
    return { cleaned: true };
  }

  @WorkflowStep()
  private async deleteFile(fileId: string) {
    await this.broker.call("storage.deleteFile", { fileId });
  }

  @WorkflowStep({ retriesAllowed: false })
  private async notifyCleanup(fileId: string) {
    await this.broker.call("notifications.send", { type: "file_cleaned", fileId });
  }
}
```

## Related

- [[dbos/index]] — Package overview
- [[dbos/sagas]] — Workflows with automatic compensation
- [[dbos/registry]] — Starting and monitoring workflows
- [[dbos/errors]] — Error handling and retry policies
- [[shared-kernel/base-classes]] — BrokerWorkflows integration
