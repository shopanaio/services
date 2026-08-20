# Listing Index Action Scripts Plan

## Цель

Документ фиксирует application-layer contract для обработки broker actions:

- `listing.syncSellableItem`
- `listing.syncSellableItems`
- `listing.deleteSellableItem`

Action handlers принимают публичный snapshot contract, валидируют durable принятие work и делегируют
физическое обновление listing index в scripts через DBOS workflow/step execution.

План намеренно описывает границы, ordering, idempotency и DBOS API usage. Он не является
низкоуровневой реализацией SQL методов.

## Основные инварианты

- Broker action handlers не пишут physical listing index tables напрямую.
- Broker action возвращает `accepted` только после успешного durable enqueue в DBOS queue.
- DBOS `@Workflow` body не выполняет внешние эффекты. В нем разрешены только deterministic branching
  и вызов durable step.
- Все repository calls, `Kernel.getInstance()`, `kernel.runScript(...)`, чтение config/defaults,
  `Date`, `now()`, UUID и любые другие side effects находятся внутри `@WorkflowStep` или controlled
  internal script runner.
- Prepare DBOS steps не выполняют physical listing index writes. Они валидируют, нормализуют и
  строят immutable write input.
- Единственный DBOS write step вызывает один transactional script, который внутри одной item-level
  transaction принимает final revision decision, выделяет doc ids, выполняет physical writes и
  обновляет latest state.
- DBOS step может быть повторно выполнен после crash, если step result еще не persisted. Поэтому
  физические writes должны быть idempotent на database уровне.
- `syncSellableItem` принимает полный snapshot. Partial patch semantics нет.
- `sourceSequence` монотонен для ключа `storeId + entityType + itemId`.
- Public `meta.idempotencyKey` не обязан быть уникальным между items batch. Для item workflows
  используется item-scoped `effectiveIdempotencyKey`.
- Старая revision возвращает `ignored_stale` без изменения physical index.
- Повтор same-revision work не должен приводить к повторному write amplification; final guard
  выполняется через latest item state под item lock.
- Все physical index writes выполняются внутри одной database transaction на item или на controlled
  batch chunk.
- Repository layer остается source-agnostic: он принимает нормализованные doc ids, value keys, sort
  rows и price rows.

## Термины

`itemKey`:

```ts
type ListingIndexItemKey = {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
};
```

`effectiveIdempotencyKey`:

- для single item action и для item внутри batch всегда строится одним helper-ом как stable hash от
  `meta.idempotencyKey + storeId + entityType + itemId + actionType + sourceSequence`;
- используется в DBOS workflow identity и latest-state diagnostics;
- не должен строиться только из raw/batch-level `meta.idempotencyKey`.
- включает `sourceSequence`, чтобы разные revisions одного item не конкурировали за один DBOS
  workflow id даже при reused/batch-level `meta.idempotencyKey`;
- не включает полный snapshot/delete payload. Payload-level conflict detection остается
  responsibility latest-state checks.

`payloadHash`:

- canonical hash публичного action payload, включая action type, `storeId`, item identity,
  `sourceSequence` и snapshot/delete payload;
- нужен для диагностики и conflict detection при повторном использовании idempotency key с другим
  payload.

## DBOS execution model

### Queue registration

Listing service регистрирует одну DBOS queue:

```ts
WorkflowModule.forRoot({
  queues: [
    {
      name: "listing_index_actions",
      partitionQueue: true,
      concurrency: 1,
      workerConcurrency: 50,
      onConflict: "update_if_latest_version",
    },
  ],
});
```

Правила:

- Queue регистрируется DBOS wrapper-ом после `DBOS.launch()` на startup listing service.
- `partitionQueue: true` обязателен.
- `concurrency: 1` означает последовательное выполнение внутри одного logical partition.
- `workerConcurrency` ограничивает количество одновременно исполняемых listing index workflows на
  process и должен быть deployment/config параметром.
- Partition key всегда item-scoped:

```ts
const queuePartitionKey = [storeId, entityType, itemId].join(":");
```

- Для миллиона products не создается миллион persistent queues. Partition key хранится в queued
  workflow rows DBOS system tables.
- Риск роста database связан с количеством workflow executions/history. Нужна DBOS workflow history
  retention policy для completed/failed listing index workflows.

### Enqueue через ServiceBroker

Action handlers используют только `broker.startWorkflow(...)`. Прямой вызов
`DBOS.startWorkflow(...)` из listing action handlers запрещен.

`IdempotencyContext` для index workflows строится только через общий helper, чтобы single и batch
paths получали один и тот же deterministic DBOS `workflowID`:

```ts
import { hashContent, type IdempotencyContext } from "@shopana/shared-kernel";

type ListingIndexActionType = "syncSellableItem" | "deleteSellableItem";

function buildListingIndexEffectiveIdempotencyKey(input: {
  rawIdempotencyKey: string;
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
  sourceSequence: number;
}): string {
  return hashContent({
    v: 1,
    storeId: input.storeId,
    entityType: input.entityType,
    itemId: input.itemId,
    actionType: input.actionType,
    sourceSequence: input.sourceSequence,
    rawIdempotencyKey: input.rawIdempotencyKey,
  });
}

function buildListingIndexWorkflowIdempotencyContext(input: {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
  effectiveIdempotencyKey: string;
}): IdempotencyContext {
  return {
    source: "content",
    storeId: input.storeId,
    resourceId: `${input.entityType}:${input.itemId}`,
    operation: `listing.${input.actionType}`,
    contentHash: input.effectiveIdempotencyKey,
  };
}

function buildListingIndexWorkflowName(
  actionType: ListingIndexActionType,
): "listing.syncSellableItemIndex" | "listing.deleteSellableItemIndex" {
  return actionType === "syncSellableItem"
    ? "listing.syncSellableItemIndex"
    : "listing.deleteSellableItemIndex";
}
```

