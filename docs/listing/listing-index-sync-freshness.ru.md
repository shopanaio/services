# Актуальность таблиц listing index и синхронизация read model

## Назначение документа

Документ описывает, как после переработки listing index будет обеспечиваться
актуальность таблиц:

- `catalog.product_listing_index`
- `catalog.product_listing_price_index`
- `catalog.variant_listing_index`
- `catalog.variant_listing_price_index`
- `catalog.product_listing_facet_token`
- `catalog.variant_listing_facet_token`

Нормативные требования к storefront semantics описаны в
`docs/listing/listing-index-redesign-plan.ru.md`. Целевая схема БД описана в
`docs/listing/listing-index-db-schema.ru.md`. Этот документ фокусируется только
на write/sync lifecycle и на коде, который нужно реализовать, чтобы read model
оставалась согласованной с canonical catalog data.

## Базовый принцип актуальности

Listing index является производной read model. Canonical source of truth
остается в доменных таблицах catalog: product, variant, categories, tags,
features, options, prices, inventory, project currencies и facet configuration.

Актуальность обеспечивается тремя слоями:

1. **Инкрементальный sync после доменных изменений.** Event handlers и
   workflow steps запускают targeted refresh затронутых products/variants.
2. **Идемпотентный rebuild.** Полный rebuild может пересоздать все listing
   таблицы из canonical tables и `facet_value_source_handle`.
3. **Freshness audit.** Диагностические запросы находят missing/stale rows,
   orphan tokens и расхождения агрегатов, после чего запускается targeted
   resync или project rebuild.

DB triggers для поддержки listing index не нужны. Логика синхронизации должна
жить в scripts/repositories/workflows, чтобы правила variant matching,
currency handling и facet mapping были видимы в TypeScript-коде и покрывались
проектными паттернами transaction-aware repositories.

## Инварианты freshness

### Product row

Для каждого non-deleted product должна существовать одна строка
`product_listing_index` с ключом `(project_id, product_id)`.

Строка должна отражать:

- `kind`, `vendor_id`, `handle`;
- `status = 'published'`, если product published и не soft-deleted;
- `status = 'draft'`, если product существует, но не published;
- `published_at`, `product_created_at`, `product_updated_at`,
  `product_revision`;
- `tag_handles`, `feature_value_handles`, `category_handles`;
- `in_stock` и `total_stock`, посчитанные по active variants из
  `variant_listing_index`.

Soft-deleted или hard-deleted product не должен оставаться в listing index.
Удаление product должно удалять product row, product price rows, product tokens,
variant rows, variant price rows и variant tokens. FK `ON DELETE CASCADE` может
страховать hard delete, но sync script должен явно удалять read-model rows для
soft delete.

### Product price rows

Для каждого product и каждой enabled project currency должна существовать одна
строка `product_listing_price_index`.

`min_price_minor`, `max_price_minor` и `has_price` считаются только по active
in-stock variants, у которых есть `variant_listing_price_index.has_price =
true` в этой currency. Если в currency нет ни одного priced in-stock variant,
нужно сохранить row с `has_price = false` и `NULL` price fields. Это важно для
детерминированных `NULLS LAST` sort и диагностики отсутствующих цен.

### Variant row

Для каждого active non-deleted variant должна существовать одна строка
`variant_listing_index` с ключом `(project_id, variant_id)`.

Строка должна отражать:

- parent `product_id`;
- product `kind`;
- `variant_created_at`, `variant_updated_at`;
- `option_value_handles` в формате `option_slug:value_slug`;
- `in_stock` и `total_stock`.

Inactive/deleted variants должны быть удалены из variant listing tables.
Out-of-stock variants остаются в `variant_listing_index`, но не удовлетворяют
storefront option/price predicates, counts и matched price sort.

### Variant price rows

Для каждого active variant и каждой enabled project currency должна быть одна
строка `variant_listing_price_index`.

Если у variant нет текущей цены в currency, row сохраняется с `has_price =
false` и `price_minor = NULL`. Option predicates могут по-прежнему матчить этот
variant, но price predicates должны его исключать.

### Facet tokens

Token tables должны содержать только resolved storefront ids:
`facet_id` и `facet_value_id`. Raw source handles не должны использоваться на
storefront read path.

`product_listing_facet_token` хранит tokens для tag/feature. Ключ
`(project_id, product_id, facet_id, facet_value_id)` дедуплицирует merged
source mappings.

