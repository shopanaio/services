# Listing Index Action Scripts Plan

## Цель

Документ описывает application-layer интерфейсы скриптов, которые будут
обрабатывать broker actions `listing.syncSellableItem`,
`listing.syncSellableItems` и `listing.deleteSellableItem`, валидировать
публичный snapshot contract и обновлять физический listing index через
существующие repositories.

Реализация в этом документе намеренно не описывается. Здесь фиксируются только
границы ответственности, входы/выходы и repository API, который нужен для
безопасной реализации.

## Общие правила

- Broker action handlers не должны напрямую писать таблицы индекса.
- Action handler создает и запускает соответствующий script.
- Script работает в контексте `projectId` из action params и должен проверять,
  что он совпадает с текущим store context.
- `syncSellableItem` получает полный snapshot. Partial patch semantics нет.
- `sourceRevision` монотонен для ключа
  `projectId + entityType + itemId`.
- Idempotency определяется через `meta.idempotencyKey`.
- Старая revision должна возвращать `ignored_stale` без изменения индекса.
- Повтор той же revision/idempotency должен возвращать `noop` или сохраненный
  result без повторного write amplification.
- Все физические index writes выполняются внутри одной transaction на item или
  на batch chunk.
- Repository layer остается source-agnostic: он принимает уже нормализованные
  doc ids, value keys, sort rows и price rows.

## Правила транзакционности

### Transaction ownership

- Внешний владелец transaction для одиночного item sync:
  `ListingSyncSellableItemScript`.
- Внешний владелец transaction для delete:
  `ListingDeleteSellableItemScript`.
- Внешний владелец transaction для batch:
  `ListingSyncSellableItemsScript`, но только на уровне item или chunk согласно
  выбранной batch strategy.
- Helper scripts (`ListingApplyItemWriteModelScript`,
  `ListingCleanupStaleVariantsScript`,
  `ListingReplaceProductTitleSearchRowsScript`,
  `ListingReplaceRuntimeVariantPriceRowsScript`,
  `ListingReplaceProductSortRowsScript`) не открывают собственную transaction,
  если уже вызваны внутри parent transaction.
- Repository methods используют `this.connection` и не открывают отдельные DB
  connections.

### Single item sync transaction

`listing.syncSellableItem` должен иметь один atomic boundary для одного
sellable item:

```ts
await repository.txManager.run(async () => {
  await repository.listingIndexUpdateState.lockByItem(itemKey);
  // decide apply/noop/stale under lock
  // allocate/preserve doc ids
  // write variant index parts
  // refresh projection blocks
  // write product index parts
  // cleanup stale variants
  // persist applied update state
});
```

Правила:

- `lockByItem` выполняется первым write-side DB operation для item.
- Решение `apply/noop/ignored_stale` принимается под item lock.
- Если decision = `noop` или `ignored_stale`, transaction не выполняет
  physical index writes.
- `listingIndexUpdateState.upsertAppliedState` вызывается последним шагом после
  успешного physical index write.
- Ошибка любого physical write откатывает все изменения item, включая update
  state.
- `product_doc_id` и `variant_doc_id` выделяются внутри той же transaction, что
  и запись index rows.
- Bootstrap product row создается до записи variant rows, чтобы FK safety была
  локальна этой же transaction.
- Projection blocks refresh выполняется после variant row/membership/runtime
  price writes и до commit.

### Delete transaction

`listing.deleteSellableItem` также выполняется в одной transaction на item:

```ts
await repository.txManager.run(async () => {
  await repository.listingIndexUpdateState.lockByItem(itemKey);
  // decide apply/noop/stale under lock
  // load current product/variant doc ids
  // delete dependent physical rows
  // refresh projection blocks
  // delete product row
  // persist applied delete state
});
```

Правила:

- Dependent rows удаляются до parent product row.
- Product/variant posting memberships удаляются до удаления listing rows.
- Runtime price rows и source/debug price rows удаляются до удаления variant
  rows.
- Projection blocks refresh выполняется после удаления variant rows или
  memberships, но до commit.
- Delete state сохраняется последним шагом.
- Если item уже отсутствует, но incoming revision/idempotency является новым
  применимым delete, script все равно сохраняет applied delete state.

### Batch transaction strategy

Batch sync не должен держать одну большую transaction на весь request по
умолчанию.

```ts
interface ListingBatchTransactionStrategy {
  mode: "per_item" | "per_chunk";
  chunkSize: number;
}
```

Правила:

- Default strategy: `mode = "per_item"`.
- `per_item` изолирует rollback одного item от остальных items.
- `per_chunk` разрешен только для controlled backfill/migration workflows, где
  caller принимает rollback всего chunk.
- Внутри batch item locks берутся в стабильном порядке:
  `entityType`, затем `itemId`.
- Batch не должен параллельно обрабатывать два snapshots одного item в одном
  process.
- Если batch содержит duplicate item refs, validator должен вернуть validation
  error до начала transactions.
- Partial result строится после завершения всех item/chunk attempts.

### Nested transaction rule

- Scripts должны быть safe для вызова внутри уже открытой transaction через
  `txManager`.
- Если текущий `TransactionManager` поддерживает propagation, helper script
  может использовать `txManager.run` только как join-existing transaction, не
  как independent transaction.
- Если propagation не гарантирован, helper scripts не вызывают
  `txManager.run`; transaction открывает только top-level action script.

### Read outside transaction

- Pure validation и deterministic write model build выполняются вне transaction,
  если не зависят от database state.
- Чтение current update state для предварительного fast-path `noop` может быть
  выполнено вне transaction, но final decision обязательно повторяется под
  `lockByItem`.
- Storefront query repositories не используются внутри write transaction.

### Lock ordering

Чтобы снизить риск deadlock:

1. `listing_index_update_state` item lock.
2. `listing_doc_id_allocator` lock, только если нужны новые doc ids.
3. Existing product row/bootstrap row.
4. Variant rows sorted by `variantId`.
5. Posting bitmap rows sorted by `entityType`, `field`, `valueKey`.
6. Runtime price rows sorted by `currency`, `variantDocId`.
7. Product sort/search/price rows.
8. Projection blocks sorted by `blockId`.

Repository methods, которые принимают массивы keys, должны сортировать keys
внутри метода или требовать pre-sorted input в contract.

## Action handler интерфейс

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

- `syncSellableItem` запускает `ListingSyncSellableItemScript`.
- `syncSellableItems` запускает `ListingSyncSellableItemsScript`.
- `deleteSellableItem` запускает `ListingDeleteSellableItemScript`.
- Handler не строит write model и не вызывает index repositories напрямую.
- Handler переводит thrown infrastructure errors в broker-level retryable
  errors только если script не вернул domain result.

## Shared script DTOs

```ts
type ListingIndexActionStatus =
  | "applied"
  | "noop"
  | "ignored_stale"
  | "accepted";

interface ListingIndexActionContext {
  projectId: string;
  meta: Listing.ListingUpdateMeta;
}

interface ListingIndexItemKey {
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}

interface ListingIndexScriptResult extends Listing.ListingUpdateResult {
  status: ListingIndexActionStatus;
}

interface ListingIndexBatchScriptResult
  extends Listing.SyncSellableItemsResult {
  results: ListingIndexScriptResult[];
}
```

Responsibilities:

- `ListingIndexActionContext` переносит общую metadata action в scripts.
- `ListingIndexItemKey` фиксирует canonical identity без internal doc ids.
- `ListingIndexScriptResult` повторяет публичный result contract, но делает
  status локально переиспользуемым между scripts.

## Validation script

```ts
interface ListingUpdateValidationIssue {
  code:
    | "UNSUPPORTED_CONTRACT_VERSION"
    | "PROJECT_MISMATCH"
    | "VALIDATION_FAILED";
  field?: string[];
  message: string;
}

interface ListingUpdateValidationResult {
  ok: boolean;
  issues: ListingUpdateValidationIssue[];
}

interface ListingUpdateContractValidator {
  validateSyncParams(
    params: Listing.SyncSellableItemParams
  ): ListingUpdateValidationResult;

  validateBatchSyncParams(
    params: Listing.SyncSellableItemsParams
  ): ListingUpdateValidationResult;

  validateDeleteParams(
    params: Listing.DeleteSellableItemParams
  ): ListingUpdateValidationResult;
}
```

Responsibilities:

- Проверяет `contractVersion`, `projectId`, timestamps и обязательные поля.
- Проверяет duplicate variant ids, duplicate facet value handles и currency
  format.
- Проверяет `productFacets[].scope = "product"` и
  `variants[].facets[].scope = "variant"`.
- Не обращается в database и не строит физические index rows.

## Idempotency/revision script

```ts
interface ListingIndexUpdateState {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  sourceRevision: number;
  idempotencyKey: string;
  operationId: string;
  status: ListingIndexActionStatus;
  processedAt: string;
}

interface ListingIndexUpdateDecision {
  kind: "apply" | "noop" | "ignored_stale";
  previousState?: ListingIndexUpdateState;
}

class ListingIndexUpdateStateScript extends BaseScript<
  ListingIndexActionContext & {
    itemRef: Listing.ListingSellableItemRef;
    sourceRevision: number;
  },
  ListingIndexUpdateDecision
> {}
```