Почему именно так:

- `WorkflowRegistry.start()` вызывает `buildIdempotencyKey(qualifiedWorkflow, idempotencyCtx)`;
- для `source: "content"` DBOS workflow identity строится из `storeId`, `resourceId`, `operation`,
  `contentHash` и qualified workflow name;
- `storeId = storeId` дает project-level isolation;
- `resourceId = entityType:itemId` делает workflow identity item-scoped;
- `operation = listing.${actionType}` разделяет sync и delete при одном external idempotency key;
- `contentHash` должен получать item-scoped `effectiveIdempotencyKey`, а не raw
  `meta.idempotencyKey` и не `payloadHash`;
- `content` не передается, потому что workflow identity должна зависеть от acceptance idempotency
  key и `sourceSequence`, а не от полного snapshot payload. Payload conflict detection выполняется
  отдельно через `payloadHash` в database latest state.

```ts
const sourceSequence =
  queuedAction.type === "syncSellableItem"
    ? queuedAction.params.item.sourceSequence
    : queuedAction.params.sourceSequence;

const effectiveIdempotencyKey = buildListingIndexEffectiveIdempotencyKey({
  rawIdempotencyKey: queuedAction.params.meta.idempotencyKey,
  storeId,
  entityType,
  itemId,
  actionType: queuedAction.type,
  sourceSequence,
});

const idempotencyCtx = buildListingIndexWorkflowIdempotencyContext({
  storeId,
  entityType,
  itemId,
  actionType: queuedAction.type,
  effectiveIdempotencyKey,
});

await this.broker.startWorkflow(
  buildListingIndexWorkflowName(queuedAction.type),
  {
    ...queuedAction,
    effectiveIdempotencyKey,
    payloadHash,
  },
  idempotencyCtx,
  {
    queueName: "listing_index_actions",
    enqueueOptions: {
      queuePartitionKey,
    },
    timeoutMS: LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
  },
);
```

Правила:

- `accepted` возвращается только после успешного `broker.startWorkflow(...)`, либо после duplicate
  workflow conflict, который доказал, что deterministic workflow для того же
  `storeId + entityType + itemId + actionType + sourceSequence + effectiveIdempotencyKey` уже
  durably accepted.
- Если process crash произошел после `broker.startWorkflow(...)`, но до response, следующий
  same-revision retry может получить DBOS duplicate workflow conflict. В этом случае helper сверяет
  deterministic workflow identity и возвращает `accepted`.
- Если DBOS enqueue завершился retryable infrastructure error до durable accept, same-revision retry
  повторяет `broker.startWorkflow(...)`.
- `resourceId` всегда item-scoped.
- `operation` включает action type, чтобы sync и delete не конфликтовали при одинаковом idempotency
  key.
- Workflow name зависит от action type:
  - `syncSellableItem` запускает `listing.syncSellableItemIndex`;
  - `deleteSellableItem` запускает `listing.deleteSellableItemIndex`.
- `contentHash` получает `effectiveIdempotencyKey`, а не raw batch key.
- Текущая заготовка action handler, которая передает `params.meta.idempotencyKey` напрямую в
  `contentHash`, должна быть заменена на helper выше.
- Explicit `options.workflowId` можно передать только если он строится тем же helper-ом из
  `storeId + entityType + itemId + actionType + sourceSequence + effectiveIdempotencyKey`.
- `enqueueOptions.queuePartitionKey` используется всегда.
- `enqueueOptions.deduplicationID` не используется для этой queue.
- `duplicationPolicy: "return-existing"` не используется для этой queue, потому что актуальный
  `WorkflowRegistry` требует `deduplicationID` для `"return-existing"`, а `deduplicationID`
  несовместим с `queuePartitionKey`.
- Если DBOS SDK возвращает duplicate workflow conflict для уже принятого deterministic workflow id,
  action handler не должен слепо трактовать это как `already accepted`.
- Duplicate workflow conflict обрабатывается отдельным helper-ом поверх `broker.startWorkflow(...)`,
  а не через `deduplicationID`:
  - helper строит тот же `effectiveIdempotencyKey` из raw idempotency key, item identity, action
    type и `sourceSequence`;
  - helper строит тот же `payloadHash` для final-state checks;
  - duplicate workflow conflict for the same deterministic workflow id is treated as proof of
    durable DBOS accept for the same item revision;
- Duplicate workflow conflict не сравнивает полный payload. Если тот же item/action/revision
  accepted с другим payload, enqueue path может вернуть `accepted`; payload mismatch должен быть
  выявлен final write decision под item lock через `payloadHash`.
- DBOS workflow identity защищает scheduling по item revision, а payload conflict detection остается
  database-level contract.
- Handler must not rely on final state for enqueue idempotency. Final state may appear much later,
  after worker execution.

### Workflow bodies

Listing service регистрирует два typed workflows и enqueue-ит оба в одну DBOS queue:

- `listing.syncSellableItemIndex`;
- `listing.deleteSellableItemIndex`.