`variant_listing_facet_token` хранит option tokens. Ключ
`(project_id, variant_id, facet_id, facet_value_id)` сохраняет same-variant
semantics для option + price filters.

Если `facet_value_source_handle` изменился, tokens считаются stale даже если
product/variant не менялся.

## Код, который нужно добавить или заменить

### Drizzle models

Заменить старые модели:

- `services/catalog/src/repositories/models/searchIndex.ts`
- `services/catalog/src/repositories/models/variantSearchIndex.ts`

на новые модели:

- `services/catalog/src/repositories/models/productListingIndex.ts`
- `services/catalog/src/repositories/models/productListingPriceIndex.ts`
- `services/catalog/src/repositories/models/variantListingIndex.ts`
- `services/catalog/src/repositories/models/variantListingPriceIndex.ts`
- `services/catalog/src/repositories/models/productListingFacetToken.ts`
- `services/catalog/src/repositories/models/variantListingFacetToken.ts`

Модели должны совпадать с `listing-index-db-schema.ru.md`: composite primary
keys, `project_id` в FK, check constraints для `status`/`facet_type`, partial
indexes для price rows и GIN index только для `category_handles`.

`services/catalog/src/repositories/models/index.ts` должен экспортировать новые
модели и перестать экспортировать старые `productSearchIndex` /
`variantSearchIndex` после миграции callers.

### Repository registration

В `services/catalog/src/repositories/Repository.ts` заменить:

- `searchIndex: SearchIndexRepository`
- `variantSearchIndex: VariantSearchIndexRepository`

на:

- `productListingIndex: ProductListingIndexRepository`
- `productListingPriceIndex: ProductListingPriceIndexRepository`
- `variantListingIndex: VariantListingIndexRepository`
- `variantListingPriceIndex: VariantListingPriceIndexRepository`
- `productListingFacetToken: ProductListingFacetTokenRepository`
- `variantListingFacetToken: VariantListingFacetTokenRepository`
- `listingQuery: ListingQueryRepository`
- `facetAggregation: FacetAggregationRepository`
- `listingFreshness: ListingFreshnessRepository`

Все repositories должны наследоваться от `BaseRepository`, использовать только
`this.connection` и брать `project_id` из context (`this.storeId`). Прямой
доступ к `this.db` внутри repository methods запрещен, потому что он обходит
transaction propagation.

### ProductListingIndexRepository

Файл:
`services/catalog/src/repositories/listing/ProductListingIndexRepository.ts`.

Нужные методы:

- `findByProductId(productId)`
- `getByProductIds(productIds)`
- `upsert(input)`
- `delete(productId)`
- `deleteByProductIds(productIds)`
- `deleteMissingProducts(productIds)`
- `getStaleProducts(params)`

`upsert` должен делать `insert ... onConflictDoUpdate` по
`(project_id, product_id)`, обновлять все materialized fields и выставлять
`updated_at = now`. `indexed_at` должен обновляться при полном пересчете row.

`deleteMissingProducts` нужен для sync, когда batch canonical product ids уже
прочитан, а часть products оказалась deleted/missing.

`getStaleProducts` должен сравнивать canonical `product.updated_at` /
`revision` с `product_listing_index.product_updated_at` /
`product_revision`, а также находить products без listing row.

### ProductListingPriceIndexRepository

Файл:
`services/catalog/src/repositories/listing/ProductListingPriceIndexRepository.ts`.

Нужные методы:

- `replaceForProduct(productId, rows)`
- `replaceForProducts(rowsByProductId)`
- `deleteByProductId(productId)`
- `deleteByProductIds(productIds)`
- `getByProductIds(productIds, currencies?)`
- `getStalePriceAggregates(params)`

`replaceForProduct` должен быть atomic внутри текущей transaction:

1. удалить rows product/currency, которые больше не входят в enabled
   currencies;
2. upsert rows для всех enabled currencies;
3. сохранить empty aggregate rows с `has_price = false`.

Product price aggregate нельзя считать из canonical price table напрямую. Он
должен считаться из `variant_listing_index` +
`variant_listing_price_index`, чтобы product aggregate всегда наследовал те же
правила active variant, in-stock и enabled currencies, которые использует
storefront listing.

### VariantListingIndexRepository