Responsibilities:

- Загружает последнее принятое состояние item update.
- Возвращает `noop`, если `idempotencyKey` уже обработан.
- Возвращает `ignored_stale`, если incoming `sourceRevision` меньше текущей.
- Возвращает `apply`, если incoming snapshot нужно применить.
- Не обновляет физический индекс. Фиксация нового state происходит после
  успешного index write.

## Write model builder

```ts
interface ListingItemDocIds {
  productDocId: number;
  variantDocIdsByVariantId: ReadonlyMap<string, number>;
}

interface ListingProductFacetMemberships {
  categoryValueKeys: string[];
  vendorValueKeys: string[];
  facetValueKeys: string[];
}

interface ListingVariantFacetMemberships {
  variantDocId: number;
  variantProductValueKeys: string[];
  facetValueKeys: string[];
}

interface ListingItemWriteModel {
  itemRef: Listing.ListingSellableItemRef;
  productDocId: number;
  variantDocIds: number[];

  productRow: ProductListingIndexUpsertInput;
  productPriceRows: ProductListingPriceRowInput[];
  productSortRows: ProductSortRowInput[];
  productTitleSearchRows: ProductTitleBm25RowInput[];
  productMemberships: ListingProductFacetMemberships;

  variantRows: VariantListingIndexUpsertInput[];
  variantPriceRowsByVariantId: ReadonlyMap<
    string,
    readonly VariantListingPriceRowInput[]
  >;
  runtimeVariantPriceRowsByVariantDocId: ReadonlyMap<
    number,
    readonly RuntimeVariantPriceRowInput[]
  >;
  variantMemberships: ListingVariantFacetMemberships[];

  touchedVariantDocIds: number[];
}

interface ListingItemWriteModelBuilder {
  buildSyncWriteModel(input: {
    item: Listing.ListingSellableItemSnapshot;
    docIds: ListingItemDocIds;
  }): ListingItemWriteModel;
}
```

Responsibilities:

- Конвертирует публичный snapshot в физические repository DTOs.
- Мапит `entityType = "product"` в `kind = "BASE"`, `entityType = "bundle"` в
  `kind = "BUNDLE"`.
- Мапит `status = "published"` в listing `published`, все остальные public
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
- Не выполняет database writes.

## Sync single item script

```ts
class ListingSyncSellableItemScript extends BaseScript<
  Listing.SyncSellableItemParams,
  Listing.SyncSellableItemResult
> {
  protected execute(
    params: Listing.SyncSellableItemParams
  ): Promise<Listing.SyncSellableItemResult>;
}
```

Responsibilities:

- Валидирует action params через `ListingUpdateContractValidator`.
- Проверяет project boundary.
- Открывает item-level transaction.
- Под item lock проверяет idempotency/revision через
  `ListingIndexUpdateStateScript`.
- В этой же transaction:
  - выделяет или сохраняет `product_doc_id`;
  - создает bootstrap product row для FK safety;
  - выделяет или сохраняет `variant_doc_id` для всех variants snapshot;
  - строит `ListingItemWriteModel`;
  - применяет write model через `ListingApplyItemWriteModelScript`;
  - удаляет stale variants, которых больше нет в full snapshot;
  - сохраняет update state как `applied`.
- Возвращает `applied`, `noop` или `ignored_stale`.
- При validation error возвращает стабильный non-retryable error contract.

## Apply item write model script

```ts
class ListingApplyItemWriteModelScript extends BaseScript<
  {
    context: ListingIndexActionContext;
    writeModel: ListingItemWriteModel;
  },
  {
    productDocId: number;
    touchedVariantDocIds: number[];
  }
> {
  protected execute(params: {
    context: ListingIndexActionContext;
    writeModel: ListingItemWriteModel;
  }): Promise<{
    productDocId: number;
    touchedVariantDocIds: number[];
  }>;
}
```

Responsibilities:

- Выполняет только physical index writes для уже построенной write model.
- Выполняется внутри transaction, открытой parent sync/delete script.
- Не вызывает `txManager.run`, если parent transaction уже активна.
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
- Не принимает public snapshot и не содержит mapping rules.

## Delete item script

```ts
class ListingDeleteSellableItemScript extends BaseScript<
  Listing.DeleteSellableItemParams,
  Listing.DeleteSellableItemResult
> {
  protected execute(
    params: Listing.DeleteSellableItemParams
  ): Promise<Listing.DeleteSellableItemResult>;
}
```