Оба workflow содержат только deterministic orchestration. Workflow body не пишет индекс. Он вызывает
один или несколько prepare steps, затем ровно один transactional write step. В workflow body нет
ветвления по `action.type`: sync и delete paths разделены на уровне workflow name и input types.

```ts
type ListingIndexQueuedSyncAction = {
  type: "syncSellableItem";
  params: Listing.SyncSellableItemParams;
  effectiveIdempotencyKey: string;
  payloadHash: string;
};

type ListingIndexQueuedDeleteAction = {
  type: "deleteSellableItem";
  params: Listing.DeleteSellableItemParams;
  effectiveIdempotencyKey: string;
  payloadHash: string;
};

type ListingPreparedSyncWriteAction = {
  action: ListingPreparedSyncAction;
  syncWriteModel: ListingSyncWriteModel;
};

type ListingPreparedDeleteWriteAction = {
  action: ListingPreparedDeleteAction;
};

class ListingSyncSellableItemIndexWorkflow extends ListingIndexWorkflowBase {
  @Workflow("syncSellableItemIndex")
  async run(action: ListingIndexQueuedSyncAction): Promise<Listing.ListingUpdateResult> {
    const prepared = await this.stepPrepareSyncIndexAction(action);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const syncWriteModel = await this.stepBuildSyncWriteModel({
      action: prepared.action,
    });

    return this.stepWriteSyncIndexAction({
      action: prepared.action,
      syncWriteModel,
    });
  }
}

class ListingDeleteSellableItemIndexWorkflow extends ListingIndexWorkflowBase {
  @Workflow("deleteSellableItemIndex")
  async run(action: ListingIndexQueuedDeleteAction): Promise<Listing.ListingUpdateResult> {
    const prepared = await this.stepPrepareDeleteIndexAction(action);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    return this.stepWriteDeleteIndexAction({
      action: prepared.action,
    });
  }
}
```

Workflow body rules:

- Не вызывает `Kernel.getInstance()`.
- Не вызывает repositories.
- Не вызывает `kernel.runScript(...)`.
- Не читает config/database/cache/network.
- Не создает timestamps, UUID или random values.
- Может строить deterministic write model только из normalized action и persisted step inputs. Write
  model не содержит allocated doc ids.
- Не содержит physical index mapping rules.
- Не вызывает repositories или scripts вне DBOS steps.
- Может ветвиться только на основании:
  - persisted result предыдущего `@WorkflowStep`.
- Sync workflow всегда вызывает `buildSyncWriteModel`.
- Delete workflow никогда не вызывает `buildSyncWriteModel`.

### Workflow steps для side effects

Фактическая обработка action в каждом workflow разбивается на prepare steps и ровно один write step.
Prepare steps не пишут physical index tables. Write step должен быть safe для повторного выполнения,
если process crash произошел после database commit, но до DBOS step result persistence.

```ts
abstract class ListingIndexWorkflowBase extends BrokerWorkflows {
  @WorkflowStep({
    name: "prepareListingSyncIndexAction",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepPrepareSyncIndexAction(
    action: ListingIndexQueuedSyncAction,
  ): Promise<ListingIndexPreparedSyncAction> {
    const kernel = Kernel.getInstance();
    const scriptContext = buildRunScriptContext(action);

    return kernel.runScript(
      ListingPrepareIndexActionScript,
      toRuntimeActionParams(action),
      scriptContext,
    );
  }

  @WorkflowStep({
    name: "prepareListingDeleteIndexAction",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepPrepareDeleteIndexAction(
    action: ListingIndexQueuedDeleteAction,
  ): Promise<ListingIndexPreparedDeleteAction> {
    const kernel = Kernel.getInstance();
    const scriptContext = buildRunScriptContext(action);

    return kernel.runScript(
      ListingPrepareIndexActionScript,
      toRuntimeActionParams(action),
      scriptContext,
    );
  }

  @WorkflowStep({
    name: "buildListingSyncWriteModel",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 3,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepBuildSyncWriteModel(input: {
    action: ListingPreparedSyncAction;
  }): Promise<ListingSyncWriteModel> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingBuildSyncWriteModelScript,
      input,
      buildRunScriptContext(input.action),
    );
  }

  @WorkflowStep({
    name: "writeListingSyncIndexAction",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepWriteSyncIndexAction(
    input: ListingPreparedSyncWriteAction,
  ): Promise<Listing.ListingUpdateResult> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingWriteIndexActionScript,
      input,
      buildRunScriptContext(input.action),
    );
  }

  @WorkflowStep({
    name: "writeListingDeleteIndexAction",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepWriteDeleteIndexAction(
    input: ListingPreparedDeleteWriteAction,
  ): Promise<Listing.ListingUpdateResult> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingWriteIndexActionScript,
      input,
      buildRunScriptContext(input.action),
    );
  }
}
```

Step rules:

- Все side effects находятся в steps или ниже в scripts/repositories.
- Step result persisted DBOS-ом. На workflow replay completed step не должен повторно выполнять
  writes.
- Если process crash произошел после database commit, но до DBOS step result persistence, DBOS может
  повторно выполнить write step. Поэтому `writeListingSyncIndexAction` и
  `writeListingDeleteIndexAction` обязаны иметь database guard по latest item state.
- `prepare` step:
  - валидирует public contract;
  - строит/проверяет `RunScriptContext`;
  - если нужно продолжать, возвращает нормализованный immutable action.
