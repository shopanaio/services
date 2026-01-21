# Workflows / Sagas / Events Architecture

This document describes the actual contracts and behavior of the durable workflows, sagas, and event dispatch system built on `@shopana/dbos`, `@shopana/shared-kernel`, and `services/events`.

---

## 1) System Components

**@shopana/dbos (packages/dbos)**
Durable layer on top of DBOS: workflow registry, idempotency, decorators, steps, errors, saga engine.

**@shopana/shared-kernel (packages/shared-kernel)**
Broker layer: `ServiceBroker`, `BrokerWorkflows`, `BrokerSaga`, `BrokerActions`, `EventHandlers`, `@EventHandler`, and Nest wiring.

**Events service (services/events)**
Event store, DLQ, scheduled cleanup, `EventDispatchWorkflow`, and actions `events.emit` / `events.emitAndWait`.

---

## 2) Architectural Decisions

### 2.1 DBOS as the durability layer

Decision: all workflows and sagas are built on DBOS workflow/step primitives.
Reason: deterministic replay, built-in retries, and observability without a custom orchestrator.
Consequence: `run(...)` entrypoint is mandatory, steps execute through DBOS (`WorkflowStep`/`runStep`).

### 2.2 Event dispatch as a durable workflow

Decision: event fan-out is executed by `EventDispatchWorkflow`.
Reason: guarantee delivery/retries per handler and isolate handler failures.
Consequence: producers are fire-and-forget, handlers are independent, the system converges via eventual consistency.

### 2.3 Dedicated events service

Decision: event store, DLQ, and scheduling live in `services/events`, not in bootstrap.
Reason: a single place for retention, monitoring, and event history.
Consequence: all services communicate with events via broker actions.

### 2.4 `@shopana/events` is types and utilities only

Decision: `@shopana/events` has no dependencies on DBOS/Kernel/Broker.
Reason: a clean contract and minimal dependencies for all services.
Consequence: any service can import types and idempotency utilities without runtime coupling.

### 2.5 Idempotency as first-class

Decision: workflowId is deterministically derived from `IdempotencyContext`, `emitKey` is required.
Reason: prevent duplicates at the workflow level and produce deterministic eventIds.
Consequence: repeated calls with the same context do not create duplicates; domain-level `ON CONFLICT DO NOTHING` reinforces it.

### 2.6 Registration via decorators and Broker\* base classes

Decision: workflows/sagas/actions/handlers register automatically.
Reason: remove manual registry code and enforce a single naming scheme (`service.name`).
Consequence: `BrokerWorkflows`, `BrokerSaga`, `BrokerActions`, `EventHandlers` are the standard extension points.

### 2.7 Event handlers as broker actions with retry metadata

Decision: a handler is an action `service.eventType` with retry policy from `@EventHandler`.
Reason: unify contracts and capture deterministic handler configuration at workflow step time.
Consequence: `EventDispatchWorkflow` can read retry policy via `ActionMetadata`.

### 2.8 Saga engine: AsyncLocalStorage + convention-based compensation

Decision: saga context stores only executed steps and their args.
Reason: minimal serialization and predictable compensation flow.
Consequence: compensations execute in reverse order via `compensate${PascalCase(step)}`.

### 2.9 DLQ as the required path for fatal errors

Decision: non-retryable errors and timeouts go to DLQ with upsert by `(event, handler)`.
Reason: do not block dispatch and preserve failure evidence for manual handling.
Consequence: dispatch always completes the workflow, errors are stored separately.

### 2.10 Real time without losing determinism

Decision: `timestamp` is set in the `persistEvent` step.
Reason: capture wall-clock time while keeping deterministic replay.
Consequence: workflow replay yields the same `timestamp`.

---

## 3) Contracts and Types

### 3.1 Idempotency (packages/dbos)

**IdempotencyContext**

```
Client:   { source: "client",   clientKey, tenantId, apiKeyId }
Workflow: { source: "workflow", workflowId, stepId, callId? }
Content:  { source: "content",  resourceId, operation, contentHash }
```

**buildIdempotencyKey(workflowName, ctx)**
Builds a deterministic key:

```
client:   client:{sha256(v1:client:tenantId:apiKeyId:workflowName:clientKey)}
workflow: workflow:{sha256(v1:workflow:workflowId:stepId:callId:workflowName)}
content:  content:{sha256(v1:content:resourceId:operation:contentHash:workflowName)}
```

`hashContent(payload)` uses canonical JSON + SHA256.

### 3.2 Workflows (packages/dbos)

**WorkflowModuleConfig**

```
{ databaseUrl, name?, schema? }
```

Used by `WorkflowModule.forRoot`, which:

1. configures DBOS (`systemDatabaseUrl`, `systemDatabaseSchemaName`),
2. launches DBOS on `onModuleInit`,
3. shuts down on `onModuleDestroy`.

**WorkflowRegistry**

- `register(qualifiedName, descriptor)` / `deregister(qualifiedName)`
- `start(qualifiedName, params, idempotencyCtx)` -> `WorkflowHandle`
- `run(qualifiedName, params, idempotencyCtx)` -> result
- `retrieve(workflowId)` -> `WorkflowHandle`

**WorkflowHandle**

```
{ workflowId, getResult(): Promise<TResult>, getStatus(): Promise<DBOSWorkflowStatus | null> }
```

**Important:** all workflows must have `run(...)` entrypoint.

**BaseWorkflow**

- auto-registers with `WorkflowRegistry` on init
- naming: `serviceName.workflowName`

**@Workflow(name, options?)**

```
options.idempotencyStrategy?: "client" | "workflow" | "content"
```

Adds metadata and wraps DBOS `workflow()`.

**@WorkflowStep(options?)** uses `runStep`:

```
options: { name?, timeoutMs?, critical?, retry?, retriesAllowed? }
retry: { maxAttempts, intervalSeconds, backoffRate }
```

Step behavior:

- step name: `step:<name>:<workflowId>`
- default timeout: 30 seconds
- timeout -> `StepTimeoutError` (non-retryable)
- `RetryableError` / `error.retryable=true` -> retry
- `FatalError` / `error.retryable=false` -> no retry
- `critical=false` -> errors do not stop workflow, step returns `undefined`

### 3.3 Errors (packages/dbos)

- `RetryableError` -> retryable=true
- `FatalError` -> retryable=false
- `StepTimeoutError` -> non-retryable
- `StepExecutionError` -> step context wrapper
- `OperationError` / `OperationResult` for unified results

### 3.4 Sagas (packages/dbos)

**@Saga(name, config?)**

```
config: {
  compensationRetryPolicy?: { maxAttempts, intervalSeconds, backoffRate }
  onCompensationExhausted?: (step, method, error, ctx) => void
}
```

Runs only inside a DBOS workflow context (`DBOS.workflowID` is required).

**@SagaStep(config?)**

```
config: { name?, retry?, timeoutMs? }
```

Compensation:

- compensation method: `compensate${PascalCase(stepMethod)}`
- if compensation exists -> step is critical
- if no compensation -> step is non-critical

**SagaResult**

```
{ success, status: "completed" | "compensated" | "failed", error?, failedStep?, compensated }
```

Behavior:

1. On error, compensation starts in reverse order.
2. Compensations run via `DBOS.runStep` with aggressive retry.
3. If compensation is exhausted -> `onCompensationExhausted`, status `failed`.

**BaseSaga**

- auto-registers with `WorkflowRegistry`
- naming: `serviceName.sagaName`

### 3.5 Broker contracts (packages/shared-kernel)

**ServiceBroker**

- `register(action, handler, metadata?)`
- `call(action, params?)`
- `emit(eventType, params)` -> calls `events.emit`
- `runWorkflow(workflow, params, idempotencyCtx)`
- `runSaga(sagaName, params, idempotencyCtx)`
- `hasAction(action)` / `hasWorkflow(workflow)`

**Important:** `runWorkflow` requires fully-qualified name (`service.workflow`).
`emit` injects `source` automatically from the service name.

**BrokerWorkflows / BrokerSaga**

- base classes for workflow/saga with `ServiceBroker` access
- automatically use broker `serviceName` for qualified names

**BrokerActions**

- base class for actions; methods with `@Action("name")` auto-register

**ActionMetadata**

```
{ retryPolicy?: { maxAttempts, intervalSeconds, backoffRate } }
```

**emit(eventType, params)**

```
params: {
  payload,
  context: { tenantId, userId?, correlationId?, causationId? },
  subject: { type, id },
  actor?: { type: "user" | "service" | "system", id? },
  emitKey
}
```

**EventHandlers**
Methods with `@EventHandler(eventType, { retry? })` register as actions
`serviceName.eventType`. Handler signature:

```
({ event }: { event: DomainEvent }) => Promise<EventHandlerResponse>
```

Default retry policy: `maxAttempts=3`, `intervalSeconds=1`, `backoffRate=2`.

### 3.6 Events contracts (packages/events)

**DomainEvent**

```
{
  eventId, eventType, timestamp, source, payload, emitKey,
  parentWorkflowId?, context, subject, actor?
}
context: { tenantId, userId?, correlationId, causationId? }
subject: { type, id }
actor?: { type: "user" | "service" | "system", id? }
```