Responsibilities:

- Валидирует delete action params.
- Открывает item-level transaction.
- Под item lock проверяет idempotency/revision.
- В этой же transaction находит current `product_doc_id` и `variant_doc_id`
  для item.
- В этой же transaction:
  - удаляет product posting memberships;
  - удаляет variant posting memberships;
  - удаляет runtime variant price rows;
  - удаляет variant source/debug price rows;
  - удаляет variant listing rows;
  - refreshes affected projection blocks;
  - удаляет product sort rows;
  - удаляет product BM25 title rows;
  - удаляет product aggregate price rows;
  - удаляет product listing row;
  - сохраняет update state как `applied`.
- Возвращает `noop`, если item уже удален той же idempotency/revision.
- Возвращает `ignored_stale`, если delete старее текущей принятой revision.

## Batch sync script

```ts
interface ListingBatchSyncOptions {
  chunkSize: number;
  continueOnItemError: boolean;
}

class ListingSyncSellableItemsScript extends BaseScript<
  Listing.SyncSellableItemsParams & {
    options?: Partial<ListingBatchSyncOptions>;
  },
  Listing.SyncSellableItemsResult
> {
  protected execute(
    params: Listing.SyncSellableItemsParams & {
      options?: Partial<ListingBatchSyncOptions>;
    }
  ): Promise<Listing.SyncSellableItemsResult>;
}
```

Responsibilities:

- Валидирует batch-level metadata and duplicate item refs.
- Делит items на chunks, если выбран `per_chunk` mode.
- По умолчанию открывает отдельную transaction на каждый item.
- Для каждого item вызывает `ListingSyncSellableItemScript` или общий internal
  single-item executor.
- В `per_item` mode ошибка одного item не откатывает остальные items.
- В `per_chunk` mode ошибка item откатывает весь chunk, но не остальные chunks.
- Возвращает `status = "completed"`, если все items applied/noop/stale.
- Возвращает `status = "partial"`, если часть items завершилась validation или
  infrastructure error.

## Stale variant cleanup script

```ts
class ListingCleanupStaleVariantsScript extends BaseScript<
  {
    projectId: string;
    productId: string;
    productDocId: number;
    nextVariantIds: readonly string[];
  },
  {
    deletedVariantIds: string[];
    deletedVariantDocIds: number[];
  }
> {}
```

Responsibilities:

- Находит variants, которые сейчас есть в index для product, но отсутствуют в
  full incoming snapshot.
- Выполняется внутри parent item transaction.
- Удаляет их variant memberships, variant prices, runtime price rows и
  `variant_listing_index` rows.
- Возвращает touched variant doc ids для projection block refresh.
- Не трогает product-level rows.

## Product search rows script

```ts
class ListingReplaceProductTitleSearchRowsScript extends BaseScript<
  {
    productId: string;
    rows: readonly ProductTitleBm25RowInput[];
  },
  {
    insertedOrUpdated: number;
    deleted: number;
  }
> {}
```

Responsibilities:

- Делает replace localized BM25 rows для product.
- Выполняется внутри parent item transaction.
- Если rows пустые, удаляет все BM25 title rows product.
- Используется sync script, когда title/locales/status/searchability changed.
- Не выполняет search queries.

## Runtime price rows script

```ts
class ListingReplaceRuntimeVariantPriceRowsScript extends BaseScript<
  {
    rowsByVariantDocId: ReadonlyMap<
      number,
      readonly RuntimeVariantPriceRowInput[]
    >;
  },
  {
    touchedVariantDocIds: number[];
  }
> {}
```

Responsibilities:

- Replace runtime price rows для variants.
- Выполняется внутри parent item transaction.
- Empty rows for variant doc id удаляют runtime price rows этого variant.
- Возвращает touched variants для projection block refresh не требуется, но
  результат полезен для unified write metrics.

## Sort rows script

```ts
class ListingReplaceProductSortRowsScript extends BaseScript<
  {
    productDocId: number;
    rows: readonly ProductSortRowInput[];
  },
  {
    replaced: number;
  }
> {}
```

Responsibilities:

- Replace all physical sort rows for one product doc id.
- Выполняется внутри parent item transaction.
- Empty rows удаляют sort rows product.
- Не выбирает страницы listing и не применяет storefront cursors.

## Repository API additions

Большая часть write repository API уже описана и частично существует. Для
полной action processing реализации нужны дополнительные методы ниже.