- `buildSyncWriteModel` step:
  - используется только для sync;
  - использует только normalized action;
  - не читает database или mutable storefront state;
  - строит canonical versioned `write_model_json` и `write_model_hash`;
  - write model содержит source ids, value keys, sort rows и price rows, но не содержит allocated
    `product_doc_id` или `variant_doc_id`;
  - повтор step возвращает DBOS-persisted result, если step result уже сохранен.
- Write DBOS steps:
  - реализуется двумя typed DBOS steps: `writeListingSyncIndexAction` и
    `writeListingDeleteIndexAction`;
  - каждый workflow вызывает ровно один write DBOS step;
  - оба write steps вызывают один общий transactional script;
  - открывает одну item-level transaction для final physical writes;
  - первым write-side DB operation вызывают `lockByItem`;
  - повторно проверяют current state/source revision;
  - для `noop`/`ignored_stale` возвращают final result без physical writes;
  - для sync `apply` выделяет/читает doc ids, создает bootstrap product row, применяет write model,
    удаляет stale variants и обновляет latest item state атомарно;
  - для delete `apply` читает current doc ids, удаляет dependent rows, обновляет latest deleted
    state атомарно.
- Retry policy включается явно. Default DBOS wrapper policy без `retry` означает no retry.
- Retryable infrastructure errors должны быть thrown как retryable errors или классифицироваться
  wrapper-ом как retryable.
- Validation/project mismatch/domain conflicts не должны превращаться в transient workflow retry.
- Public broker contract сейчас допускает final `ListingUpdateResult` только со статусами `applied`,
  `noop`, `ignored_stale` и `accepted`. Поэтому `IDEMPOTENCY_CONFLICT` и `REVISION_CONFLICT` не
  возвращаются как `ListingUpdateResult`.
- Internal conflict reasons:
  - `IDEMPOTENCY_CONFLICT`;
  - `REVISION_CONFLICT`.
- Public mapping для action handler/controlled runner:
  - `UNSUPPORTED_CONTRACT_VERSION` -> `ListingUpdateError.code = "UNSUPPORTED_CONTRACT_VERSION"`;
  - `PROJECT_MISMATCH` -> `ListingUpdateError.code = "PROJECT_MISMATCH"`;
  - `VALIDATION_FAILED`, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT` ->
    `ListingUpdateError.code = "VALIDATION_FAILED"`;
  - infrastructure failure после retry exhaustion ->
    `ListingUpdateError.code = "TRANSIENT_UNAVAILABLE"` или `"INTERNAL_ERROR"` согласно runtime
    classification.
- Для public broker action такой error path должен reject/throw typed `ListingUpdateError` metadata,
  а не возвращать successful result object.
- DBOS step для conflict/error path не выполняет physical writes.
- Controlled internal runner видит тот же mapped `ListingUpdateError`, что и public enqueue/action
  path.
- Workflow error без mapped `ListingUpdateError` разрешен только для infrastructure failures после
  исчерпания retry или data corruption states.
- Step timeout считается non-retryable. Timeout должен быть достаточно большим для item transaction,
  но не использоваться как основной механизм отмены.

### RunScriptContext

`RunScriptContext` строится внутри DBOS step из action params:

- `storeId = params.storeId`;
- `requestId = params.meta.source.requestId ?? params.meta.operationId`;
- `locale/defaultLocale` для sync берутся из snapshot content;
- для delete locale/defaultLocale должны быть переданы в delete contract или прочитаны внутри step
  из service config/defaults;
- `organizationId` и `userId` заполняются только если доступны в source metadata.

Repositories внутри scripts должны видеть `this.storeId = params.storeId`. Project mismatch
завершается validation result до physical writes.

## Action handler contract

```ts
class ListingBrokerActions extends BrokerActions {
  @Action("syncSellableItem")
  syncSellableItem(
    params: Listing.SyncSellableItemParams
  ): Promise<Listing.SyncSellableItemResult>;

  @Action("syncSellableItems")
  syncSellableItems(
    params: Listing.SyncSellableItemsParams
  ): Promise<Listing.SyncSellableItemsResult>;

