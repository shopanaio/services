# Listing Index Action Scripts Plan

## Цель

Документ фиксирует application-layer contract для обработки broker actions:

- `listing.syncSellableItem`
- `listing.syncSellableItems`
- `listing.deleteSellableItem`

Action handlers принимают публичный snapshot contract, валидируют durable
принятие work и делегируют физическое обновление listing index в scripts через
DBOS workflow/step execution.

План намеренно описывает границы, ordering, idempotency и DBOS API usage. Он не
является низкоуровневой реализацией SQL методов.

## Основные инварианты

- Broker action handlers не пишут physical listing index tables напрямую.
- Broker action возвращает `accepted` только после успешного durable enqueue в
  DBOS queue.
- DBOS `@Workflow` body не выполняет внешние эффекты. В нем разрешены только
  deterministic branching и вызов durable step.
- Все repository calls, `Kernel.getInstance()`,
  `kernel.runScript(...)`, чтение config/defaults, `Date`, `now()`, UUID и
  любые другие side effects находятся внутри `@WorkflowStep` или controlled
  internal script runner.
- Prepare DBOS steps не выполняют physical listing index writes. Они
  валидируют, нормализуют и строят immutable write input.
- Единственный DBOS write step вызывает один transactional script, который
  внутри одной item-level transaction принимает final revision decision,
  выделяет doc ids, выполняет physical writes, обновляет latest state и пишет
  final receipt.
- DBOS step может быть повторно выполнен после crash, если step result еще не
  persisted. Поэтому физические writes должны быть idempotent на database
  уровне.
- `syncSellableItem` принимает полный snapshot. Partial patch semantics нет.
- `sourceRevision` монотонен для ключа
  `projectId + entityType + itemId`.
- Public `meta.idempotencyKey` не обязан быть уникальным между items batch.
  Для database receipts и item workflows используется item-scoped
  `effectiveIdempotencyKey`.
- Старая revision возвращает `ignored_stale` без изменения physical index.
- Повтор того же effective idempotency key возвращает сохраненный result без
  повторного write amplification.
- Все physical index writes выполняются внутри одной database transaction на
  item или на controlled batch chunk.
- Repository layer остается source-agnostic: он принимает нормализованные doc
  ids, value keys, sort rows и price rows.

## Термины

`itemKey`:

```ts
type ListingIndexItemKey = {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
};
```

`effectiveIdempotencyKey`:

- для single item action и для item внутри batch всегда строится одним helper-ом
  как stable hash от `meta.idempotencyKey + projectId + entityType + itemId +
  actionType`;
- используется в DBOS workflow identity и в
  `listing_index_action_receipt`;
- не должен строиться только из raw/batch-level `meta.idempotencyKey`.

`payloadHash`:

- canonical hash публичного action payload, включая action type,
  `projectId`, item identity, `sourceRevision` и snapshot/delete payload;
- нужен для диагностики и conflict detection при повторном использовании
  idempotency key с другим payload.

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

- Queue регистрируется DBOS wrapper-ом после `DBOS.launch()` на startup listing
  service.
- `partitionQueue: true` обязателен.
- `concurrency: 1` означает последовательное выполнение внутри одного logical
  partition.
- `workerConcurrency` ограничивает количество одновременно исполняемых listing
  index workflows на process и должен быть deployment/config параметром.
- Partition key всегда item-scoped:

```ts
const queuePartitionKey = [
  projectId,
  entityType,
  itemId,
].join(":");
```

- Для миллиона products не создается миллион persistent queues. Partition key
  хранится в queued workflow rows DBOS system tables.
- Риск роста database связан с количеством workflow executions/history. Нужна
  DBOS workflow history retention policy для completed/failed listing index
  workflows.

### Enqueue через ServiceBroker

Action handlers используют только `broker.startWorkflow(...)`. Прямой вызов
`DBOS.startWorkflow(...)` из listing action handlers запрещен.

`IdempotencyContext` для index workflows строится только через общий helper,
чтобы single и batch paths получали один и тот же deterministic DBOS
`workflowID`:

```ts
import { hashContent, type IdempotencyContext } from "@shopana/shared-kernel";

type ListingIndexActionType = "syncSellableItem" | "deleteSellableItem";

function buildListingIndexEffectiveIdempotencyKey(input: {
  rawIdempotencyKey: string;
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
}): string {
  return hashContent({
    v: 1,
    projectId: input.projectId,
    entityType: input.entityType,
    itemId: input.itemId,
    actionType: input.actionType,
    rawIdempotencyKey: input.rawIdempotencyKey,
  });
}

function buildListingIndexWorkflowIdempotencyContext(input: {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
  effectiveIdempotencyKey: string;
}): IdempotencyContext {
  return {
    source: "content",
    tenantId: input.projectId,
    resourceId: `${input.entityType}:${input.itemId}`,
    operation: `listing.${input.actionType}`,
    contentHash: input.effectiveIdempotencyKey,
  };
}
```

