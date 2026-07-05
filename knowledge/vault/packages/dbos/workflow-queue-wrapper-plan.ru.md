# План обновления workflow wrapper под DBOS queues

## Цель

Добавить поддержку актуального DBOS queue API в project-level workflow wrapper:

- `WorkflowRegistry.start()`;
- `WorkflowRegistry.run()`;
- `ServiceBroker.startWorkflow()`;
- `ServiceBroker.runWorkflow()`.

После изменения сервисный код должен уметь durably enqueue workflow через broker
wrapper, не вызывая `DBOS.startWorkflow(...)` напрямую ради queue options.

Первый consumer: async processing listing index actions через partitioned DBOS
queue `listing_index_actions`.

## DBOS API baseline

План ориентирован на новую DBOS TypeScript документацию, где:

- queue configuration хранится в DBOS system database;
- queue создается через `await DBOS.registerQueue(name, options)` после
  `DBOS.launch()`;
- `new WorkflowQueue(...)` является legacy in-memory API и не должен
  использоваться для новой реализации;
- workflow enqueue выполняется через `DBOS.startWorkflow(target, params)` с
  `queueName` и optional `enqueueOptions`;
- для object/configured-instance workflows используется method invocation:
  `await DBOS.startWorkflow(workflowInstance, params).run(params)`;
- для registered function workflows используется callable invocation:
  `await DBOS.startWorkflow(workflowFn, params)(params)`.

Документация DBOS:

- Queue management/reference:
  https://docs.dbos.dev/typescript/reference/queues
- Queue tutorial, partitioning, deduplication, singleton, priority, delay:
  https://docs.dbos.dev/typescript/tutorials/queue-tutorial

Important repository note:

- текущий lockfile содержит `@dbos-inc/dbos-sdk@4.7.9` для `@shopana/dbos`;
- в установленном SDK 4.7.9 `new WorkflowQueue(...)` еще не deprecated in-code,
  а `DBOS.registerQueue(...)`, `retrieveQueue(...)`, `deleteQueue(...)` и
  `duplicationPolicy` отсутствуют в installed `.d.ts`;
- перед кодовой реализацией нужно обновить `@dbos-inc/dbos-sdk` до версии, в
  которой есть documented persisted queue API. Без этого план нельзя
  реализовать типобезопасно.

## Текущее состояние

`WorkflowRegistry.start()` строит deterministic `workflowID` из
`IdempotencyContext` и вызывает:

```ts
const handle = await DBOS.startWorkflow(workflowInstance, { workflowID }).run(
  params,
);
```

`ServiceBroker.startWorkflow()` и `ServiceBroker.runWorkflow()` принимают только:

```ts
workflow: string;
params: TParams;
idempotencyCtx: IdempotencyContext;
```

Из-за этого caller не может передать DBOS scheduling options:

- `queueName`;
- `enqueueOptions.queuePartitionKey`;
- `enqueueOptions.deduplicationID`;
- `enqueueOptions.priority`;
- `enqueueOptions.delaySeconds`;
- `duplicationPolicy`;
- `timeoutMS`.

## Design principles

- Backward compatibility обязательна: существующие вызовы без options не должны
  менять поведение или workflow id format.
- Broker wrapper остается thin wrapper над `WorkflowRegistry`; queue semantics
  не должны расползаться в service actions.
- `workflowID` остается deterministic и строится через существующий
  `IdempotencyContext`, если caller не передал explicit override.
- Queue options относятся к DBOS scheduling, а business idempotency результата
  остается ответственностью доменного workflow/script.
- `startWorkflow()` возвращает handle/status после durable DBOS accept/enqueue,
  но не ждет workflow result.
- `runWorkflow()` может принимать те же options, но для queued workflows его
  использование должно быть осознанным: caller будет ждать final result.
- Public wrapper types не должны leak raw DBOS SDK types, кроме случаев, где это
  явно нужно для совместимости.

## Public types

Добавить в `@shopana/dbos` exported types:

```ts
export interface WorkflowQueueRateLimitOptions {
  limitPerPeriod: number;
  periodSec: number;
}

export type WorkflowQueueConflictResolution =
  | "update_if_latest_version"
  | "always_update"
  | "never_update";

export interface WorkflowQueueConfig {
  name: string;
  concurrency?: number;
  workerConcurrency?: number;
  rateLimit?: WorkflowQueueRateLimitOptions;
  priorityEnabled?: boolean;
  partitionQueue?: boolean;
  minPollingIntervalMs?: number;
  onConflict?: WorkflowQueueConflictResolution;
}

export interface WorkflowQueueEnqueueOptions {
  queuePartitionKey?: string;
  deduplicationID?: string;
  priority?: number;
  delaySeconds?: number;
}

export type WorkflowDuplicationPolicy = "reject" | "return-existing";

export interface WorkflowStartOptions {
  /**
   * Optional explicit workflow ID.
   *
   * If omitted, registry builds deterministic ID from IdempotencyContext.
   * Existing callers should keep relying on IdempotencyContext.
   */
  workflowId?: string;

  /**
   * DBOS queue name. When present, workflow is durably enqueued instead of
   * started as a normal immediate workflow.
   */
  queueName?: string;

  enqueueOptions?: WorkflowQueueEnqueueOptions;

  /**
   * DBOS queue duplicate workflow handling policy.
   *
   * "return-existing" requires queueName and enqueueOptions.deduplicationID.
   * It is not compatible with partitioned queues because DBOS does not support
   * deduplicationID together with queuePartitionKey.
   */
  duplicationPolicy?: WorkflowDuplicationPolicy;

  /**
   * DBOS workflow timeout in milliseconds.
   *
   * For queued workflows the timeout starts when the workflow is dequeued and
   * begins execution, not when it is enqueued.
   */
  timeoutMS?: number;
}
```

Naming rules:

- Keep wrapper field `workflowId`, but map it to DBOS `workflowID`.
- Keep public wrapper type names independent from raw DBOS SDK type names.
- Map wrapper options to DBOS SDK options inside `@shopana/dbos`.
- Do not include `undefined` keys in mapped DBOS params.

## `WorkflowModuleConfig` changes

Extend module config with persisted queue registration:

```ts
export interface WorkflowModuleConfig {
  databaseUrl: string;
  name?: string;
  schema?: string;
  queues?: WorkflowQueueConfig[];
}
```

Registration order:

1. call `DBOS.setConfig(...)`;
2. call `DBOS.launch()`;
3. for every configured queue call:

```ts
await DBOS.registerQueue(queue.name, {
  concurrency: queue.concurrency,
  workerConcurrency: queue.workerConcurrency,
  rateLimit: queue.rateLimit,
  priorityEnabled: queue.priorityEnabled,
  partitionQueue: queue.partitionQueue,
  minPollingIntervalMs: queue.minPollingIntervalMs,
  onConflict: queue.onConflict,
});
```

Rules:

- `queues` omitted or empty is a no-op.
- Queue registration is project infrastructure and belongs in
  `WorkflowModuleConfig`, not in feature action handlers.
- Default `onConflict` should be omitted so DBOS default behavior applies.
- If runtime queue tuning must be preserved, callers may configure
  `onConflict: "never_update"`.
- Do not use legacy `new WorkflowQueue(...)`.

## `WorkflowRegistry` changes

Extend signatures:

```ts
async start<TParams, TResult>(
  qualifiedName: string,
  params: TParams,
  idempotencyCtx: IdempotencyContext,
  options?: WorkflowStartOptions,
): Promise<WorkflowHandle<TResult>>;

async run<TParams, TResult>(
  qualifiedName: string,
  params: TParams,
  idempotencyCtx: IdempotencyContext,
  options?: WorkflowStartOptions,
): Promise<TResult>;
```

Implementation rules:

- Resolve workflow descriptor exactly as today.
- Build `workflowID` as:
  1. `options.workflowId`, if present;
  2. `buildIdempotencyKey(qualifiedName, idempotencyCtx)`, otherwise.
- Map wrapper options to DBOS `StartWorkflowParams`:

```ts
const startParams = mapWorkflowStartOptions(workflowID, options);
```

Expected DBOS params shape:

```ts
{
  workflowID,
  queueName,
  enqueueOptions: {
    queuePartitionKey,
    deduplicationID,
    priority,
    delaySeconds,
  },
  duplicationPolicy,
  timeoutMS,
}
```

- Start configured-instance workflows through the DBOS method proxy:

```ts
const handle = await DBOS.startWorkflow(workflowInstance, startParams).run(
  params,
);
```