Файл:
`services/catalog/src/repositories/listing/VariantListingIndexRepository.ts`.

Нужные методы:

- `findByVariantId(variantId)`
- `getByVariantIds(variantIds)`
- `getByProductIds(productIds)`
- `upsert(input)`
- `upsertMany(inputs)`
- `delete(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `getStockAggregatesByProductIds(productIds)`
- `getActiveVariantIdsByProductIds(productIds)`
- `getStaleVariants(params)`

`getStockAggregatesByProductIds` возвращает `total_stock` и `in_stock` по
current variant listing rows. Этот метод используется product sync script.

`upsertMany` должен делать batch insert/upsert. Для больших rebuild batches
нельзя вызывать один upsert на variant в цикле, если это создает тысячи round
trips.

### VariantListingPriceIndexRepository

Файл:
`services/catalog/src/repositories/listing/VariantListingPriceIndexRepository.ts`.

Нужные методы:

- `replaceForVariant(variantId, rows)`
- `replaceForVariants(rowsByVariantId)`
- `deleteByVariantId(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `getPriceAggregatesByProductIds(productIds, currencies)`
- `getStaleVariantPrices(params)`

`getPriceAggregatesByProductIds` должен группировать только rows, где:

- `variant_listing_index.in_stock = true`;
- `variant_listing_price_index.has_price = true`;
- currency входит в enabled project currencies.

Возвращаемый shape:

```ts
interface ProductPriceAggregateRow {
  productId: string;
  currency: string;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  hasPrice: boolean;
}
```

### ProductListingFacetTokenRepository

Файл:
`services/catalog/src/repositories/listing/ProductListingFacetTokenRepository.ts`.

Нужные методы:

- `replaceForProduct(productId, tokens)`
- `replaceForProducts(rowsByProductId)`
- `deleteByProductId(productId)`
- `deleteByProductIds(productIds)`
- `findProductsBySourceHandleChange(input)`
- `getTokenCountsForAudit(params)`

`replaceForProduct` должен удалять все старые product tokens для product и
вставлять deduplicated tokens. Это проще и надежнее, чем diff на token level:
source mappings могут merge/split values, а primary key уже защитит от
дубликатов.

`findProductsBySourceHandleChange` нужен для refresh после изменения
`facet_value_source_handle`. Для tag/feature mapping он должен найти products,
которые содержат affected source handles в canonical assignments. Если дешево
найти affected products нельзя, caller должен запускать project token rebuild.

### VariantListingFacetTokenRepository

Файл:
`services/catalog/src/repositories/listing/VariantListingFacetTokenRepository.ts`.

Нужные методы:

- `replaceForVariant(variantId, tokens)`
- `replaceForVariants(rowsByVariantId)`
- `deleteByVariantId(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `findVariantsBySourceHandleChange(input)`
- `getTokenCountsForAudit(params)`

`replaceForVariant` должен сохранять `product_id`, потому что option counts и
listing filters часто переходят от product candidate set к variant token set.

### ListingSourceRepository

Файл:
`services/catalog/src/repositories/listing/ListingSourceRepository.ts`.

Это read-only repository для загрузки canonical source данных крупными batches.
Он нужен, чтобы sync scripts не собирали aggregate через множество мелких
domain repository calls.

Нужные методы:

- `getProductSources(productIds)`
- `getVariantSourcesByProductIds(productIds)`
- `getVariantSourcesByVariantIds(variantIds)`
- `getProductFacetSources(productIds)`
- `getVariantOptionSources(variantIds)`
- `getCurrentVariantPrices(variantIds, currencies)`
- `getVariantStockSources(variantIds)`
- `getEnabledProjectCurrencies()`
- `getDefaultCurrency()`
- `getProductsForRebuild(cursor, limit)`
- `getVariantsForRebuild(productIds)`

`getProductSources` должен возвращать product fields, visibility, revision,
kind, vendor, handle, timestamps and deleted state.

`getProductFacetSources` должен возвращать:

- `tag_handles`;
- `feature_value_handles` в формате `feature_slug:value_slug`;
- `category_handles`.

`getVariantOptionSources` должен возвращать `option_value_handles` в формате
`option_slug:value_slug`.

### ListingFacetMappingRepository

Файл:
`services/catalog/src/repositories/listing/ListingFacetMappingRepository.ts`.

Отвечает за batch resolve source handles через canonical configuration:
`facet`, `facet_value`, `facet_value_source_handle`.

Нужные методы:

- `resolveProductFacetTokens(input)`
- `resolveVariantFacetTokens(input)`
- `resolveFacetSourceMappings(handles, facetTypes)`
- `getConfiguredFacetValueIds(params)`

Product token resolve:

- `tag` source handle сопоставляется с `facet_type = 'tag'`;
- `feature_slug:value_slug` сопоставляется с `facet_type = 'feature'`;
- результат: `{ productId, facetId, facetValueId, facetType }`.

Variant token resolve:

- `option_slug:value_slug` сопоставляется с `facet_type = 'option'`;
- результат: `{ productId, variantId, facetId, facetValueId }`.

Resolve должен игнорировать source handles без mapping. Ошибка не нужна:
unconfigured values не должны ломать listing sync.

## Builder код

### ProductListingRowBuilder

Файл:
`services/catalog/src/scripts/listing/ProductListingRowBuilder.ts`.

Отвечает только за pure mapping из загруженных source objects в rows для
listing repositories. Внутри builder не должно быть DB calls.

Вход:

```ts
interface ProductListingBuildInput {
  product: ProductSource;
  facetSources: ProductFacetSource;
  stockAggregate: ProductStockAggregate;
  priceAggregates: ProductPriceAggregateRow[];
  enabledCurrencies: string[];
  now: string;
}
```

Выход:

```ts
interface ProductListingBuildOutput {
  productRow: ProductListingIndexUpsertInput | null;
  priceRows: ProductListingPriceUpsertInput[];
  productFacetHandles: {
    tagHandles: string[];
    featureValueHandles: string[];
  };
  shouldDelete: boolean;
}
```

Если product missing/deleted, builder возвращает `shouldDelete = true`.

### VariantListingRowBuilder

Файл:
`services/catalog/src/scripts/listing/VariantListingRowBuilder.ts`.

Вход:

```ts
interface VariantListingBuildInput {
  variant: VariantSource;
  optionSources: VariantOptionSource;
  stockSource: VariantStockSource;
  priceRows: VariantCurrencyPriceSource[];
  enabledCurrencies: string[];
  now: string;
}
```

Выход:

```ts
interface VariantListingBuildOutput {
  variantRow: VariantListingIndexUpsertInput | null;
  priceRows: VariantListingPriceUpsertInput[];
  optionValueHandles: string[];
  shouldDelete: boolean;
}
```

Если variant inactive/deleted/missing, builder возвращает `shouldDelete =
true`.

## Sync scripts

Все scripts должны использовать существующий pattern `BaseScript` и
`executeScript`. Write scripts должны выполняться внутри transaction через
kernel/transaction manager, чтобы replace rows и aggregate refresh были atomic.

### SyncVariantListingIndexScript

Файл:
`services/catalog/src/scripts/listing/SyncVariantListingIndexScript.ts`.

Параметры:

```ts
interface SyncVariantListingIndexParams {
  productIds?: string[];
  variantIds?: string[];
  reason: ListingIndexSyncReason;
  changedCurrencies?: string[];
}
```

Результат:

```ts
interface SyncVariantListingIndexResult {
  syncedVariantIds: string[];
  deletedVariantIds: string[];
  affectedProductIds: string[];
  priceRowsWritten: number;
  optionTokensWritten: number;
}
```

Алгоритм:

1. Нормализовать input. Если переданы `variantIds`, загрузить parent
   `productIds`. Если переданы только `productIds`, загрузить active variants
   этих products.
2. Загрузить enabled project currencies.
3. Загрузить variant sources, option sources, current prices и stock sources
   batch-запросами через `ListingSourceRepository`.
4. Для каждого variant собрать `variant_listing_index` row и price rows через
   `VariantListingRowBuilder`.
5. Для deleted/missing variants удалить:
   `variant_listing_facet_token`, `variant_listing_price_index`,
   `variant_listing_index`.
6. Для active variants upsert:
   `variant_listing_index`, затем `variant_listing_price_index`.
7. Batch-resolve option source handles через `ListingFacetMappingRepository`.
8. Replace `variant_listing_facet_token` для affected variants.
9. Запустить `SyncProductListingIndexScript` для affected products, потому что
   product `in_stock`, `total_stock` и price aggregates зависят от variant rows.

Порядок важен: сначала variant rows/price/tokens, затем product aggregate.
Иначе product sync прочитает старое состояние variant index.

### SyncProductListingIndexScript

Файл:
`services/catalog/src/scripts/listing/SyncProductListingIndexScript.ts`.

Параметры:

```ts
interface SyncProductListingIndexParams {
  productIds: string[];
  reason: ListingIndexSyncReason;
  refreshVariantsFirst?: boolean;
}
```

Результат:

```ts
interface SyncProductListingIndexResult {
  syncedProductIds: string[];
  deletedProductIds: string[];
  priceRowsWritten: number;
  productTokensWritten: number;
}
```

Алгоритм:

1. Если `refreshVariantsFirst = true`, сначала выполнить
   `SyncVariantListingIndexScript` для этих products. Для обычных product
   metadata/tag/category/feature changes это не требуется.
2. Загрузить product sources.
3. Для missing/deleted products выполнить delete cascade на listing
   repositories:
   product tokens, product prices, product row, variant tokens, variant prices,
   variant rows.
4. Загрузить product facet sources: tags, features, categories.
5. Загрузить stock aggregates из `variant_listing_index`.
6. Загрузить price aggregates из `variant_listing_index` +
   `variant_listing_price_index`.
7. Собрать product rows и product price rows через
   `ProductListingRowBuilder`.
8. Upsert `product_listing_index`.
9. Replace `product_listing_price_index` rows для enabled currencies.
10. Batch-resolve tag/feature source handles через
    `ListingFacetMappingRepository`.
11. Replace `product_listing_facet_token`.

Product sync не должен читать option tokens и не должен пересчитывать variant
rows, если изменение не затрагивает variants. Это сохраняет targeted refresh
дешевым.

### DeleteProductListingIndexScript

Файл:
`services/catalog/src/scripts/listing/DeleteProductListingIndexScript.ts`.

Параметры:

```ts
interface DeleteProductListingIndexParams {
  productId: string;
  reason: ListingIndexSyncReason;
}
```

Алгоритм:

1. Удалить `variant_listing_facet_token` по product.
2. Удалить `variant_listing_price_index` по product.
3. Удалить `variant_listing_index` по product.
4. Удалить `product_listing_facet_token` по product.
5. Удалить `product_listing_price_index` по product.
6. Удалить `product_listing_index` по product.

Даже если FK cascade покрывает часть операций, explicit delete нужен для
soft-delete и для понятных counters/logs.

### RefreshListingFacetTokensScript

Файл:
`services/catalog/src/scripts/listing/RefreshListingFacetTokensScript.ts`.

Параметры:

```ts
interface RefreshListingFacetTokensParams {
  facetTypes: Array<"tag" | "feature" | "option">;
  sourceHandles?: string[];
  productIds?: string[];
  variantIds?: string[];
  fallbackToProjectRebuild?: boolean;
  reason: ListingIndexSyncReason;
}
```

Назначение: пересчитать tokens после изменения `facet_value_source_handle`,
merge/split facet values или изменения facet configuration.

Алгоритм:

1. Если переданы productIds для tag/feature, выполнить product token refresh
   для этих products без пересчета variant rows.
2. Если переданы variantIds для option, выполнить variant token refresh для
   этих variants без пересчета prices/stock.
3. Если переданы only sourceHandles, попытаться найти affected products или
   variants через `findProductsBySourceHandleChange` /
   `findVariantsBySourceHandleChange`.
4. Если affected set нельзя найти дешево и
   `fallbackToProjectRebuild = true`, запустить rebuild token tables для
   project.
5. Replace affected token rows целиком.

Этот script не должен менять `product_listing_index` или price rows, потому что
source mapping changes меняют только resolved storefront tokens.

### RebuildListingIndexScript

Файл:
`services/catalog/src/scripts/listing/RebuildListingIndexScript.ts`.

Параметры:

```ts
interface RebuildListingIndexParams {
  batchSize?: number;
  productIds?: string[];
  truncate?: boolean;
  reason: ListingIndexSyncReason;
}
```

Алгоритм full rebuild:

1. Взять project advisory lock, чтобы два rebuild не шли параллельно.
2. Если `truncate = true`, очистить listing tables в порядке:
   variant tokens, product tokens, variant prices, product prices, variant
   index, product index.
3. Читать products batches через `ListingSourceRepository.getProductsForRebuild`.
4. Для каждого batch сначала выполнить `SyncVariantListingIndexScript` с
   `productIds`.
5. Затем выполнить `SyncProductListingIndexScript` с теми же `productIds`.
6. Логировать counters: products, variants, currencies, price rows, product
   tokens, variant tokens, deleted/skipped rows.
7. После rebuild запустить `ListingFreshnessRepository.auditProject`.

Для частичного rebuild по `productIds` truncate не используется.

## Workflow и event handlers

### ListingIndexSyncReason

Добавить общий тип:

```ts
type ListingIndexSyncReason =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "product_visibility_changed"
  | "product_category_changed"
  | "category_handle_changed"
  | "product_tag_changed"
  | "tag_handle_changed"
  | "product_feature_changed"
  | "feature_handle_changed"
  | "variant_created"
  | "variant_updated"
  | "variant_deleted"
  | "variant_option_changed"
  | "option_handle_changed"
  | "variant_price_changed"
  | "stock_changed"
  | "project_currency_changed"
  | "facet_mapping_changed"
  | "manual_rebuild"
  | "freshness_repair";
```

Reason должен попадать в logs, workflow input и audit history. Это упростит
разбор stale rows.

### Event handlers

Существующий `services/catalog/src/handlers/index.ts` должен вызывать новые
scripts вместо старых:

- `productCreated` -> `SyncProductListingIndexScript` с
  `refreshVariantsFirst = true`;
- `productUpdated` -> выбор targeted refresh по change set;
- `productDeleted` -> `DeleteProductListingIndexScript`.

`services/catalog/src/handlers/InventoryEventHandlers.ts` должен запускать
variant/product refresh после `stockLevelChanged`:

1. найти affected variant;
2. выполнить `SyncVariantListingIndexScript` для variant;
3. script сам обновит product aggregate.

Нужно добавить или расширить handlers для:

- category assignment changes;
- category handle changes;
- tag assignment and tag handle changes;
- feature/value changes;
- option/value changes;
- variant price changes;
- project enabled currencies changes;
- facet source mapping changes.

Если событие уже агрегируется в `productUpdated`, handler должен использовать
change set и не запускать лишний full variant refresh. Например изменение
product title не требует listing sync, если title не входит в listing index.

### DBOS workflow

Для тяжелых операций нужен durable workflow:

- `catalog.rebuildListingIndex`
- `catalog.syncListingIndexForProducts`
- `catalog.syncListingIndexForVariants`
- `catalog.refreshListingFacetTokens`

Workflow IDs должны быть deterministic:

- targeted product sync:
  `listing:product:{projectId}:{productId}:{reason}:{sourceRevision}`;
- targeted variant sync:
  `listing:variant:{projectId}:{variantId}:{reason}:{sourceRevision}`;
- mapping refresh:
  `listing:facet-mapping:{projectId}:{facetType}:{mappingRevision}`;
- rebuild:
  `listing:rebuild:{projectId}:{requestedAtOrManualKey}`.

Для event-triggered repeated sync можно использовать content idempotency:
resource id + reason + source revision/change hash. Это позволит безопасно
повторять event handler без двойной работы.

Workflow steps:

1. acquire project/product scoped advisory lock;
2. execute sync script;
3. run small freshness check for affected ids;
4. log result counters.

Advisory lock нужен не для correctness primary keys, а для уменьшения лишней
гонки между stock/price/variant events. Последний sync все равно должен быть
correct, потому что scripts всегда перечитывают canonical state перед записью.

## Карта invalidation

| Изменение | Что пересчитать |
| --- | --- |
| Product created | Variant rows for product, product row, product prices, product tokens |
| Product updated: kind/vendor/handle/revision/timestamps | Product row |
| Product publish/unpublish | Product row, visibility-sensitive listing reads сразу увидят новый status |
| Product deleted/soft-deleted | Delete all product and variant listing rows |
| Category assignment changed | Product `category_handles`, product row |
| Category handle changed | Product rows for products in category subtree/assignment |
| Product tag assignment changed | Product `tag_handles`, product tokens |
| Tag handle changed | Product rows/tokens for affected products |
| Product feature value changed | Product `feature_value_handles`, product tokens |
| Feature/value handle changed | Product rows/tokens for affected products |
| Variant created/updated/deleted | Variant row, variant prices, option tokens, parent product stock/price aggregate |
| Variant option link changed | Variant `option_value_handles`, variant option tokens |
| Option/value handle changed | Variant rows/tokens for affected variants |
| Variant current price changed | Variant price row for currency, parent product price aggregate |
| Inventory stock changed | Variant stock row, parent product stock aggregate, parent product price aggregates |
| Enabled currencies changed | Variant price rows and product price rows for project |
| Facet source mapping changed | Product or variant tokens for affected source handles |
| Facet value merge/split | Token refresh for affected mappings |

## Freshness audit code

### ListingFreshnessRepository

Файл:
`services/catalog/src/repositories/listing/ListingFreshnessRepository.ts`.

Нужные методы:

- `findMissingProductRows(limit)`
- `findStaleProductRows(limit)`
- `findUnexpectedProductRows(limit)`
- `findMissingVariantRows(limit)`
- `findStaleVariantRows(limit)`
- `findUnexpectedVariantRows(limit)`
- `findMissingVariantPriceRows(limit)`
- `findMissingProductPriceRows(limit)`
- `findProductAggregateMismatches(limit)`
- `findProductTokenMismatches(limit)`
- `findVariantTokenMismatches(limit)`
- `findOrphanListingRows(limit)`
- `auditProject(params)`

Freshness audit должен возвращать structured result:

```ts
interface ListingFreshnessAuditResult {
  missingProducts: string[];
  staleProducts: string[];
  unexpectedProducts: string[];
  missingVariants: string[];
  staleVariants: string[];
  unexpectedVariants: string[];
  aggregateMismatches: string[];
  tokenMismatches: {
    productIds: string[];
    variantIds: string[];
  };
  canRepairTargeted: boolean;
}
```

### Repair script

Файл:
`services/catalog/src/scripts/listing/RepairListingIndexFreshnessScript.ts`.

Алгоритм:

1. Запустить `ListingFreshnessRepository.auditProject`.
2. Для missing/stale/unexpected products выполнить targeted
   `SyncProductListingIndexScript` или delete.
3. Для missing/stale variants выполнить `SyncVariantListingIndexScript`.
4. Для token mismatches выполнить `RefreshListingFacetTokensScript`.
5. Если audit result слишком большой или `canRepairTargeted = false`, запустить
   `RebuildListingIndexScript`.

Этот script можно запускать вручную, из scheduled job или после full rebuild.

## Concurrency и порядок записи

Для одного product порядок записи должен быть таким:

1. variant index rows;
2. variant price rows;
3. variant option tokens;
4. product index row;
5. product price aggregate rows;
6. product facet tokens.

Если product sync и variant sync пришли одновременно, оба scripts перечитывают
canonical state. Поэтому более поздний script должен перезаписать stale
aggregate. Product aggregate refresh всегда запускается после variant sync,
чтобы stock/price изменения не оставляли product row stale.

Все replace operations по tokens и price rows должны выполняться в transaction.
Частичная запись, при которой old tokens удалены, а new tokens не вставлены, не
должна коммититься.

## Наблюдаемость

Каждый sync script должен логировать:

- `projectId`;
- `reason`;
- affected product/variant ids count;
- rows upserted/deleted по каждой listing table;
- token rows count;
- enabled currencies count;
- duration;
- workflow id, если script запущен из DBOS workflow.

Ошибки mapping resolve для unconfigured source handles не логируются как error.
Их можно считать debug/info counters: `unmappedTagHandles`,
`unmappedFeatureHandles`, `unmappedOptionHandles`.

## Acceptance criteria для sync lifecycle

- Любой product/variant/price/stock/facet mapping change имеет documented
  invalidation path.
- Targeted sync перечитывает canonical state перед записью и является
  идемпотентным.
- Product aggregate rows считаются из variant listing tables, а не из
  устаревшего in-memory state.
- Token generation использует только `facet_value_source_handle` и пишет
  resolved `facet_id` / `facet_value_id`.
- Replace token operations atomic и deduplicated primary key.
- Full rebuild может полностью восстановить listing tables после truncate.
- Freshness audit находит missing/stale/unexpected rows и может запустить
  targeted repair.
- Event handlers не используют старые `SearchIndexRepository` и
  `VariantSearchIndexRepository`.
- Storefront read path не читает raw `tag_handles`, `feature_value_handles` или
  `option_value_handles` для configured facets.