  @Action("deleteSellableItem")
  deleteSellableItem(
    params: Listing.DeleteSellableItemParams
  ): Promise<Listing.DeleteSellableItemResult>;
}
```

Responsibilities:

- `syncSellableItem` ставит item-scoped `ListingSyncSellableItemIndexWorkflow` в
  `listing_index_actions`.
- `deleteSellableItem` ставит item-scoped `ListingDeleteSellableItemIndexWorkflow` в ту же queue.
- `syncSellableItems` fan-out-ит items в отдельные queued item workflows.
- Handler не строит write model.
- Handler не вызывает index repositories.
- Handler не возвращает `accepted`, пока item workflow не accepted durably.

### Controlled internal execution

Прямой `kernel.runScript(...)` разрешен только для controlled internal backfill/repair tools, а не
как alternate execution path публичного broker action.

Rules:

- Internal runner обязан строить тот же `effectiveIdempotencyKey` и `payloadHash`, что DBOS enqueue
  path.
- Internal runner вызывает тот же step-oriented executor: `ListingPrepareIndexActionScript`,
  optional `ListingBuildSyncWriteModelScript`, затем один `ListingWriteIndexActionScript`.
- Internal runner получает final result: `applied`, `noop` или `ignored_stale`.
- Internal runner не обходит `lockByItem`, revision checks или transaction ownership.
- Для high-volume event stream используется только DBOS queue path.

### Batch enqueue

Batch enqueue не должен быть одним большим queued workflow.

Rules:

- Validator rejects duplicate item refs in one batch before enqueue attempts.
- For each item handler builds:
  - item-scoped `effectiveIdempotencyKey`;
  - item-scoped `payloadHash`;
  - item-scoped queue partition key.
- Enqueue может выполняться concurrently, но public result строится после completion всех enqueue
  attempts.
- Если часть items accepted, а часть enqueue attempts failed, handler возвращает `partial` согласно
  текущему public contract: `SyncSellableItemsResult.results` остается `ListingUpdateResult[]` и
  содержит только items, для которых durable enqueue завершился accepted или same-revision
  already-accepted duplicate detection.
- Failed enqueue attempts не добавляются в `results` как `{ kind: "error" }`, потому что такой union
  отсутствует в `@shopana/broker-types`. Handler должен логировать failed item refs с
  `ListingUpdateError` metadata и завершать batch response со `status: "partial"`.
- Если producer должен получать per-item errors в response body, это отдельное breaking/non-breaking
  изменение публичного `SyncSellableItemsResult` contract и `packages/broker-types`, а не часть
  этого implementation plan.
- Retry batch после partial enqueue safe: уже accepted items распознаются по deterministic workflow
  identity как same-revision already accepted, а payload metadata сверяется позже через final-state
  checks.

## Database idempotency model

DBOS workflow identity защищает durable scheduling. Database idempotency защищает enqueue payload
conflict detection, physical side effects и stable final result.

Для этого используется latest item state.

### `listing_index_item_state`

Latest state хранит последнюю принятую revision по item:

```sql
CREATE TABLE listing.listing_index_item_state (
  store_id uuid NOT NULL,
  entity_type varchar(32) NOT NULL,
  item_id uuid NOT NULL,
  source_sequence integer NOT NULL,
  payload_hash text NOT NULL,
  lifecycle_status varchar(32) NOT NULL,
  last_effective_idempotency_key text NOT NULL,
  last_operation_id text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (store_id, entity_type, item_id)
);
```

Constraints:

- `source_sequence >= 0`.
- `lifecycle_status IN ('indexed', 'deleted')`.
- `(store_id, entity_type, item_id)` is the canonical latest-state key.
- Эта table обновляется только после successful apply/delete decision.
- Stale/noop decisions не должны откатывать latest state назад.

## Idempotency and revision decision

Fast-path decision may be read during prepare, but authoritative decision is made under item lock in
the single final write step. The final decision that allows physical writes is made inside the same
transaction as those physical writes.

Decision order:

1. `lockByItem(itemKey)`.
2. Load latest `listing_index_item_state` under `SELECT ... FOR UPDATE` if row exists.
3. If no latest state exists, `apply`.
4. If `incoming.sourceSequence < current.sourceSequence`, return `ignored_stale`. Do not update item
   state.
5. If `incoming.sourceSequence === current.sourceSequence`:
   - if `incoming.payloadHash === current.payloadHash`, return `noop`;
   - otherwise return non-retryable revision conflict.
6. If `incoming.sourceSequence > current.sourceSequence`, apply sync/delete.

For `deleteSellableItem`:

- A new delete revision is applied even if physical product rows are already absent.
- Delete writes `lifecycle_status = 'deleted'` to latest state.
- Same revision delete with matching payload returns `noop`.
- Older delete returns `ignored_stale`.

## Transaction ownership

### `lockByItem`

`lockByItem` must serialize first action for an item even when latest-state row does not exist yet.

Contract:

- Выполняется только внутри transaction.
- Первым write-side DB operation берет transaction-scoped item lock по
  `storeId + entityType + itemId`.
- Recommended implementation: PostgreSQL advisory transaction lock `pg_advisory_xact_lock` от stable
  hash canonical key.
- После advisory lock читает existing `listing_index_item_state` row через `SELECT ... FOR UPDATE`.
- Если state row отсутствует, возвращает `null`, но item уже locked до конца transaction.
- Не вставляет placeholder state rows ради lock.
- Все sync/delete/batch paths используют один `lockByItem`; ad-hoc locks в scripts запрещены.

### Single item sync step sequence

```ts
const prepared = await stepPrepareSyncIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

const syncWriteModel = await stepBuildSyncWriteModel({
  action: prepared.action,
});

return stepWriteSyncIndexAction({
  action: prepared.action,
  syncWriteModel,
});
```

Rules:

- `prepare` and `buildSyncWriteModel` do not perform physical index writes.
- `buildSyncWriteModel` must not use mutable database state.
- `buildSyncWriteModel` returns the canonical versioned `write_model_json` together with
  `write_model_hash`. On workflow replay after DBOS persisted the step result, DBOS returns the
  stored write model without re-executing the step.
- `writeListingSyncIndexAction` calls `lockByItem` as the first write-side DB operation for item.
- Decision is made under lock in final write step even if prepare returned a preliminary `apply`
  decision.
- `noop` and `ignored_stale` do not execute physical index writes.
- Physical writes and final state writes are atomic inside `stepWriteSyncIndexAction`.
- If any physical write fails, item state is rolled back.
- `product_doc_id` and `variant_doc_id` allocation happens inside `ListingWriteIndexActionScript`
  after `lockByItem` and final revision decision. Repeating the write step returns existing ids from
  physical index rows before allocating new ids.
- Bootstrap product row is created before variant rows.
- Projection blocks refresh happens after variant row/membership/runtime price writes and before
  commit.

### Delete step transactions

```ts
const prepared = await stepPrepareDeleteIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