Почему именно так:

- `WorkflowRegistry.start()` вызывает
  `buildIdempotencyKey(qualifiedWorkflow, idempotencyCtx)`;
- для `source: "content"` DBOS workflow identity строится из
  `tenantId`, `resourceId`, `operation`, `contentHash` и qualified workflow
  name;
- `tenantId = projectId` дает project-level isolation;
- `resourceId = entityType:itemId` делает workflow identity item-scoped;
- `operation = listing.${actionType}` разделяет sync и delete при одном
  external idempotency key;
- `contentHash` должен получать item-scoped `effectiveIdempotencyKey`, а не
  raw `meta.idempotencyKey` и не `payloadHash`;
- `content` не передается, потому что workflow identity должна зависеть от
  acceptance idempotency key, а не от полного snapshot payload. Payload
  conflict detection выполняется отдельно через `payloadHash` в database
  receipt.

```ts
const effectiveIdempotencyKey =
  buildListingIndexEffectiveIdempotencyKey({
    rawIdempotencyKey: queuedAction.params.meta.idempotencyKey,
    projectId,
    entityType,
    itemId,
    actionType: queuedAction.type,
  });

const idempotencyCtx =
  buildListingIndexWorkflowIdempotencyContext({
    projectId,
    entityType,
    itemId,
    actionType: queuedAction.type,
    effectiveIdempotencyKey,
  });

await this.broker.startWorkflow(
  "listing.indexAction",
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

- `accepted` возвращается только после успешного `broker.startWorkflow(...)`,
  либо после duplicate workflow conflict, который доказал, что deterministic
  workflow уже durably accepted.
- Если process crash произошел после `broker.startWorkflow(...)`, но до
  response, следующий same-payload retry может получить DBOS duplicate workflow
  conflict. В этом случае helper сверяет deterministic workflow identity и
  возвращает `accepted`.
- Если DBOS enqueue завершился retryable infrastructure error до durable accept,
  same-payload retry повторяет `broker.startWorkflow(...)`.
- `resourceId` всегда item-scoped.
- `operation` включает action type, чтобы sync и delete не конфликтовали при
  одинаковом idempotency key.
- `contentHash` получает `effectiveIdempotencyKey`, а не raw batch key.
- Текущая заготовка action handler, которая передает
  `params.meta.idempotencyKey` напрямую в `contentHash`, должна быть заменена
  на helper выше.
- Explicit `options.workflowId` можно передать только если он строится тем же
  helper-ом из `projectId + entityType + itemId + actionType +
  effectiveIdempotencyKey`.
- `enqueueOptions.queuePartitionKey` используется всегда.
- `enqueueOptions.deduplicationID` не используется для этой queue.
- `duplicationPolicy: "return-existing"` не используется для этой queue,
  потому что актуальный `WorkflowRegistry` требует `deduplicationID` для
  `"return-existing"`, а `deduplicationID` несовместим с
  `queuePartitionKey`.
- Если DBOS SDK возвращает duplicate workflow conflict для уже принятого
  deterministic workflow id, action handler не должен слепо трактовать это как
  `already accepted`.
- Duplicate workflow conflict обрабатывается отдельным helper-ом поверх
  `broker.startWorkflow(...)`, а не через `deduplicationID`:
  - helper строит тот же `effectiveIdempotencyKey` и `payloadHash`;
  - duplicate workflow conflict for the same deterministic workflow id is
    treated as proof of durable DBOS accept;
  - если final receipt уже существует и его metadata отличается, handler
    возвращает/кидает non-retryable idempotency conflict согласно public action
    contract.
- Duplicate workflow conflict с другим payload не должен маскироваться как
  successful enqueue. DBOS workflow identity защищает scheduling, а payload
  conflict detection остается database-level contract.
- Handler must not rely on final receipt for enqueue idempotency. Final receipt
  may appear much later, after worker execution.

### Workflow body

`ListingIndexActionWorkflow` содержит только deterministic orchestration.
Workflow body не пишет индекс. Он вызывает один или несколько prepare steps,
затем ровно один transactional write step. Ветвление разрешено только по
immutable input и persisted result предыдущих steps:

```ts
type ListingIndexQueuedAction =
  | {
      type: "syncSellableItem";
      params: Listing.SyncSellableItemParams;
      effectiveIdempotencyKey: string;
      payloadHash: string;
    }
  | {
      type: "deleteSellableItem";
      params: Listing.DeleteSellableItemParams;
      effectiveIdempotencyKey: string;
      payloadHash: string;
    };