**EventHandlerResponse**

```
{ success: true, data? }
{ success: false, error: { message, code?, retryable } }
```

Legacy `{ ok: true|false }` is deprecated and not supported
in `EventDispatchWorkflow`.

**EventDispatchResult**

```
{ eventId, eventType, status: "completed", servicesNotified, results }
```

**HandlerInvocationResult**

```
{ service, status: "success" | "failed", error?, durationMs }
```

**Events service actions**

- `events.emit(params)` -> `{ workflowId, eventId }`
- `events.emitAndWait(params)` -> `EventDispatchResult`
- `events.cleanupDLQ({ batchSize? })` -> `{ deleted }`
- `events.cleanupDomainEvents({ retentionDays?, batchSize? })` -> `{ deleted }`

---

## 4) Execution Flows

### 4.1 Start workflow / saga

1. Client or service builds `IdempotencyContext`.
2. `ServiceBroker.runWorkflow("service.workflow", params, ctx)`.
3. `WorkflowRegistry.start` builds `workflowId` via `buildIdempotencyKey`.
4. DBOS runs workflow and ensures deterministic replay.

### 4.2 Event emit -> dispatch

**Steps:**

1. Inside a workflow, call `broker.emit(eventType, params)`.
2. `events.emit` builds `DomainEvent` and deterministic IDs:
   - `dispatchWorkflowId = makeDispatchWorkflowId(parentWorkflowId, eventType, emitKey)`
   - `eventId = makeEventId(tenantId, dispatchWorkflowId)`
   - `correlationId` = from params or `makeDeterministicCorrelationId(parentWorkflowId)`
3. Start workflow `events.eventDispatch` with idempotencyCtx:
   `{ source: "workflow", workflowId: dispatchWorkflowId, stepId: "emit" }`.

**Constraints:**
`events.emit` must be called only from a workflow (`DBOS.workflowID` required);
`emitKey` is required and must be non-empty.

### 4.3 EventDispatchWorkflow

1. **persistEvent**
   - insert into `domain_events` with `onConflictDoNothing()`
   - stores `dispatch_started_at` and real `timestamp`, returns it to the event
2. **getAvailableHandlers**
   - service list from `getConfig().services`
   - handler exists if `broker.hasAction(service.eventType)`
3. **tryInvokeHandler** (parallel fan-out)
   - `DBOS.runStep(name=handler:<action>:<eventId>)`
   - response `success=true` -> ok
   - `success=false` + `retryable=false` -> DLQ, no retries
   - time out (`StepTimeoutError`) -> DLQ, no retries
   - `retryable=true` -> DBOS retry per policy
   - default timeout: 30 seconds
4. **updateEventStatus**
   - always `status="completed"`, details in `handlerResults`

### 4.4 DLQ

`sendToDLQ` does an upsert by `(event_id, handler_service, handler_action)`:

- `status="failed"`
- `attempts` = number of attempts
- `error`, `errorCode`
- `expiresAt` = now + 30 days

---

## 5) Data Tables (services/events)

### 5.1 domain_events

Key fields:

- `event_id` (PK), `event_type`, `source`, `timestamp`
- `tenant_id`, `user_id?`, `correlation_id`, `causation_id?`
- `emit_key`, `parent_workflow_id?`
- `status` ("dispatching" | "completed")
- `dispatch_started_at`, `dispatch_completed_at`
- `handler_results` (JSONB)
- `subject_type`, `subject_id`
- `actor_type`, `actor_id?`
- `payload_hash` (SHA256 of canonical JSON payload)
- `created_at`, `updated_at`

### 5.2 dead_letter_queue

Key fields:

- `id` (UUID PK)
- `event_id`, `event_type`
- `handler_service`, `handler_action`
- `error`, `error_code?`, `attempts`
- `tenant_id`, `correlation_id?`
- `status` ("failed" | "retried" | "resolved")
- `failed_at`, `expires_at`

Uniqueness: `(event_id, handler_service, handler_action)`.

---

## 6) Scheduled Jobs

**CleanupScheduler**

- Daily 03:00 -> `cleanupDLQ` (batch 1000)
- Daily 04:00 -> `cleanupDomainEvents` (retention 90 days, batch 5000)

---

## 7) Key Invariants

- All workflows/sagas auto-register and are named `service.name`.
- `ServiceBroker.runWorkflow` requires fully-qualified names.
- `events.emit` is allowed only inside a DBOS workflow.
- Idempotency is enforced by:
  1. deterministic `workflowId`,
  2. `onConflictDoNothing()` when writing `domain_events`.
- Handler errors do not block dispatch; results are stored and failures go to DLQ.