return stepWriteDeleteIndexAction({
  action: prepared.action,
});
```

Delete final commit:

- Runs inside `ListingWriteIndexActionScript`.
- Opens one item-level transaction.
- Calls `lockByItem` as the first write-side DB operation for item.
- Rechecks current state/source revision under lock.
- For `noop`/`ignored_stale`, returns final result without physical deletes.
- For `apply`, loads current product/variant doc ids, deletes dependent rows, refreshes affected
  projection blocks and upserts latest deleted state.

Delete ordering:

1. Product and variant posting memberships.
2. Runtime variant price rows.
3. Variant source/debug price rows.
4. Variant listing rows.
5. Affected projection blocks refresh.
6. Product sort rows.
7. Product BM25 title rows.
8. Product aggregate price rows.
9. Product listing row.
10. Latest item state update.

### Batch transaction strategy

```ts
interface ListingBatchTransactionStrategy {
  mode: "per_item" | "per_chunk";
  chunkSize: number;
}
```

Rules:

- Default strategy: `mode = "per_item"`.
- `per_item` isolates rollback of one item from other items.
- `per_chunk` is allowed only for controlled backfill/migration workflows where caller accepts
  rollback of the whole chunk.
- Inside chunk, item locks are acquired in stable order: `entityType`, then `itemId`.
- Batch validator rejects duplicate item refs before transactions.
- Batch must not process two snapshots of the same item concurrently in one process.
- Partial result is built after all item/chunk attempts complete.

### Nested transaction rule

- Top-level action script owns transaction.
- Helper scripts do not open independent transactions when parent transaction exists.
- If `TransactionManager` supports propagation, helper scripts may use `txManager.run` only as
  join-existing transaction.
- If propagation is not guaranteed, helper scripts must not call `txManager.run`.
- Repository methods use `this.connection` and do not open independent DB connections.

### Reads outside transaction

- Pure validation and deterministic write model precomputation may run outside transaction only if
  they do not depend on database state.
- Storefront query repositories are not used inside write transaction.

### Lock ordering

Repository methods that accept arrays must sort keys internally or require pre-sorted input.

Global write-side lock order:

1. `listing_index_item_state` item advisory lock.
2. Existing `listing_index_item_state` row with `SELECT ... FOR UPDATE`.
3. `listing_doc_id_allocator` lock, only if new doc ids are needed.
4. Existing product row/bootstrap row.
5. Variant rows sorted by `variantId`.
6. Posting bitmap rows sorted by `entityType`, `field`, `valueKey`.
7. Runtime price rows sorted by `currency`, `variantDocId`.
8. Product sort/search/price rows.
9. Projection blocks sorted by `blockId`.

## Scripts

### Shared script params

```ts
interface ListingIndexActionRuntime {
  effectiveIdempotencyKey: string;
  payloadHash: string;
}