### `ListingIndexUpdateStateRepository`

New table/repository is recommended.

```ts
interface ListingIndexUpdateStateKey {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}

interface ListingIndexUpdateStateRow
  extends ListingIndexUpdateStateKey {
  sourceRevision: number;
  idempotencyKey: string;
  operationId: string;
  status: ListingIndexActionStatus;
  processedAt: string;
  resultJson: Listing.ListingUpdateResult;
}

class ListingIndexUpdateStateRepository extends BaseRepository {
  findByItem(
    key: ListingIndexUpdateStateKey
  ): Promise<ListingIndexUpdateStateRow | null>;

  findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<ListingIndexUpdateStateRow | null>;

  lockByItem(
    key: ListingIndexUpdateStateKey
  ): Promise<ListingIndexUpdateStateRow | null>;

  upsertAppliedState(
    row: ListingIndexUpdateStateRow
  ): Promise<ListingIndexUpdateStateRow>;
}
```

Responsibilities:

- Хранит последнюю примененную source revision item.
- Позволяет безопасно различать `apply`, `noop` и `ignored_stale`.
- `lockByItem` используется внутри item transaction для serial update по item.
- `resultJson` позволяет вернуть стабильный result при retry той же
  idempotency.

### `VariantListingIndexRepository` additions

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

Responsibilities:

- Поддерживает full snapshot semantics для variants.
- Позволяет удалить stale variants, которых больше нет в incoming item.
- Возвращает deleted doc ids, чтобы caller мог удалить memberships и refresh
  projection blocks.

### `ProductTitleBm25SearchIndexRepository` additions

```ts
class ProductTitleBm25SearchIndexRepository extends BaseRepository {
  replaceForProduct(
    productId: string,
    rows: readonly ProductTitleBm25RowInput[]
  ): Promise<ProductTitleBm25SearchIndex[]>;
}
```

Responsibilities:

- Делает delete+insert/upsert localized title rows для product.
- Empty rows mean product is not searchable and all current title rows must be
  deleted.
- Сохраняет `searchId` там, где текущий repository upsert уже умеет это делать.

### `ListingPostingBitmapRepository` additions

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

Responsibilities:

- Convenience methods над существующими `replaceProductMemberships` и
  `replaceVariantMemberships`.
- Уменьшают вероятность, что sync script забудет один из обязательных fields.
- Не меняют physical bitmap semantics.

### `ListingRepository` facade additions

```ts
class Repository {
  readonly listingIndexUpdateState: ListingIndexUpdateStateRepository;

  runListingIndexItemTransaction<TResult>(
    fn: () => Promise<TResult>
  ): Promise<TResult>;
}
```

Responsibilities:

- Экспортирует update-state repository рядом с остальными listing write
  repositories.
- `runListingIndexItemTransaction` является тонким wrapper над `txManager.run`
  для единообразного caller code. Если проект не хочет отдельный wrapper,
  scripts могут напрямую использовать `repository.txManager.run`.

## Минимальный порядок вызова для `syncSellableItem`

```ts
await repository.txManager.run(async () => {
  await repository.listingIndexUpdateState.lockByItem(itemKey);

  const productDocIds =
    await repository.listingDocIdAllocator.allocateProductDocIds([item.id]);

  await repository.productListingIndex.ensureBootstrapRows([...]);

  const variantDocIds =
    await repository.listingDocIdAllocator.allocateVariantDocIds(variantIds);

  const writeModel = writeModelBuilder.buildSyncWriteModel({
    item,
    docIds,
  });

  await applyItemWriteModelScript.run({ context, writeModel });
  await cleanupStaleVariantsScript.run(...);
  await repository.listingIndexUpdateState.upsertAppliedState(...);
});
```

Этот блок является sequencing contract, не implementation.

## Acceptance checklist

- [ ] Broker actions больше не возвращают
      `LISTING_INDEX_UPDATE_NOT_IMPLEMENTED` для successful processing.
- [ ] Все action handlers делегируют работу scripts.
- [ ] Full snapshot sync удаляет stale variants.
- [ ] Delete action удаляет product, variants, memberships, prices, sort rows и
      BM25 rows.
- [ ] `sourceRevision` защищает от stale updates.
- [ ] `idempotencyKey` защищает от повторного применения retries.
- [ ] Mapping rules живут в write model builder, а не в repositories.
- [ ] Repositories остаются project-scoped через `this.storeId`.
- [ ] Storefront query repositories не используются для write processing.
- [ ] Реализация не требует запуска `test` или `tsc`; для проверки новой версии
      кода используется build согласно project rules.