type ListingPreparedWriteAction =
  | {
      action: ListingPreparedSyncAction;
      syncWriteModel: ListingSyncWriteModel;
    }
  | {
      action: ListingPreparedDeleteAction;
      syncWriteModel?: undefined;
    };

class ListingIndexActionWorkflow extends BrokerWorkflows {
  @Workflow("indexAction")
  async run(
    action: ListingIndexQueuedAction
  ): Promise<Listing.ListingUpdateResult> {
    const prepared = await this.stepPrepareIndexAction(action);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const syncWriteModel =
      action.type === "syncSellableItem"
        ? await this.stepBuildSyncWriteModel({
            action: prepared.action,
          })
        : undefined;

    return this.stepWriteIndexAction({
      action: prepared.action,
      syncWriteModel,
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
- Может строить deterministic write model только из normalized action и
  persisted step inputs. Write model не содержит allocated doc ids.
- Не содержит physical index mapping rules.
- Не вызывает repositories или scripts вне DBOS steps.
- Может ветвиться только на основании:
  - immutable `action.type`;
  - persisted result предыдущего `@WorkflowStep`.

### Workflow steps для side effects

Фактическая обработка action разбивается на prepare steps и один write step.
Prepare steps не пишут physical index tables. Single write step должен быть
safe для повторного выполнения, если process crash произошел после database
commit, но до DBOS step result persistence.

```ts
class ListingIndexActionWorkflow extends BrokerWorkflows {
  @WorkflowStep({
    name: "prepareListingIndexAction",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepPrepareIndexAction(
    action: ListingIndexQueuedAction
  ): Promise<ListingIndexPreparedAction> {
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
  private async stepBuildSyncWriteModel(input: {
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
    name: "writeListingIndexAction",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepWriteIndexAction(input: ListingPreparedWriteAction): Promise<
    Listing.ListingUpdateResult
  > {
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
- Step result persisted DBOS-ом. На workflow replay completed step не должен
  повторно выполнять writes.
- Если process crash произошел после database commit, но до DBOS step result
  persistence, DBOS может повторно выполнить write step. Поэтому
  `writeListingIndexAction` обязан иметь database guard по
  `effectiveIdempotencyKey`, final receipt и latest item state.
- `prepare` step:
  - валидирует public contract;
  - строит/проверяет `RunScriptContext`;
  - может делать fast-path read existing final receipt только как optimization;
  - если action уже final по safe fast-path, возвращает `kind: "final"` с
    сохраненным result;
  - если нужно продолжать, возвращает нормализованный immutable action.
- `buildSyncWriteModel` step:
  - используется только для sync;
  - использует только normalized action;
  - не читает database или mutable storefront state;
  - строит canonical versioned `write_model_json` и `write_model_hash`;
  - write model содержит source ids, value keys, sort rows и price rows, но не
    содержит allocated `product_doc_id` или `variant_doc_id`;
  - повтор step возвращает DBOS-persisted result, если step result уже сохранен.
- `writeListingIndexAction`:
  - является единственным write DBOS step для sync и delete;
  - вызывает один transactional script;
  - открывает одну item-level transaction для final physical writes;
  - первым write-side DB operation вызывают `lockByItem`;
  - повторно проверяют final receipt/current state/source revision;
  - для `noop`/`ignored_stale` вставляют final receipt без physical writes;
  - для sync `apply` выделяет/читает doc ids, создает bootstrap product row,
    применяет write model, удаляет stale variants, обновляет latest item state и
    пишет final receipt атомарно;
  - для delete `apply` читает current doc ids, удаляет dependent rows,
    обновляет latest deleted state и пишет final receipt атомарно;
  - final receipt insert выполняется только после successful physical writes.
- Retry policy включается явно. Default DBOS wrapper policy без `retry`
  означает no retry.
- Retryable infrastructure errors должны быть thrown как retryable errors или
  классифицироваться wrapper-ом как retryable.
- Validation/project mismatch/domain conflicts возвращаются стабильным
  non-retryable domain result.
- Domain conflicts, которые являются частью public action contract
  (`IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`, `VALIDATION_FAILED`,
  `PROJECT_MISMATCH`), не должны превращаться в transient workflow retry.
  Step должен вернуть stable result без physical writes. Public enqueue path и
  controlled internal runner должны видеть один и тот же результат.
- Workflow error без stable domain result разрешен только для infrastructure
  failures после исчерпания retry или data corruption states.
- Step timeout считается non-retryable. Timeout должен быть достаточно большим
  для item transaction, но не использоваться как основной механизм отмены.

### RunScriptContext

`RunScriptContext` строится внутри DBOS step из action params:

- `storeId = params.projectId`;
- `requestId = params.meta.source.requestId ?? params.meta.operationId`;
- `locale/defaultLocale` для sync берутся из snapshot content;
- для delete locale/defaultLocale должны быть переданы в delete contract или
  прочитаны внутри step из service config/defaults;
- `organizationId` и `userId` заполняются только если доступны в source
  metadata.

Repositories внутри scripts должны видеть `this.storeId = params.projectId`.
Project mismatch завершается validation result до physical writes.

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

- `syncSellableItem` ставит item-scoped `ListingIndexActionWorkflow` в
  `listing_index_actions`.
- `deleteSellableItem` ставит item-scoped `ListingIndexActionWorkflow` в ту же
  queue.
- `syncSellableItems` fan-out-ит items в отдельные queued item workflows.
- Handler не строит write model.
- Handler не вызывает index repositories.
- Handler не возвращает `accepted`, пока item workflow не accepted durably.

### Controlled internal execution

Прямой `kernel.runScript(...)` разрешен только для controlled internal
backfill/repair tools, а не как alternate execution path публичного broker
action.

Rules:

- Internal runner обязан строить тот же `effectiveIdempotencyKey` и
  `payloadHash`, что DBOS enqueue path.
- Internal runner вызывает тот же step-oriented executor:
  `ListingPrepareIndexActionScript`, optional
  `ListingBuildSyncWriteModelScript`, затем один
  `ListingWriteIndexActionScript`.
- Internal runner получает final result: `applied`, `noop` или
  `ignored_stale`.
- Internal runner не обходит `lockByItem`, receipt checks, revision checks или
  transaction ownership.
- Для high-volume event stream используется только DBOS queue path.

### Batch enqueue

Batch enqueue не должен быть одним большим queued workflow.

Rules:

- Validator rejects duplicate item refs in one batch before enqueue attempts.
- For each item handler builds:
  - item-scoped `effectiveIdempotencyKey`;
  - item-scoped `payloadHash`;
  - item-scoped queue partition key.
- Enqueue может выполняться concurrently, но public result строится после
  completion всех enqueue attempts.
- Если часть items accepted, а часть enqueue attempts failed, handler возвращает
  `partial` с per-item union result: `{ kind: "result"; result:
  ListingUpdateResult }` для accepted items и `{ kind: "error"; itemRef;
  sourceRevision; error: ListingUpdateError }` для failed items.
- Retry batch после partial enqueue safe: уже accepted items распознаются по
  deterministic workflow identity и receipt metadata как same-payload already
  accepted.

## Database idempotency model

DBOS workflow identity защищает durable scheduling. Database idempotency
защищает enqueue payload conflict detection, physical side effects и stable
final result.

Для этого нужны две разные сущности:

1. latest item state;
2. final action receipt по `effectiveIdempotencyKey`.

### `listing_index_item_state`

Latest state хранит последнюю принятую revision по item:

```sql
CREATE TABLE listing.listing_index_item_state (
  project_id uuid NOT NULL,
  entity_type varchar(32) NOT NULL,
  item_id uuid NOT NULL,
  source_revision integer NOT NULL,
  payload_hash text NOT NULL,
  lifecycle_status varchar(32) NOT NULL,
  last_effective_idempotency_key text NOT NULL,
  last_operation_id text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (project_id, entity_type, item_id)
);
```

Constraints:

- `source_revision >= 0`.
- `lifecycle_status IN ('indexed', 'deleted')`.
- `(project_id, entity_type, item_id)` is the canonical latest-state key.
- Эта table не является idempotency receipt history.
- Эта table обновляется только после successful apply/delete decision.
- Stale/noop decisions не должны откатывать latest state назад.

### `listing_index_action_receipt`

Receipt хранит stable result для processed effective idempotency key:

```sql
CREATE TABLE listing.listing_index_action_receipt (
  project_id uuid NOT NULL,
  effective_idempotency_key text NOT NULL,
  raw_idempotency_key text NOT NULL,
  entity_type varchar(32) NOT NULL,
  item_id uuid NOT NULL,
  action_type varchar(32) NOT NULL,
  source_revision integer NOT NULL,
  payload_hash text NOT NULL,
  operation_id text NOT NULL,
  status varchar(32) NOT NULL,
  processed_at timestamptz NOT NULL,
  result_json jsonb NOT NULL,
  PRIMARY KEY (project_id, effective_idempotency_key)
);

CREATE INDEX listing_index_action_receipt_item_idx
  ON listing.listing_index_action_receipt (
    project_id,
    entity_type,
    item_id,
    source_revision
  );
```

Constraints:

- `status IN ('applied', 'noop', 'ignored_stale')`.
- `effective_idempotency_key` is item-scoped.
- Batch items with one raw `meta.idempotencyKey` produce different
  `effective_idempotency_key` values.
- `result_json` stores the exact broker-level final result returned by scripts.
- If a retry finds an existing receipt with the same
  `effective_idempotencyKey`, it returns `result_json` without physical writes.
- If an internal runner reuses the same effective key with a different
  `payloadHash`, repository returns an idempotency conflict as non-retryable
  domain result. Duplicate workflow starts may never reach script because DBOS
  workflow identity can resolve to the first accepted workflow; action handler
  duplicate handling therefore must inspect receipt metadata when it exists.

## Idempotency and revision decision

Fast-path decision may be read during prepare, but authoritative decision is
made under item lock in the single final write step. The final decision that
allows physical writes is made inside the same transaction as those physical
writes.

Decision order:

1. `lockByItem(itemKey)`.
2. Check `listing_index_action_receipt` by
   `(projectId, effectiveIdempotencyKey)`.
3. If receipt exists:
   - if `payloadHash` matches, return `receipt.resultJson`;
   - if `payloadHash` differs, return non-retryable idempotency conflict.
4. Load latest `listing_index_item_state` under `SELECT ... FOR UPDATE` if row
   exists.
5. If no latest state exists, `apply`.
6. If `incoming.sourceRevision < current.sourceRevision`, return
   `ignored_stale` and insert receipt. Do not update item state.
7. If `incoming.sourceRevision === current.sourceRevision`:
   - if `incoming.payloadHash === current.payloadHash`, return `noop` and
     insert receipt;
   - otherwise return non-retryable revision conflict.
8. If `incoming.sourceRevision > current.sourceRevision`, apply sync/delete.

For `deleteSellableItem`:

- A new delete revision is applied even if physical product rows are already
  absent.
- Delete writes `lifecycle_status = 'deleted'` to latest state.
- Repeated delete with the same effective idempotency key returns receipt.
- Same revision delete with matching payload returns `noop`.
- Older delete returns `ignored_stale`.

## Transaction ownership

### `lockByItem`

`lockByItem` must serialize first action for an item even when latest-state row
does not exist yet.

Contract:

- Выполняется только внутри transaction.
- Первым write-side DB operation берет transaction-scoped item lock по
  `projectId + entityType + itemId`.
- Recommended implementation: PostgreSQL advisory transaction lock
  `pg_advisory_xact_lock` от stable hash canonical key.
- После advisory lock читает existing `listing_index_item_state` row через
  `SELECT ... FOR UPDATE`.
- Если state row отсутствует, возвращает `null`, но item уже locked до конца
  transaction.
- Не вставляет placeholder state rows ради lock.
- Все sync/delete/batch paths используют один `lockByItem`; ad-hoc locks в
  scripts запрещены.

### Single item sync step sequence

```ts
const prepared = await stepPrepareIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

const syncWriteModel = await stepBuildSyncWriteModel({
  action: prepared.action,
});

return stepWriteIndexAction({
  action: prepared.action,
  syncWriteModel,
});
```

Rules:

- `prepare` and `buildSyncWriteModel` do not perform physical index writes.
- `buildSyncWriteModel` must not use mutable database state.
- `buildSyncWriteModel` returns the canonical versioned `write_model_json`
  together with `write_model_hash`. On workflow replay after DBOS persisted the
  step result, DBOS returns the stored write model without re-executing the
  step.
- `writeListingIndexAction` calls `lockByItem` as the first write-side DB
  operation for item.
- Decision is made under lock in final write step even if prepare returned a
  preliminary `apply` decision.
- `noop` and `ignored_stale` do not execute physical index writes.
- Physical writes and final state/receipt writes are atomic inside
  `stepWriteIndexAction`.
- If any physical write fails, item state and receipt are rolled back.
- `product_doc_id` and `variant_doc_id` allocation happens inside
  `ListingWriteIndexActionScript` after `lockByItem` and final revision
  decision. Repeating the write step returns existing ids from physical index
  rows before allocating new ids.
- Bootstrap product row is created before variant rows.
- Projection blocks refresh happens after variant row/membership/runtime price
  writes and before commit.
- Final receipt is inserted last or in the same final block as latest state,
  after all physical writes have succeeded.

### Delete step transactions

```ts
const prepared = await stepPrepareIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

return stepWriteIndexAction({
  action: prepared.action,
});
```

Delete final commit:

- Runs inside `ListingWriteIndexActionScript`.
- Opens one item-level transaction.
- Calls `lockByItem` as the first write-side DB operation for item.
- Rechecks final receipt/current state/source revision under lock.
- For `noop`/`ignored_stale`, inserts final receipt without physical deletes.
- For `apply`, loads current product/variant doc ids, deletes dependent rows,
  refreshes affected projection blocks, upserts latest deleted state and inserts
  final receipt.

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
11. Action receipt insert.

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
- `per_chunk` is allowed only for controlled backfill/migration workflows where
  caller accepts rollback of the whole chunk.
- Inside chunk, item locks are acquired in stable order:
  `entityType`, then `itemId`.
- Batch validator rejects duplicate item refs before transactions.
- Batch must not process two snapshots of the same item concurrently in one
  process.
- Partial result is built after all item/chunk attempts complete.

### Nested transaction rule

- Top-level action script owns transaction.
- Helper scripts do not open independent transactions when parent transaction
  exists.
- If `TransactionManager` supports propagation, helper scripts may use
  `txManager.run` only as join-existing transaction.
- If propagation is not guaranteed, helper scripts must not call
  `txManager.run`.
- Repository methods use `this.connection` and do not open independent DB
  connections.

### Reads outside transaction

- Pure validation and deterministic write model precomputation may run outside
  transaction only if they do not depend on database state.
- Fast-path receipt read outside transaction is allowed only as optimization.
  Final receipt/state decision must be repeated under `lockByItem`.
- Storefront query repositories are not used inside write transaction.

### Lock ordering

Repository methods that accept arrays must sort keys internally or require
pre-sorted input.

Global write-side lock order:

1. `listing_index_item_state` item advisory lock.
2. Existing `listing_index_item_state` row with `SELECT ... FOR UPDATE`.
3. `listing_index_action_receipt` check for effective key.
4. `listing_doc_id_allocator` lock, only if new doc ids are needed.
5. Existing product row/bootstrap row.
6. Variant rows sorted by `variantId`.
7. Posting bitmap rows sorted by `entityType`, `field`, `valueKey`.
8. Runtime price rows sorted by `currency`, `variantDocId`.
9. Product sort/search/price rows.
10. Projection blocks sorted by `blockId`.
11. Final `listing_index_action_receipt` insert.

## Scripts

### Shared script params

```ts
interface ListingIndexActionRuntime {
  effectiveIdempotencyKey: string;
  payloadHash: string;
}

type ListingIndexActionStatus =
  | "applied"
  | "noop"
  | "ignored_stale"
  | "accepted";
```

`accepted` is a handler-level enqueue status. It is not persisted as final
status in `listing_index_item_state` or `listing_index_action_receipt`.

### Validation script

```ts
interface ListingUpdateValidationIssue {
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

Responsibilities:

- Проверяет `contractVersion`, `projectId`, timestamps и required fields.
- Проверяет duplicate variant ids, duplicate facet value handles и currency
  format.
- Проверяет `productFacets[].scope = "product"` и
  `variants[].facets[].scope = "variant"`.
- Проверяет, что batch не содержит duplicate item refs.
- Не обращается в database.
- Не строит physical index rows.

### Write model builder

Responsibilities:

- Конвертирует публичный snapshot в physical repository DTOs.
- Мапит `entityType = "product"` в `kind = "BASE"`.
- Мапит `entityType = "bundle"` в `kind = "BUNDLE"`.
- Мапит `status = "published"` в listing `published`, остальные public
  statuses в `draft`, если item не удаляется.
- Строит product aggregate stock из snapshot availability или variants.
- Строит product price aggregate rows из `priceRanges`.
- Строит source/debug variant price rows из `variants[].prices`.
- Строит runtime variant price rows только для active, in-stock и priced
  variants.
- Строит product posting memberships для category, vendor и product facets.
- Строит variant posting memberships для option/custom variant facets и
  `variant_product`.
- Строит sort rows для supported storefront sorts: newest, manual scope,
  price, title/search fallback и availability buckets.
- Строит BM25 title rows по translations, если item searchable.
- Сортирует output arrays в stable order перед передачей в repositories.
- Не выполняет database reads/writes.
- Не использует `Date`, UUID, random или process-local mutable state.

### `ListingPrepareIndexActionScript`

Responsibilities:

- Валидирует action params.
- Проверяет project boundary.
- Не выполняет physical index writes.
- Может выполнить fast-path read final receipt без transaction только как
  optimization.
- Для existing receipt возвращает `kind: "final"` с сохраненным result.
- Для потенциального `apply` возвращает normalized immutable action без
  physical write model.
- Не вставляет receipt для `ignored_stale`/`noop`; это делает single write
  script под item lock.
- Validation/domain conflicts возвращает как non-retryable domain result.

### `ListingBuildSyncWriteModelScript`

Responsibilities:

- Выполняется только для sync action.
- Принимает normalized action.
- Конвертирует public snapshot в `ListingSyncWriteModel`.
- Считает canonical `write_model_hash`.
- Возвращает canonical versioned `write_model_json` и `write_model_hash`.
- Если DBOS уже persisted step result, workflow replay получает persisted
  `write_model_json` без повторного выполнения step.
- Не выполняет physical index writes.
- Не выделяет doc ids и не создает bootstrap rows.

### `ListingWriteIndexActionScript`

Responsibilities:

- Выполняется для sync и delete как единственный transactional write script.
- Открывает final item-level transaction.
- Под item lock повторно проверяет final receipt, source revision и payload hash.
- Для `noop`/`ignored_stale` inserts receipt and returns result.
- Для sync `apply`:
  - находит existing `product_doc_id` и `variant_doc_id` либо выделяет новые;
  - создает bootstrap product row для FK safety;
  - применяет write model через `ListingApplyItemWriteModelScript`;
  - удаляет stale variants, отсутствующие в full snapshot;
  - обновляет `listing_index_item_state`;
  - inserts `listing_index_action_receipt`;
- Для delete `apply`:
  - находит current `product_doc_id` и `variant_doc_id`;
  - удаляет dependent rows в delete ordering;
  - refreshes affected projection blocks;
  - обновляет `listing_index_item_state` как `deleted`;
  - inserts `listing_index_action_receipt`;
- Если item physical rows уже отсутствуют, но delete revision новый,
  сохраняет latest deleted state и receipt.
- Возвращает `applied`, `noop` или `ignored_stale`.
- Если retry видит final receipt, возвращает `result_json` без physical writes.

### `ListingApplyItemWriteModelScript`

Responsibilities:

- Выполняет только physical index writes для уже построенной write model и
  allocated doc ids.
- Выполняется внутри transaction parent script
  `ListingWriteIndexActionScript`.
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
- Для каждого item вызывает тот же step-oriented executor, что DBOS workflow:
  prepare, optional build write model, single transactional write.
- В `per_item` mode ошибка одного item не откатывает остальные items.
- В `per_chunk` mode ошибка item откатывает chunk, но не остальные chunks.
- Возвращает `completed`, если все items получили final status
  `applied`/`noop`/`ignored_stale`.
- Возвращает `partial`, если часть items завершилась validation или
  infrastructure error.

### Helper scripts

`ListingCleanupStaleVariantsScript`:

- Находит variants, которые есть в index для product, но отсутствуют в full
  incoming snapshot.
- Выполняется внутри parent item transaction.
- Удаляет variant memberships, variant prices, runtime price rows и
  `variant_listing_index` rows.
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

Базовая версия не требует coalescing: каждый queued workflow обрабатывает свой
input snapshot, а `sourceRevision` guard под item lock пропускает stale work.

Если нужен latest-wins режим для high-volume streams, он должен вводиться через
отдельный durable inbox/latest table.

Rules for coalescing:

- Более свежий snapshot должен быть durably saved до того, как старый workflow
  сможет завершиться как superseded/ignored.
- Workflow не должен молча применять другой payload под старым
  `effectiveIdempotencyKey`.
- Если script забирает latest inbox row вместо workflow input, он обязан
  использовать effective idempotency key и payload hash latest row.
- Internal `superseded` может существовать только как internal inbox status.
  Public action result остается `ignored_stale`, `noop` или `applied`.
- `sourceRevision` под item lock остается final correctness guard.

## Repository API additions

### `ListingIndexItemStateRepository`

```ts
interface ListingIndexItemStateKey {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}

interface ListingIndexItemStateRow extends ListingIndexItemStateKey {
  sourceRevision: number;
  payloadHash: string;
  lifecycleStatus: "indexed" | "deleted";
  lastEffectiveIdempotencyKey: string;
  lastOperationId: string;
  updatedAt: string;
}

class ListingIndexItemStateRepository extends BaseRepository {
  findByItem(
    key: ListingIndexItemStateKey
  ): Promise<ListingIndexItemStateRow | null>;

  lockByItem(
    key: ListingIndexItemStateKey
  ): Promise<ListingIndexItemStateRow | null>;

  upsertLatestState(
    row: ListingIndexItemStateRow
  ): Promise<ListingIndexItemStateRow>;
}
```

### `ListingIndexActionReceiptRepository`

```ts
interface ListingIndexActionReceiptRow extends ListingIndexItemStateKey {
  effectiveIdempotencyKey: string;
  rawIdempotencyKey: string;
  actionType: "syncSellableItem" | "deleteSellableItem";
  sourceRevision: number;
  payloadHash: string;
  operationId: string;
  status: "applied" | "noop" | "ignored_stale";
  processedAt: string;
  resultJson: Listing.ListingUpdateResult;
}

class ListingIndexActionReceiptRepository extends BaseRepository {
  findByEffectiveKey(input: {
    projectId: string;
    effectiveIdempotencyKey: string;
  }): Promise<ListingIndexActionReceiptRow | null>;

  insertResult(
    row: ListingIndexActionReceiptRow
  ): Promise<ListingIndexActionReceiptRow>;
}
```

`insertResult` must fail on conflicting existing key unless existing row has
same `payloadHash` and same `resultJson`.

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
    rows: readonly ProductTitleBm25RowInput[]
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
  readonly listingIndexActionReceipt: ListingIndexActionReceiptRepository;

  runListingIndexItemTransaction<TResult>(
    fn: () => Promise<TResult>
  ): Promise<TResult>;
}
```

`runListingIndexItemTransaction` is optional. Scripts may use
`repository.txManager.run` directly if the project does not want an additional
facade method.

## Minimal sync sequence

```ts
const prepared = await stepPrepareIndexAction(action);

if (prepared.kind === "final") {
  return prepared.result;
}

const syncWriteModel = await stepBuildSyncWriteModel({
  action: prepared.action,
});

return stepWriteIndexAction({
  action: prepared.action,
  syncWriteModel,
});
```

This block is sequencing contract, not implementation. Each named call is a
DBOS `@WorkflowStep`; final physical writes happen only inside the single
`stepWriteIndexAction`.

## Acceptance checklist

- [ ] Broker actions no longer return
      `LISTING_INDEX_UPDATE_NOT_IMPLEMENTED` for successful processing.
- [ ] DBOS queue `listing_index_actions` is registered as partitioned queue.
- [ ] Queue partition key is item-scoped.
- [ ] Action handlers use `ServiceBroker.startWorkflow(...)`, not direct
      `DBOS.startWorkflow(...)`.
- [ ] Index workflows build `IdempotencyContext` through
      `buildListingIndexWorkflowIdempotencyContext(...)` and pass
      item-scoped `effectiveIdempotencyKey` as `contentHash`.
- [ ] Action handlers return `accepted` only after durable DBOS enqueue or
      same-payload already accepted duplicate detection.
- [ ] `enqueueOptions.deduplicationID` is not used with partitioned queue.
- [ ] `duplicationPolicy: "return-existing"` is not used for
      `listing_index_actions`.
- [ ] `@Workflow("indexAction")` body contains only deterministic
      orchestration over persisted step results.
- [ ] All side effects are inside `@WorkflowStep` or controlled internal script
      runner.
- [ ] Workflow uses one or more prepare DBOS steps and exactly one
      transactional write DBOS step.
- [ ] Prepare DBOS steps do not allocate doc ids, create bootstrap rows, insert
      final receipts or write physical index tables.
- [ ] The single write step allocates doc ids, applies sync/delete writes,
      updates latest state and inserts final receipt in one transaction.
- [ ] Every DBOS step has explicit timeout and retry policy.
- [ ] Retryable infrastructure errors are classified as retryable.
- [ ] Validation/idempotency/revision conflicts are non-retryable domain
      results.
- [ ] DBOS step calls `Kernel.runScript(..., RunScriptContext)`.
- [ ] Repositories run with `this.storeId = params.projectId`.
- [ ] Batch enqueue processing fans out items into item-partitioned workflows.
- [ ] Batch item effective idempotency key includes item identity.
- [ ] `listing_index_item_state` stores latest item revision/state.
- [ ] `listing_index_action_receipt` stores stable final result by effective
      idempotency key.
- [ ] Retry after DB commit but before DBOS step persistence returns receipt
      result or idempotent physical write result without write amplification.
- [ ] `lockByItem` serializes item updates even when latest-state row does not
      exist.
- [ ] Same revision with same payload returns `noop`.
- [ ] Same revision with different payload returns non-retryable revision
      conflict.
- [ ] Older revision returns `ignored_stale`.
- [ ] Full snapshot sync deletes stale variants.
- [ ] Delete action deletes product, variants, memberships, prices, sort rows
      and BM25 rows.
- [ ] Mapping rules live in write model builder, not repositories.
- [ ] Storefront query repositories are not used for write processing.
- [ ] DBOS workflow history retention/cleanup policy is documented.
- [ ] Реализация не требует запуска `test` или `tsc`; для проверки новой версии
      кода используется build согласно project rules.