- Preserve current `WorkflowHandle<TResult>` shape.
- Keep `workflowId` returned by the wrapper equal to the deterministic or
  explicit workflow ID passed to DBOS. For `"return-existing"`, verify during
  implementation whether DBOS can return a handle whose actual workflow ID
  differs from the requested ID; if yes, return the actual handle ID when the SDK
  exposes it.
- Add focused unit coverage around option mapping and forwarding with mocked
  DBOS APIs after the implementation phase. Do not run test/tsc during this
  planning-only update.

## Mapper behavior

Add a small internal mapper in `@shopana/dbos`, for example:

```ts
function mapWorkflowStartOptions(
  workflowID: string,
  options?: WorkflowStartOptions,
): DBOSStartWorkflowParams {
  // Build object without undefined keys.
}
```

Validation rules in mapper:

- Always include `workflowID`.
- If `duplicationPolicy === "return-existing"`, require:
  - `queueName`;
  - `enqueueOptions.deduplicationID`.
- Reject `enqueueOptions.queuePartitionKey` together with
  `enqueueOptions.deduplicationID`; DBOS does not support deduplication for
  partitioned queues.
- If `enqueueOptions.priority` is set, document that target queue must have
  `priorityEnabled: true`; allow DBOS to enforce actual queue configuration.
- If `queueName` is omitted, omit `enqueueOptions` unless DBOS documentation for
  the implemented SDK version explicitly supports non-queued enqueue options.

## `ServiceBroker` changes

Extend signatures:

```ts
async runWorkflow<TResult = unknown, TParams = unknown>(
  workflow: string,
  params: TParams,
  idempotencyCtx: IdempotencyContext,
  options?: WorkflowStartOptions,
): Promise<TResult>;

async startWorkflow<TParams = unknown>(
  workflow: string,
  params: TParams,
  idempotencyCtx: IdempotencyContext,
  options?: WorkflowStartOptions,
): Promise<{ workflowId: string; status: "started" }>;
```

Rules:

- Keep full workflow name validation through `assertFullyQualified`.
- Pass `options` through unchanged to `WorkflowRegistry.start()`.
- Do not duplicate DBOS option validation in `ServiceBroker`.
- Re-export `WorkflowStartOptions`, `WorkflowQueueConfig`,
  `WorkflowQueueEnqueueOptions`, `WorkflowQueueConflictResolution`,
  `WorkflowQueueRateLimitOptions`, and `WorkflowDuplicationPolicy` from
  `@shopana/shared-kernel`.

## Listing target usage

Configure listing service workflow module:

```ts
WorkflowModule.forRoot({
  databaseUrl: process.env.DBOS_DATABASE_URL!,
  name: "shopana-listing",
  queues: [
    {
      name: "listing_index_actions",
      partitionQueue: true,
      concurrency: 1,
      onConflict: "update_if_latest_version",
    },
  ],
});
```

Desired call shape from listing action handler:

```ts
await this.broker.startWorkflow(
  "listing.indexAction",
  {
    type: "syncSellableItem",
    params,
  },
  {
    source: "content",
    tenantId: params.storeId,
    resourceId: `${params.item.entityType}:${params.item.id}`,
    operation: "listing.syncSellableItem",
    contentHash: params.meta.idempotencyKey,
  },
  {
    queueName: "listing_index_actions",
    enqueueOptions: {
      queuePartitionKey: [
        params.storeId,
        params.item.entityType,
        params.item.id,
      ].join(":"),
    },
  },
);
```

Important listing note:

- Do not pass `deduplicationID` for this partitioned queue.
- Deterministic `workflowID` from `IdempotencyContext` remains the durable
  business idempotency key.
- `queuePartitionKey` controls per-item queue flow, not business result
  idempotency.
- If listing later needs singleton/dedup behavior, use a non-partitioned queue
  with `enqueueOptions.deduplicationID` and optionally
  `duplicationPolicy: "return-existing"`.

## Phased implementation

### Phase 0: DBOS SDK update

- Update `@dbos-inc/dbos-sdk` to a version that includes:
  - `DBOS.registerQueue`;
  - `DBOS.retrieveQueue`;
  - persisted `WorkflowQueue` returned by DBOS;
  - `RegisterQueueOptions.onConflict`;
  - `StartWorkflowParams.duplicationPolicy`;
  - `enqueueOptions.delaySeconds`.