type ListingIndexActionStatus = "applied" | "noop" | "ignored_stale" | "accepted";
```

`accepted` is a handler-level enqueue status. It is not persisted as final status in
`listing_index_item_state`.

### Validation script

```ts
interface ListingIndexValidationIssue {
  code:
    | "UNSUPPORTED_CONTRACT_VERSION"
    | "PROJECT_MISMATCH"
    | "IDEMPOTENCY_CONFLICT"
    | "REVISION_CONFLICT"
    | "VALIDATION_FAILED";
  field?: string[];
  message: string;
}
```

`ListingIndexValidationIssue` is internal script-level metadata. It is mapped to current public
`ListingUpdateErrorCode` before crossing broker boundaries; `IDEMPOTENCY_CONFLICT` and
`REVISION_CONFLICT` are exposed as `VALIDATION_FAILED` unless `@shopana/broker-types` is explicitly
extended.

Responsibilities:

- Проверяет `contractVersion`, `storeId`, timestamps и required fields.
- Проверяет duplicate variant ids, duplicate facet value handles и currency format.
- Проверяет `productFacets[].scope = "product"` и `variants[].facets[].scope = "variant"`.
- Проверяет, что batch не содержит duplicate item refs.
- Не обращается в database.
- Не строит physical index rows.

### Write model builder

Responsibilities:

- Конвертирует публичный snapshot в physical repository DTOs.
- Проверяет `entityType = "product"`.
- Мапит `status = "published"` в listing `published`, остальные public statuses в `draft`, если item
  не удаляется.
- Строит product aggregate stock из snapshot availability или variants.
- Строит product price aggregate rows из `priceRanges`.
- Строит source/debug variant price rows из `variants[].prices`.
- Строит runtime variant price rows только для active, in-stock и priced variants.
- Строит product posting memberships для category, vendor и product facets.
- Строит variant posting memberships для option/custom variant facets и `variant_product`.
- Строит sort rows для supported storefront sorts: newest, manual scope, price, title/search
  fallback и availability buckets.
- Строит BM25 title rows по translations, если item searchable.
- Сортирует output arrays в stable order перед передачей в repositories.
- Не выполняет database reads/writes.
- Не использует `Date`, UUID, random или process-local mutable state.

### `ListingPrepareIndexActionScript`

Responsibilities:

- Валидирует action params.
- Проверяет store boundary.
- Не выполняет physical index writes.
- Для потенциального `apply` возвращает normalized immutable action без physical write model.
- Validation/domain conflicts возвращает как internal non-retryable issue, который action
  handler/controlled runner мапит в актуальный `ListingUpdateError` contract.

### `ListingBuildSyncWriteModelScript`

Responsibilities:

- Выполняется только для sync action.
- Принимает normalized action.
- Конвертирует public snapshot в `ListingSyncWriteModel`.
- Считает canonical `write_model_hash`.
- Возвращает canonical versioned `write_model_json` и `write_model_hash`.
- Если DBOS уже persisted step result, workflow replay получает persisted `write_model_json` без
  повторного выполнения step.
- Не выполняет physical index writes.
- Не выделяет doc ids и не создает bootstrap rows.

### `ListingWriteIndexActionScript`

Responsibilities:

- Выполняется для sync и delete как единственный transactional write script.
- Открывает final item-level transaction.
- Под item lock повторно проверяет latest state, source revision и payload hash.
- Для `noop`/`ignored_stale` returns result без physical writes.
- Для sync `apply`:
  - находит existing `product_doc_id` и `variant_doc_id` либо выделяет новые;
  - создает bootstrap product row для FK safety;
  - применяет write model через `ListingApplyItemWriteModelScript`;
  - удаляет stale variants, отсутствующие в full snapshot;
  - обновляет `listing_index_item_state`;
- Для delete `apply`:
  - находит current `product_doc_id` и `variant_doc_id`;
  - удаляет dependent rows в delete ordering;
  - refreshes affected projection blocks;
  - обновляет `listing_index_item_state` как `deleted`;
- Если item physical rows уже отсутствуют, но delete revision новый, сохраняет latest deleted state.
- Возвращает `applied`, `noop` или `ignored_stale`.

### `ListingApplyItemWriteModelScript`

Responsibilities:

- Выполняет только physical index writes для уже построенной write model и allocated doc ids.
- Выполняется внутри transaction parent script `ListingWriteIndexActionScript`.
- Не вызывает `txManager.run`, если parent transaction уже active.
- Upsert variant listing rows.
- Replace variant source/debug price rows.
- Replace variant facet memberships.
- Replace `variant_product` memberships.
- Replace runtime variant price rows.
- Refresh touched variant projection blocks.
- Upsert final product listing row.
- Replace product price rows.
- Replace product category/vendor/facet memberships.
- Replace product sort rows.
- Replace localized BM25 title rows.
- Не принимает public snapshot.
- Не содержит mapping rules.

### `ListingSyncSellableItemsScript`

Responsibilities:

- Валидирует batch metadata and duplicate item refs.
- Строит item-scoped `effectiveIdempotencyKey` для каждого item.
- Делит items на chunks только если выбран `per_chunk` mode.
- По умолчанию открывает отдельную transaction на каждый item.
- Для каждого item вызывает тот же step-oriented executor, что DBOS workflow: prepare, optional
  build write model, single transactional write.
- В `per_item` mode ошибка одного item не откатывает остальные items.
- В `per_chunk` mode ошибка item откатывает chunk, но не остальные chunks.
- Возвращает `completed`, если все items получили final status `applied`/`noop`/`ignored_stale`.
- Возвращает `partial`, если часть items завершилась validation или infrastructure error.

### Helper scripts

`ListingCleanupStaleVariantsScript`:

- Находит variants, которые есть в index для product, но отсутствуют в full incoming snapshot.
- Выполняется внутри parent item transaction.
- Удаляет variant memberships, variant prices, runtime price rows и `variant_listing_index` rows.
- Возвращает touched variant doc ids для projection block refresh.
- Не трогает product-level rows.

`ListingReplaceProductTitleSearchRowsScript`:

- Replace localized BM25 rows для product.
- Выполняется внутри parent item transaction.
- Empty rows удаляют все BM25 title rows product.
- Не выполняет search queries.

`ListingReplaceRuntimeVariantPriceRowsScript`:

- Replace runtime price rows для variants.
- Выполняется внутри parent item transaction.
- Empty rows for variant doc id удаляют runtime price rows этого variant.

`ListingReplaceProductSortRowsScript`:

- Replace all physical sort rows for one product doc id.
- Выполняется внутри parent item transaction.
- Empty rows удаляют sort rows product.
- Не выбирает страницы listing и не применяет storefront cursors.

## Optional coalescing/latest-wins

Базовая версия не требует coalescing: каждый queued workflow обрабатывает свой input snapshot, а
`sourceSequence` guard под item lock пропускает stale work.

Если нужен latest-wins режим для high-volume streams, он должен вводиться через отдельный durable
inbox/latest table.

Rules for coalescing:

- Более свежий snapshot должен быть durably saved до того, как старый workflow сможет завершиться
  как superseded/ignored.
- Workflow не должен молча применять другой payload под старым `effectiveIdempotencyKey`.
- Если script забирает latest inbox row вместо workflow input, он обязан использовать effective
  idempotency key и payload hash latest row.
- Internal `superseded` может существовать только как internal inbox status. Public action result
  остается `ignored_stale`, `noop` или `applied`.
- `sourceSequence` под item lock остается final correctness guard.

## Repository API additions

### `ListingIndexItemStateRepository`

```ts
interface ListingIndexItemStateKey {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}

interface ListingIndexItemStateRow extends ListingIndexItemStateKey {
  sourceSequence: number;
  payloadHash: string;
  lifecycleStatus: "indexed" | "deleted";
  lastEffectiveIdempotencyKey: string;
  lastOperationId: string;
  updatedAt: string;
}