- Do not manually edit changeset files. If a changeset is required, generate it
  through the project-approved npm flow.

### Phase 1: Type surface

- Update `packages/dbos/src/core/types.ts` with queue config and start option
  types.
- Export new types from `packages/dbos/src/index.ts`.
- Re-export new types from `packages/shared-kernel/src/index.ts`.

### Phase 2: Queue registration config

- Add `queues?: WorkflowQueueConfig[]` to `WorkflowModuleConfig`.
- Register queues after `DBOS.launch()` using `DBOS.registerQueue`.
- Keep empty/omitted `queues` as no-op.
- Do not introduce `WorkflowRegistry.registerQueue()` unless feature modules
  truly need dynamic registration later.

### Phase 3: Registry option forwarding

- Extend `WorkflowRegistry.start()` and `WorkflowRegistry.run()` signatures.
- Add internal mapper from `WorkflowStartOptions` to DBOS start params.
- Preserve exact current behavior when `options` is omitted.
- Keep configured-instance invocation through
  `DBOS.startWorkflow(workflowInstance, startParams).run(params)`.

### Phase 4: Broker option forwarding

- Extend `ServiceBroker.runWorkflow()` and `ServiceBroker.startWorkflow()`.
- Pass options through to registry.
- Keep return shape unchanged.

### Phase 5: Consumer integration

- Configure listing service with `listing_index_actions` queue.
- Replace direct DBOS queue usage in listing design with
  `broker.startWorkflow(..., options)`.
- Keep domain-level idempotency/revision state in listing, not in broker
  wrapper.

## Validation and error behavior

- Missing `WorkflowModule` keeps current error message.
- Missing workflow name keeps current registry lookup error.
- Invalid queue name or unsupported DBOS option should fail before returning
  `accepted`.
- Partitioned queue without `queuePartitionKey` should fail before returning
  `accepted`; DBOS also enforces this.
- `deduplicationID` on a partitioned queue should fail before returning
  `accepted`; DBOS documents that deduplication is not supported for partitioned
  queues.
- Duplicate workflow behavior:
  - default policy rejects DBOS queue duplicates with DBOS duplicate error;
  - `"return-existing"` returns an existing workflow handle for the same
    queue/deduplication ID.
- `deduplicationID` is an active queue duplicate guard, not durable business
  idempotency.

## Acceptance checklist

- [ ] DBOS SDK is updated to a version with persisted queue APIs.
- [ ] Existing `broker.runWorkflow(...)` calls compile without changes.
- [ ] Existing `broker.startWorkflow(...)` calls compile without changes.
- [ ] `WorkflowModuleConfig.queues` registers DBOS queues at service startup
      after `DBOS.launch()`.
- [ ] No code uses legacy `new WorkflowQueue(...)` for new queue registration.
- [ ] `WorkflowRegistry.start()` forwards `queueName`, `enqueueOptions`,
      `duplicationPolicy` and `timeoutMS` to `DBOS.startWorkflow`.
- [ ] `ServiceBroker.startWorkflow()` accepts queue options and returns only
      after DBOS durable accept/enqueue.
- [ ] `ServiceBroker.runWorkflow()` accepts the same options and waits for final
      result.
- [ ] `@shopana/shared-kernel` re-exports all new public option types.
- [ ] Listing async action processing can enqueue item-partitioned workflows
      without direct `DBOS.startWorkflow` usage in action handlers.
- [ ] Listing partitioned queue usage does not pass `deduplicationID`.
- [ ] No changeset file is edited manually.
- [ ] Verification follows project rules: do not run `test` or `tsc`; use build
      only when a new code version needs verification.

## Open questions

- Which exact `@dbos-inc/dbos-sdk` version should the repo target for persisted
  queues? Implementation must confirm installed `.d.ts` before coding.
- Should service bootstrap expose first-class `workflows.queues`, or is direct
  `WorkflowModule.forRoot({ queues })` enough for the first implementation?
- Should the wrapper return actual DBOS handle workflow ID for
  `"return-existing"` if it differs from the requested `workflowID`?
- Does listing need only partitioned per-item flow control, or also singleton
  deduplication semantics? DBOS does not allow both in one queue start call.