class ListingIndexItemStateRepository extends BaseRepository {
  findByItem(key: ListingIndexItemStateKey): Promise<ListingIndexItemStateRow | null>;

  lockByItem(key: ListingIndexItemStateKey): Promise<ListingIndexItemStateRow | null>;

  upsertLatestState(row: ListingIndexItemStateRow): Promise<ListingIndexItemStateRow>;
}
```

### Existing write repository additions

`VariantListingIndexRepository`:

```ts
class VariantListingIndexRepository extends BaseRepository {
  getVariantIdsByProductId(productId: string): Promise<string[]>;

  getVariantDocIdsByProductId(productId: string): Promise<Map<string, number>>;

  deleteByProductIdExceptVariantIds(input: {
    productId: string;
    keepVariantIds: readonly string[];
  }): Promise<{
    deletedVariantIds: string[];
    deletedVariantDocIds: number[];
  }>;
}
```

`ProductTitleBm25SearchIndexRepository`:

```ts
class ProductTitleBm25SearchIndexRepository extends BaseRepository {
  replaceForProduct(
    productId: string,
    rows: readonly ProductTitleBm25RowInput[],
  ): Promise<ProductTitleBm25SearchIndex[]>;
}
```

`ListingPostingBitmapRepository`:

```ts
class ListingPostingBitmapRepository extends BaseRepository {
  replaceProductMembershipGroups(input: {
    productDocId: number;
    categoryValueKeys: readonly string[];
    vendorValueKeys: readonly string[];
    facetValueKeys: readonly string[];
  }): Promise<PostingMembershipReplaceResult>;

  replaceVariantMembershipGroups(input: {
    variantDocId: number;
    variantProductValueKeys: readonly string[];
    facetValueKeys: readonly string[];
  }): Promise<PostingMembershipReplaceResult>;
}
```

Repository facade:

```ts
class Repository {
  readonly listingIndexItemState: ListingIndexItemStateRepository;

  runListingIndexItemTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult>;
}
```

`runListingIndexItemTransaction` is optional. Scripts may use `repository.txManager.run` directly if
the project does not want an additional facade method.

## Minimal sync sequence

```ts
const prepared = await stepPrepareSyncIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

const syncWriteModel = await stepBuildSyncWriteModel({
  action: prepared.action,
});

return stepWriteSyncIndexAction({
  action: prepared.action,
  syncWriteModel,
});
```

This block is sequencing contract, not implementation. Each named call is a DBOS `@WorkflowStep`;
final physical writes happen only inside the single `stepWriteSyncIndexAction`.

## Acceptance checklist

- [ ] Broker actions no longer return `LISTING_INDEX_UPDATE_NOT_IMPLEMENTED` for successful
      processing.
- [ ] DBOS queue `listing_index_actions` is registered as partitioned queue.
- [ ] Queue partition key is item-scoped.
- [ ] Action handlers use `ServiceBroker.startWorkflow(...)`, not direct `DBOS.startWorkflow(...)`.
- [ ] Index workflows build `IdempotencyContext` through
      `buildListingIndexWorkflowIdempotencyContext(...)` and pass item-scoped
      `effectiveIdempotencyKey` as `contentHash`.
- [ ] Action handlers return `accepted` only after durable DBOS enqueue or same-revision already
      accepted duplicate detection.
- [ ] `enqueueOptions.deduplicationID` is not used with partitioned queue.
- [ ] `duplicationPolicy: "return-existing"` is not used for `listing_index_actions`.
- [ ] `@Workflow("syncSellableItemIndex")` and `@Workflow("deleteSellableItemIndex")` bodies contain
      only deterministic orchestration over persisted step results.
- [ ] All side effects are inside `@WorkflowStep` or controlled internal script runner.
- [ ] Each index workflow uses one or more prepare DBOS steps and exactly one transactional write
      DBOS step.
- [ ] Prepare DBOS steps do not allocate doc ids, create bootstrap rows or write physical index
      tables.
- [ ] Typed write steps allocate/read doc ids as needed, apply sync/delete writes and update latest
      state in one transaction.
- [ ] Every DBOS step has explicit timeout and retry policy.
- [ ] Retryable infrastructure errors are classified as retryable.
- [ ] Validation/idempotency/revision conflicts are non-retryable domain results.
- [ ] DBOS step calls `Kernel.runScript(..., RunScriptContext)`.
- [ ] Repositories run with `this.storeId = params.storeId`.
- [ ] Batch enqueue processing fans out items into item-partitioned workflows.
- [ ] Batch item effective idempotency key includes item identity.
- [ ] `listing_index_item_state` stores latest item revision/state.
- [ ] Retry after DB commit but before DBOS step persistence returns idempotent physical write
      result without write amplification.
- [ ] `lockByItem` serializes item updates even when latest-state row does not exist.
- [ ] Same revision with same payload returns `noop`.
- [ ] Same revision with different payload returns non-retryable revision conflict.
- [ ] Older revision returns `ignored_stale`.
- [ ] Full snapshot sync deletes stale variants.
- [ ] Delete action deletes product, variants, memberships, prices, sort rows and BM25 rows.
- [ ] Mapping rules live in write model builder, not repositories.
- [ ] Storefront query repositories are not used for write processing.
- [ ] DBOS workflow history retention/cleanup policy is documented.
- [ ] Реализация не требует запуска `test` или `tsc`; для проверки новой версии кода используется
      build согласно project rules.
