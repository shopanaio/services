# План имплементации sync lifecycle для listing index и facets

## Назначение

Этот документ переводит требования из:

- `docs/listing/listing-index-redesign-plan.ru.md`
- `docs/listing/listing-index-db-schema.ru.md`
- `docs/listing/listing-index-sync-freshness.ru.md`

в пошаговый план изменений в коде catalog service. Фокус: как заменить старый
`product_search_index` / `variant_search_index` pipeline на новый listing read
model, как обновлять facet tokens и как обеспечить freshness repair.

Обратная совместимость со старыми search index таблицами не нужна. После
cutover listing index пересобирается rebuild script.

## Инварианты реализации

- Listing index является производной read model. Source of truth остается в
  canonical catalog tables.
- DB triggers не используются. Все правила sync должны быть видны в TypeScript:
  repositories, builders, scripts, workflows и event handlers.
- Все repository methods используют только `this.connection`, а не `this.db`,
  чтобы не обходить transaction propagation.
- Все queries должны быть scoped по `this.storeId` / `project_id`.
- Product aggregate price/stock считается из `variant_listing_index` и
  `variant_listing_price_index`, а не напрямую из canonical price/stock tables.
- Storefront configured facets читают только resolved `facet_id` и
  `facet_value_id` из token tables.
- Raw handles в index rows нужны для rebuild/debug и не должны быть read path
  для configured storefront facets.
- Replace operations по prices/tokens выполняются внутри transaction.
- При проверке реализации не запускать `test` и `tsc`. Если нужна проверка
  новой версии кода, запускать build через проектный workflow/shopana-cli.
- Changeset руками не редактировать.

## Целевая последовательность записи

Для одного product порядок должен быть стабильным:

1. bootstrap `product_listing_index` row, если parent row еще не существует;
2. `variant_listing_index`
3. `variant_listing_price_index`
4. `variant_listing_facet_token`
5. final `product_listing_index` upsert с актуальными aggregates;
6. `product_listing_price_index`
7. `product_listing_facet_token`

Причина: product sync читает variant read model для `in_stock`, `total_stock` и
price aggregates. Если product обновить раньше variant rows, aggregates могут
на один sync остаться stale.

Bootstrap row нужен из-за FK
`variant_listing_index(project_id, product_id) -> product_listing_index`. Для
new product flow он создает parent listing row с canonical product fields и
пустыми агрегатами. После записи variants product sync перезаписывает эту row
финальными `in_stock`, `total_stock` и price aggregates. Для existing products
bootstrap обычно no-op.

## Предусловие

Документ ниже описывает только код синхронизации read model. Целевая структура
таблиц считается уже определенной в `docs/listing/listing-index-db-schema.ru.md`.
Если схема еще не применена в окружении, sync код писать можно, но запуск
rebuild/sync будет невозможен до появления соответствующих listing tables.

## Фаза 1. Repository registration

Заменить в:

```text
services/catalog/src/repositories/Repository.ts
```

старые поля:

```ts
searchIndex: SearchIndexRepository;
variantSearchIndex: VariantSearchIndexRepository;
```

на новые:

```ts
productListingIndex: ProductListingIndexRepository;
productListingPriceIndex: ProductListingPriceIndexRepository;
variantListingIndex: VariantListingIndexRepository;
variantListingPriceIndex: VariantListingPriceIndexRepository;
productListingFacetToken: ProductListingFacetTokenRepository;
variantListingFacetToken: VariantListingFacetTokenRepository;
listingSource: ListingSourceRepository;
listingFacetMapping: ListingFacetMappingRepository;
listingFreshness: ListingFreshnessRepository;
```

Регистрация должна остаться простой: все repositories получают один `db` и один
`txManager`.

```ts
const productListingIndex = new ProductListingIndexRepository(db, txManager);
const variantListingIndex = new VariantListingIndexRepository(db, txManager);
const listingSource = new ListingSourceRepository(db, txManager);
```

## Фаза 2. Listing repositories

Создать папку:

```text
services/catalog/src/repositories/listing/
```

и заменить старые `SearchIndexRepository` / `VariantSearchIndexRepository`
новыми repositories.

### ProductListingIndexRepository

Файл:

```text
services/catalog/src/repositories/listing/ProductListingIndexRepository.ts
```

Минимальные методы:

```ts
export interface ProductListingIndexUpsertInput {
  productId: string;
  kind: "BASE" | "BUNDLE";
  vendorId: string | null;
  handle: string | null;
  status: "published" | "draft";
  publishedAt: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  tagHandles: string[];
  featureValueHandles: string[];
  categoryHandles: string[];
  inStock: boolean;
  totalStock: number;
  indexedAt?: string;
}
```

Пример `upsert`:

```ts
export class ProductListingIndexRepository extends BaseRepository {
  async upsert(input: ProductListingIndexUpsertInput) {
    const now = new Date().toISOString();
    const values: NewProductListingIndex = {
      projectId: this.storeId,
      productId: input.productId,
      kind: input.kind,
      vendorId: input.vendorId,
      handle: input.handle,
      status: input.status,
      publishedAt: input.publishedAt,
      productCreatedAt: input.productCreatedAt,
      productUpdatedAt: input.productUpdatedAt,
      productRevision: input.productRevision,
      tagHandles: input.tagHandles,
      featureValueHandles: input.featureValueHandles,
      categoryHandles: input.categoryHandles,
      inStock: input.inStock,
      totalStock: input.totalStock,
      indexedAt: input.indexedAt ?? now,
      updatedAt: now,
    };

    const rows = await this.connection
      .insert(productListingIndex)
      .values(values)
      .onConflictDoUpdate({
        target: [productListingIndex.projectId, productListingIndex.productId],
        set: {
          kind: values.kind,
          vendorId: values.vendorId,
          handle: values.handle,
          status: values.status,
          publishedAt: values.publishedAt,
          productCreatedAt: values.productCreatedAt,
          productUpdatedAt: values.productUpdatedAt,
          productRevision: values.productRevision,
          tagHandles: values.tagHandles,
          featureValueHandles: values.featureValueHandles,
          categoryHandles: values.categoryHandles,
          inStock: values.inStock,
          totalStock: values.totalStock,
          indexedAt: values.indexedAt,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return rows[0];
  }
}
```

Также добавить:

- `findByProductId(productId)`
- `getByProductIds(productIds)`
- `delete(productId)`
- `deleteByProductIds(productIds)`
- `deleteMissingProducts(productIds)`
- `ensureBootstrapRows(inputs)`
- `getStaleProducts(params)`

`ensureBootstrapRows` нужен только для FK parent row перед variant upsert. Он
должен делать idempotent upsert canonical product fields с пустыми aggregates и
не трогать product price/token rows.

```ts
async ensureBootstrapRows(inputs: ProductListingBootstrapInput[]): Promise<number> {
  if (inputs.length === 0) return 0;

  const now = new Date().toISOString();
  await this.connection
    .insert(productListingIndex)
    .values(
      inputs.map((input) => ({
        projectId: this.storeId,
        productId: input.productId,
        kind: input.kind,
        vendorId: input.vendorId,
        handle: input.handle,
        status: input.publishedAt ? "published" : "draft",
        publishedAt: input.publishedAt,
        productCreatedAt: input.productCreatedAt,
        productUpdatedAt: input.productUpdatedAt,
        productRevision: input.productRevision,
        tagHandles: [],
        featureValueHandles: [],
        categoryHandles: [],
        inStock: false,
        totalStock: 0,
        indexedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({
      target: [productListingIndex.projectId, productListingIndex.productId],
    });

  return inputs.length;
}
```

### ProductListingPriceIndexRepository

Файл:

```text
services/catalog/src/repositories/listing/ProductListingPriceIndexRepository.ts
```

Главное правило: сохранять row для каждой enabled currency, даже если цены нет.

Пример atomic replace:

```ts
async replaceForProduct(
  productId: string,
  rows: ProductListingPriceUpsertInput[],
): Promise<number> {
  const currencies = rows.map((row) => row.currency);

  await this.connection
    .delete(productListingPriceIndex)
    .where(
      and(
        eq(productListingPriceIndex.projectId, this.storeId),
        eq(productListingPriceIndex.productId, productId),
        currencies.length > 0
          ? notInArray(productListingPriceIndex.currency, currencies)
          : sql`true`,
      ),
    );

  if (rows.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  await this.connection
    .insert(productListingPriceIndex)
    .values(
      rows.map((row) => ({
        projectId: this.storeId,
        productId,
        currency: row.currency,
        minPriceMinor: row.minPriceMinor,
        maxPriceMinor: row.maxPriceMinor,
        hasPrice: row.hasPrice,
        indexedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [
        productListingPriceIndex.projectId,
        productListingPriceIndex.productId,
        productListingPriceIndex.currency,
      ],
      set: {
        minPriceMinor: sql`excluded.min_price_minor`,
        maxPriceMinor: sql`excluded.max_price_minor`,
        hasPrice: sql`excluded.has_price`,
        indexedAt: sql`excluded.indexed_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}
```

При реализации сверить `excluded.*` с локальным repository pattern и не
изобретать отдельный стиль upsert.

### VariantListingIndexRepository

Файл:

```text
services/catalog/src/repositories/listing/VariantListingIndexRepository.ts
```

Добавить batch upsert, чтобы rebuild не делал тысячи round trips:

```ts
async upsertMany(inputs: VariantListingIndexUpsertInput[]): Promise<number> {
  if (inputs.length === 0) return 0;

  const now = new Date().toISOString();
  await this.connection
    .insert(variantListingIndex)
    .values(
      inputs.map((input) => ({
        projectId: this.storeId,
        productId: input.productId,
        variantId: input.variantId,
        kind: input.kind,
        variantCreatedAt: input.variantCreatedAt,
        variantUpdatedAt: input.variantUpdatedAt,
        optionValueHandles: input.optionValueHandles,
        inStock: input.inStock,
        totalStock: input.totalStock,
        indexedAt: input.indexedAt ?? now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [variantListingIndex.projectId, variantListingIndex.variantId],
      set: {
        productId: sql`excluded.product_id`,
        kind: sql`excluded.kind`,
        variantCreatedAt: sql`excluded.variant_created_at`,
        variantUpdatedAt: sql`excluded.variant_updated_at`,
        optionValueHandles: sql`excluded.option_value_handles`,
        inStock: sql`excluded.in_stock`,
        totalStock: sql`excluded.total_stock`,
        indexedAt: sql`excluded.indexed_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return inputs.length;
}
```

Нужные aggregate methods:

```ts
async getStockAggregatesByProductIds(productIds: readonly string[]) {
  if (productIds.length === 0) return [];

  return this.connection
    .select({
      productId: variantListingIndex.productId,
      totalStock: sql<number>`coalesce(sum(${variantListingIndex.totalStock}), 0)`,
      inStock: sql<boolean>`bool_or(${variantListingIndex.inStock})`,
    })
    .from(variantListingIndex)
    .where(
      and(
        eq(variantListingIndex.projectId, this.storeId),
        inArray(variantListingIndex.productId, [...productIds]),
      ),
    )
    .groupBy(variantListingIndex.productId);
}
```

### VariantListingPriceIndexRepository

Файл:

```text
services/catalog/src/repositories/listing/VariantListingPriceIndexRepository.ts
```

Нужные методы:

- `replaceForVariant(variantId, rows)`
- `replaceForVariants(rowsByVariantId)`
- `deleteByVariantId(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `getPriceAggregatesByProductIds(productIds, currencies)`
- `getStaleVariantPrices(params)`

Пример product aggregate query:

```ts
async getPriceAggregatesByProductIds(
  productIds: readonly string[],
  currencies: readonly string[],
): Promise<ProductPriceAggregateRow[]> {
  if (productIds.length === 0 || currencies.length === 0) return [];

  return this.connection
    .select({
      productId: variantListingIndex.productId,
      currency: variantListingPriceIndex.currency,
      minPriceMinor: sql<number | null>`min(${variantListingPriceIndex.priceMinor})`,
      maxPriceMinor: sql<number | null>`max(${variantListingPriceIndex.priceMinor})`,
      hasPrice: sql<boolean>`count(*) > 0`,
    })
    .from(variantListingPriceIndex)
    .innerJoin(
      variantListingIndex,
      and(
        eq(variantListingIndex.projectId, variantListingPriceIndex.projectId),
        eq(variantListingIndex.variantId, variantListingPriceIndex.variantId),
      ),
    )
    .where(
      and(
        eq(variantListingIndex.projectId, this.storeId),
        inArray(variantListingIndex.productId, [...productIds]),
        inArray(variantListingPriceIndex.currency, [...currencies]),
        eq(variantListingIndex.inStock, true),
        eq(variantListingPriceIndex.hasPrice, true),
      ),
    )
    .groupBy(
      variantListingIndex.productId,
      variantListingPriceIndex.currency,
    );
}
```

Caller обязан дополнить отсутствующие currency rows как `{ hasPrice: false,
minPriceMinor: null, maxPriceMinor: null }`.

### Facet token repositories

Файлы:

```text
services/catalog/src/repositories/listing/ProductListingFacetTokenRepository.ts
services/catalog/src/repositories/listing/VariantListingFacetTokenRepository.ts
```

Replace должен удалять все старые tokens entity и вставлять новый deduplicated
set. Это проще и надежнее token-level diff, потому source mappings могут
merge/split значения.

```ts
async replaceForProduct(
  productId: string,
  tokens: ProductListingFacetTokenInput[],
): Promise<number> {
  await this.deleteByProductId(productId);

  const unique = dedupeProductTokens(tokens);
  if (unique.length === 0) return 0;

  await this.connection
    .insert(productListingFacetToken)
    .values(
      unique.map((token) => ({
        projectId: this.storeId,
        productId,
        facetId: token.facetId,
        facetValueId: token.facetValueId,
        facetType: token.facetType,
      })),
    )
    .onConflictDoNothing();

  return unique.length;
}
```

Нужны методы поиска affected ids после source handle change:

```ts
findProductsBySourceHandleChange(input: {
  facetTypes: Array<"tag" | "feature">;
  sourceValueHandles: string[];
}): Promise<string[]>;

findVariantsBySourceHandleChange(input: {
  sourceValueHandles: string[];
}): Promise<Array<{ productId: string; variantId: string }>>;
```

Если affected set нельзя найти дешево, caller должен перейти к project token
rebuild.

## Фаза 3. Source и mapping repositories

### ListingSourceRepository

Файл:

```text
services/catalog/src/repositories/listing/ListingSourceRepository.ts
```

Назначение: batch-read canonical state без N+1 domain repository calls.

Методы:

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

Пример source DTO:

```ts
export interface ProductSource {
  productId: string;
  kind: "BASE" | "BUNDLE";
  vendorId: string | null;
  handle: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt: string | null;
}

export interface VariantSource {
  productId: string;
  variantId: string;
  kind: "BASE" | "BUNDLE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

Пример batch query:

```ts
async getVariantSourcesByProductIds(
  productIds: readonly string[],
): Promise<VariantSource[]> {
  if (productIds.length === 0) return [];

  return this.connection
    .select({
      productId: variant.productId,
      variantId: variant.id,
      kind: variant.kind,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      deletedAt: variant.deletedAt,
    })
    .from(variant)
    .where(
      and(
        eq(variant.projectId, this.storeId),
        inArray(variant.productId, [...productIds]),
      ),
    );
}
```

### ListingFacetMappingRepository

Файл:

```text
services/catalog/src/repositories/listing/ListingFacetMappingRepository.ts
```

Назначение: resolve raw source handles в storefront tokens через
`facet_value.kind = 'source'` и `parent_id`.

Правила resolve:

- `tag` handle -> `facet_type = 'tag'`
- `feature_slug:value_slug` -> `facet_type = 'feature'`
- `option_slug:value_slug` -> `facet_type = 'option'`
- unmapped handles игнорируются, error не нужен
- display/root value должен быть enabled
- source value должен быть enabled
- если source value указывает на display parent, token пишет parent display
  `facet_value_id`
- если source value сам является root/source value, token пишет этот source
  `facet_value_id`

Пример resolve query shape:

```ts
async resolveProductFacetTokens(input: {
  products: Array<{
    productId: string;
    tagHandles: string[];
    featureValueHandles: string[];
  }>;
}): Promise<ProductFacetTokenResolved[]> {
  const handlesByType = collectUniqueHandles(input.products);

  const mappingRows = await this.resolveFacetSourceMappings(
    handlesByType.handles,
    ["tag", "feature"],
  );

  const mappingByTypeAndHandle = new Map(
    mappingRows.map((row) => [`${row.facetType}\0${row.sourceHandle}`, row]),
  );

  const tokens: ProductFacetTokenResolved[] = [];
  for (const product of input.products) {
    for (const handle of product.tagHandles) {
      const mapping = mappingByTypeAndHandle.get(`tag\0${handle}`);
      if (mapping) {
        tokens.push({
          productId: product.productId,
          facetId: mapping.facetId,
          facetValueId: mapping.facetValueId,
          facetType: "tag",
        });
      }
    }
  }

  return dedupeResolvedProductTokens(tokens);
}
```

## Фаза 4. Pure builders

Создать:

```text
services/catalog/src/scripts/listing/ProductListingRowBuilder.ts
services/catalog/src/scripts/listing/VariantListingRowBuilder.ts
```

Builders не делают DB calls. Они только превращают already-loaded source data в
rows для repositories.

Пример variant builder:

```ts
export function buildVariantListingRows(
  input: VariantListingBuildInput,
): VariantListingBuildOutput {
  if (!input.variant || input.variant.deletedAt) {
    return {
      variantRow: null,
      priceRows: [],
      optionValueHandles: [],
      shouldDelete: true,
    };
  }

  const priceByCurrency = new Map(
    input.priceRows.map((row) => [row.currency, row]),
  );

  return {
    shouldDelete: false,
    optionValueHandles: input.optionSources.optionValueHandles,
    variantRow: {
      productId: input.variant.productId,
      variantId: input.variant.variantId,
      kind: input.variant.kind,
      variantCreatedAt: input.variant.createdAt,
      variantUpdatedAt: input.variant.updatedAt,
      optionValueHandles: input.optionSources.optionValueHandles,
      inStock: input.stockSource.totalStock > 0,
      totalStock: input.stockSource.totalStock,
      indexedAt: input.now,
    },
    priceRows: input.enabledCurrencies.map((currency) => {
      const price = priceByCurrency.get(currency);
      return {
        productId: input.variant.productId,
        variantId: input.variant.variantId,
        currency,
        priceMinor: price?.amountMinor ?? null,
        hasPrice: price?.amountMinor != null,
        indexedAt: input.now,
      };
    }),
  };
}
```

Product builder должен:

- вернуть `shouldDelete = true` для missing/deleted product;
- заполнить `status = 'published' | 'draft'`;
- сохранить raw `tag_handles`, `feature_value_handles`, `category_handles`;
- получить `in_stock` и `total_stock` из stock aggregate;
- создать price rows для всех enabled currencies.

## Фаза 5. Sync scripts

Создать папку:

```text
services/catalog/src/scripts/listing/
```

и barrel:

```text
services/catalog/src/scripts/listing/index.ts
```

### Общий reason type

Файл:

```text
services/catalog/src/scripts/listing/types.ts
```

```ts
export type ListingIndexSyncReason =
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

### SyncVariantListingIndexScript

Файл:

```text
services/catalog/src/scripts/listing/SyncVariantListingIndexScript.ts
```

Скрипт должен быть transactional, потому variant rows, prices, tokens и parent
aggregate refresh должны коммититься согласованно.

```ts
export class SyncVariantListingIndexScript extends BaseScript<
  SyncVariantListingIndexParams,
  SyncVariantListingIndexResult
> {
  @Transactional()
  protected async execute(
    params: SyncVariantListingIndexParams,
  ): Promise<SyncVariantListingIndexResult> {
    const normalized = await this.normalizeInput(params);
    if (normalized.variantIds.length === 0 && normalized.productIds.length === 0) {
      return emptyVariantSyncResult();
    }

    const enabledCurrencies =
      await this.repository.listingSource.getEnabledProjectCurrencies();

    if (normalized.productIds.length > 0) {
      const productSources =
        await this.repository.listingSource.getProductSources(normalized.productIds);
      await this.repository.productListingIndex.ensureBootstrapRows(
        productSources
          .filter((source) => !source.deletedAt)
          .map(toProductListingBootstrapInput),
      );
    }

    const sources = params.variantIds?.length
      ? await this.repository.listingSource.getVariantSourcesByVariantIds(
          normalized.variantIds,
        )
      : await this.repository.listingSource.getVariantSourcesByProductIds(
          normalized.productIds,
        );

    const variantIds = sources.map((source) => source.variantId);
    const [optionSources, prices, stockSources] = await Promise.all([
      this.repository.listingSource.getVariantOptionSources(variantIds),
      this.repository.listingSource.getCurrentVariantPrices(
        variantIds,
        enabledCurrencies,
      ),
      this.repository.listingSource.getVariantStockSources(variantIds),
    ]);

    const now = new Date().toISOString();
    const built = sources.map((variant) =>
      buildVariantListingRows({
        variant,
        optionSources: optionSources.get(variant.variantId) ?? emptyOptionSource(),
        stockSource: stockSources.get(variant.variantId) ?? emptyStockSource(),
        priceRows: prices.get(variant.variantId) ?? [],
        enabledCurrencies,
        now,
      }),
    );

    const activeRows = built.flatMap((row) => row.variantRow ? [row.variantRow] : []);
    const deletedIds = collectDeletedVariantIds(normalized.variantIds, sources, built);

    await this.repository.variantListingFacetToken.deleteByVariantIds(deletedIds);
    await this.repository.variantListingPriceIndex.deleteByVariantIds(deletedIds);
    await this.repository.variantListingIndex.deleteByVariantIds(deletedIds);

    await this.repository.variantListingIndex.upsertMany(activeRows);
    const priceRowsWritten =
      await this.repository.variantListingPriceIndex.replaceForVariants(
        groupVariantPriceRows(built),
      );

    const tokens =
      await this.repository.listingFacetMapping.resolveVariantFacetTokens({
        variants: collectVariantTokenSources(activeRows, built),
      });

    const optionTokensWritten =
      await this.repository.variantListingFacetToken.replaceForVariants(
        groupVariantTokens(tokens),
      );

    const affectedProductIds = collectAffectedProductIds(sources, activeRows);
    await this.executeScript(SyncProductListingIndexScript, {
      productIds: affectedProductIds,
      reason: params.reason,
      refreshVariantsFirst: false,
    });

    return {
      syncedVariantIds: activeRows.map((row) => row.variantId),
      deletedVariantIds: deletedIds,
      affectedProductIds,
      priceRowsWritten,
      optionTokensWritten,
    };
  }
}
```

Важная деталь: `ensureBootstrapRows` выполняется до variant upsert только для
FK parent row. Полноценный `SyncProductListingIndexScript` все равно вызывается
после записи variant rows. Для избежания циклов product script не должен
вызывать variant refresh, если `refreshVariantsFirst = false`.

### SyncProductListingIndexScript

Файл:

```text
services/catalog/src/scripts/listing/SyncProductListingIndexScript.ts
```

```ts
export class SyncProductListingIndexScript extends BaseScript<
  SyncProductListingIndexParams,
  SyncProductListingIndexResult
> {
  @Transactional()
  protected async execute(
    params: SyncProductListingIndexParams,
  ): Promise<SyncProductListingIndexResult> {
    const productIds = [...new Set(params.productIds)];
    if (productIds.length === 0) return emptyProductSyncResult();

    if (params.refreshVariantsFirst) {
      await this.executeScript(SyncVariantListingIndexScript, {
        productIds,
        reason: params.reason,
      });
    }

    const productSources =
      await this.repository.listingSource.getProductSources(productIds);
    const missingOrDeleted = collectMissingOrDeletedProducts(
      productIds,
      productSources,
    );

    for (const productId of missingOrDeleted) {
      await this.executeScript(DeleteProductListingIndexScript, {
        productId,
        reason: params.reason,
      });
    }

    const activeProductIds = productSources
      .filter((source) => !source.deletedAt)
      .map((source) => source.productId);

    const enabledCurrencies =
      await this.repository.listingSource.getEnabledProjectCurrencies();

    const [facetSources, stockAggregates, priceAggregates] = await Promise.all([
      this.repository.listingSource.getProductFacetSources(activeProductIds),
      this.repository.variantListingIndex.getStockAggregatesByProductIds(
        activeProductIds,
      ),
      this.repository.variantListingPriceIndex.getPriceAggregatesByProductIds(
        activeProductIds,
        enabledCurrencies,
      ),
    ]);

    const now = new Date().toISOString();
    const built = productSources
      .filter((source) => !source.deletedAt)
      .map((product) =>
        buildProductListingRows({
          product,
          facetSources: facetSources.get(product.productId) ?? emptyProductFacetSource(),
          stockAggregate: stockAggregates.get(product.productId) ?? emptyStockAggregate(),
          priceAggregates: priceAggregates.get(product.productId) ?? [],
          enabledCurrencies,
          now,
        }),
      );

    for (const row of built) {
      if (!row.productRow) continue;
      await this.repository.productListingIndex.upsert(row.productRow);
    }

    const priceRowsWritten =
      await this.repository.productListingPriceIndex.replaceForProducts(
        groupProductPriceRows(built),
      );

    const tokens =
      await this.repository.listingFacetMapping.resolveProductFacetTokens({
        products: collectProductTokenSources(built),
      });

    const productTokensWritten =
      await this.repository.productListingFacetToken.replaceForProducts(
        groupProductTokens(tokens),
      );

    return {
      syncedProductIds: built.flatMap((row) =>
        row.productRow ? [row.productRow.productId] : [],
      ),
      deletedProductIds: missingOrDeleted,
      priceRowsWritten,
      productTokensWritten,
    };
  }
}
```

### DeleteProductListingIndexScript

Файл:

```text
services/catalog/src/scripts/listing/DeleteProductListingIndexScript.ts
```

Удалять явно, даже если FK cascade покрывает часть операций:

```ts
@Transactional()
protected async execute(params: DeleteProductListingIndexParams) {
  await this.repository.variantListingFacetToken.deleteByProductId(params.productId);
  await this.repository.variantListingPriceIndex.deleteByProductId(params.productId);
  await this.repository.variantListingIndex.deleteByProductId(params.productId);
  await this.repository.productListingFacetToken.deleteByProductId(params.productId);
  await this.repository.productListingPriceIndex.deleteByProductId(params.productId);
  await this.repository.productListingIndex.delete(params.productId);

  return { productId: params.productId, deleted: true };
}
```

### RefreshListingFacetTokensScript

Файл:

```text
services/catalog/src/scripts/listing/RefreshListingFacetTokensScript.ts
```

Этот script не меняет index rows и price rows. Он пересчитывает только token
tables.

```ts
export class RefreshListingFacetTokensScript extends BaseScript<
  RefreshListingFacetTokensParams,
  RefreshListingFacetTokensResult
> {
  @Transactional()
  protected async execute(params: RefreshListingFacetTokensParams) {
    const productIds = await this.resolveAffectedProductIds(params);
    const variantIds = await this.resolveAffectedVariantIds(params);

    if (productIds.length === 0 && variantIds.length === 0) {
      if (params.fallbackToProjectRebuild) {
        return this.rebuildProjectTokens(params.reason);
      }
      return emptyFacetRefreshResult();
    }

    if (productIds.length > 0) {
      const sources =
        await this.repository.listingSource.getProductFacetSources(productIds);
      const tokens =
        await this.repository.listingFacetMapping.resolveProductFacetTokens({
          products: toProductTokenSources(sources),
        });
      await this.repository.productListingFacetToken.replaceForProducts(
        groupProductTokens(tokens),
      );
    }

    if (variantIds.length > 0) {
      const optionSources =
        await this.repository.listingSource.getVariantOptionSources(variantIds);
      const tokens =
        await this.repository.listingFacetMapping.resolveVariantFacetTokens({
          variants: toVariantTokenSources(optionSources),
        });
      await this.repository.variantListingFacetToken.replaceForVariants(
        groupVariantTokens(tokens),
      );
    }

    return {
      refreshedProductIds: productIds,
      refreshedVariantIds: variantIds,
    };
  }
}
```

### RebuildListingIndexScript

Файл:

```text
services/catalog/src/scripts/listing/RebuildListingIndexScript.ts
```

Алгоритм:

1. Взять project advisory lock.
2. Если `truncate = true`, очистить listing tables в порядке child -> parent.
3. Читать product ids batches через `getProductsForRebuild`.
4. На каждый batch сначала `SyncVariantListingIndexScript`.
5. Затем `SyncProductListingIndexScript`.
6. После rebuild вызвать `listingFreshness.auditProject`.

Пример lock helper в repository:

```ts
async withProjectListingLock<T>(fn: () => Promise<T>): Promise<T> {
  await this.connection.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`listing:${this.storeId}`}))`,
  );
  return fn();
}
```

Если helper будет жить в отдельном repository, он все равно должен использовать
`this.connection`.

### RepairListingIndexFreshnessScript

Файл:

```text
services/catalog/src/scripts/listing/RepairListingIndexFreshnessScript.ts
```

Алгоритм:

1. `listingFreshness.auditProject`.
2. Missing/stale products -> `SyncProductListingIndexScript`.
3. Unexpected/deleted products -> `DeleteProductListingIndexScript`.
4. Missing/stale variants -> `SyncVariantListingIndexScript`.
5. Token mismatches -> `RefreshListingFacetTokensScript`.
6. Если targeted repair невозможен -> `RebuildListingIndexScript`.

## Фаза 6. Freshness repository

Файл:

```text
services/catalog/src/repositories/listing/ListingFreshnessRepository.ts
```

Минимальный result:

```ts
export interface ListingFreshnessAuditResult {
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

Пример missing product rows:

```ts
async findMissingProductRows(limit: number): Promise<string[]> {
  const rows = await this.connection
    .select({ productId: product.id })
    .from(product)
    .leftJoin(
      productListingIndex,
      and(
        eq(productListingIndex.projectId, product.projectId),
        eq(productListingIndex.productId, product.id),
      ),
    )
    .where(
      and(
        eq(product.projectId, this.storeId),
        isNull(product.deletedAt),
        isNull(productListingIndex.productId),
      ),
    )
    .limit(limit);

  return rows.map((row) => row.productId);
}
```

Пример stale product rows:

```ts
async findStaleProductRows(limit: number): Promise<string[]> {
  const rows = await this.connection
    .select({ productId: product.id })
    .from(product)
    .innerJoin(
      productListingIndex,
      and(
        eq(productListingIndex.projectId, product.projectId),
        eq(productListingIndex.productId, product.id),
      ),
    )
    .where(
      and(
        eq(product.projectId, this.storeId),
        isNull(product.deletedAt),
        or(
          gt(product.updatedAt, productListingIndex.productUpdatedAt),
          ne(product.revision, productListingIndex.productRevision),
        ),
      ),
    )
    .limit(limit);

  return rows.map((row) => row.productId);
}
```

Token mismatch audit должен сравнивать expected resolved token set из canonical
facet sources и actual token table. Для больших проектов audit может работать
limit-ами и возвращать `canRepairTargeted = false`, если diff слишком большой.

## Фаза 7. DBOS workflows

Catalog workflows сейчас используют `BrokerWorkflows`. Добавить:

```text
services/catalog/src/workflows/ListingIndexWorkflow.ts
```

И зарегистрировать в:

```text
services/catalog/src/workflows/index.ts
```

Нужные workflow names:

- `catalog.rebuildListingIndex`
- `catalog.syncListingIndexForProducts`
- `catalog.syncListingIndexForVariants`
- `catalog.refreshListingFacetTokens`

Текущий catalog pattern использует `BrokerWorkflows`, а decorated entrypoint
обычно называется `run`. Поэтому безопасный вариант - отдельный workflow class
на каждый entrypoint:

```text
services/catalog/src/workflows/ListingIndexProductSyncWorkflow.ts
services/catalog/src/workflows/ListingIndexVariantSyncWorkflow.ts
services/catalog/src/workflows/ListingIndexFacetTokenRefreshWorkflow.ts
services/catalog/src/workflows/ListingIndexRebuildWorkflow.ts
```

Пример skeleton:

```ts
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Injectable } from "@nestjs/common";
import { Kernel } from "../kernel/Kernel.js";
import { SyncProductListingIndexScript } from "../scripts/listing/index.js";

@Injectable()
export class ListingIndexWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("syncListingIndexForProducts", {
    idempotencyStrategy: "content",
  })
  async run(input: SyncListingIndexForProductsWorkflowInput) {
    const result = await this.stepSyncProducts(input);
    await this.stepAuditAffectedProducts(input, result.syncedProductIds);
    return result;
  }

  @WorkflowStep({ timeoutMs: 60_000 })
  private async stepSyncProducts(input: SyncListingIndexForProductsWorkflowInput) {
    return this.kernel.runScript(
      SyncProductListingIndexScript,
      {
        productIds: input.productIds,
        reason: input.reason,
        refreshVariantsFirst: input.refreshVariantsFirst,
      },
      input.context,
    );
  }

  @WorkflowStep({ timeoutMs: 30_000 })
  private async stepAuditAffectedProducts(
    input: SyncListingIndexForProductsWorkflowInput,
    productIds: string[],
  ) {
    return this.kernel.repository.listingFreshness.auditProject({
      productIds,
      limit: input.auditLimit ?? 100,
    });
  }
}
```

Workflow idempotency keys должны строиться из content:

- product sync:
  `listing:product:{projectId}:{productId}:{reason}:{sourceRevision}`
- variant sync:
  `listing:variant:{projectId}:{variantId}:{reason}:{sourceRevision}`
- mapping refresh:
  `listing:facet-mapping:{projectId}:{facetType}:{mappingRevision}`
- rebuild:
  `listing:rebuild:{projectId}:{requestedAtOrManualKey}`

Если текущий `WorkflowRegistry` API требует запуск через broker action, добавить
тонкий wrapper action рядом с существующими workflow entrypoints. Event handler
может временно вызывать `kernel.runScript`, но durable path должен быть workflow.

## Фаза 8. Event handlers и invalidation

Обновить:

```text
services/catalog/src/handlers/index.ts
services/catalog/src/handlers/InventoryEventHandlers.ts
```

Заменить imports:

```ts
import {
  DeleteProductListingIndexScript,
  SyncProductListingIndexScript,
  SyncVariantListingIndexScript,
  RefreshListingFacetTokensScript,
} from "../scripts/listing/index.js";
```

Базовая карта:

| Изменение | Action |
| --- | --- |
| `productCreated` | `SyncProductListingIndexScript` с `refreshVariantsFirst = true` |
| `productDeleted` | `DeleteProductListingIndexScript` |
| product kind/vendor/handle/published/revision | product row refresh |
| category assignment | product `category_handles` refresh |
| tag assignment/handle | product row + product tokens |
| feature value/handle | product row + product tokens |
| variant create/update/delete | variant row/prices/tokens + parent product aggregate |
| variant option changed | variant row + option tokens + parent aggregate |
| variant price changed | variant price row + parent product price aggregate |
| stock changed | variant stock row + parent stock/price aggregate |
| enabled currencies changed | variant price rows + product price rows for project |
| facet mapping changed | `RefreshListingFacetTokensScript` only |

Пример `productCreated`:

```ts
await this.kernel.runScript(
  SyncProductListingIndexScript,
  {
    productIds: [params.event.payload.productId],
    reason: "product_created",
    refreshVariantsFirst: true,
  },
  context,
);
```

Пример stock handler:

```ts
@EventHandler("stockLevelChanged")
async handleStockLevelChanged(params: { event: StockLevelChangedEvent }) {
  const store = await this.getStoreContext(params.event.payload.storeId);
  const context = toScriptContext(store, params.event.context.userId);

  await this.kernel.runScript(
    SyncVariantListingIndexScript,
    {
      variantIds: [params.event.payload.variantId],
      reason: "stock_changed",
    },
    context,
  );

  return { success: true };
}
```

Если inventory event сейчас не содержит `storeId`, сначала добавить lookup
variant -> project через catalog repository или расширить event contract. Без
project context listing sync запускать нельзя.

## Фаза 9. Обновление product/variant/facet scripts

Помимо event handlers, direct mutation scripts должны запускать listing sync,
если изменение происходит внутри catalog service и событие не гарантирует
доставку до read model в рамках нужного lifecycle.

Проверить и обновить:

- `services/catalog/src/scripts/product/*`
- `services/catalog/src/scripts/variant/*`
- `services/catalog/src/scripts/tag/*`
- `services/catalog/src/scripts/feature/*`
- `services/catalog/src/scripts/option/*`
- `services/catalog/src/scripts/facet/*`
- `services/catalog/src/workflows/ProductUpdateWorkflow.ts`

Практическое правило:

- Mutation script меняет canonical data.
- Event или workflow запускает sync.
- Не делать двойной sync из script и handler для одного и того же committed
  изменения, если событие уже reliable. Если сомневаемся, использовать
  deterministic workflow idempotency key.

Для facet value merge/unmerge/update:

```ts
await this.executeScript(RefreshListingFacetTokensScript, {
  facetTypes: [facet.facetType],
  sourceValueHandles: affectedSourceHandles,
  fallbackToProjectRebuild: true,
  reason: "facet_mapping_changed",
});
```

## Фаза 10. Удаление legacy search-index pipeline

После переноса callers удалить:

```text
services/catalog/src/repositories/listing/SearchIndexRepository.ts
services/catalog/src/repositories/listing/VariantSearchIndexRepository.ts
services/catalog/src/scripts/search-index/
```

И убрать exports из:

```text
services/catalog/src/scripts/index.ts
```

Перед удалением найти все ссылки:

```text
rg "searchIndex|variantSearchIndex|SyncProductIndexScript|SyncVariantIndexScript|product_search_index|variant_search_index" services/catalog
```

Все найденные references должны быть заменены на listing naming.

## Фаза 11. Storefront read path follow-up

Этот sync plan подготавливает read model. Storefront listing repositories должны
быть обновлены отдельно или в следующем PR:

- `ListingQueryRepository` строит product candidates, filters, sort и
  pagination.
- `FacetAggregationRepository` считает product-level, option-level и virtual
  facets.
- Tag/feature filters используют `product_listing_facet_token`.
- Option filters используют `variant_listing_facet_token` + same-variant join к
  `variant_listing_index`.
- Price filters используют `variant_listing_price_index` только с
  `has_price = true` и `variant_listing_index.in_stock = true`.

Минимальная проверка read path после sync cutover: ни один storefront configured
facet query не должен читать `tag_handles`, `feature_value_handles` или
`option_value_handles`.

## Рекомендуемый порядок PR/коммитов

1. Repository registration + listing repositories.
2. Source/mapping repositories + builders.
3. Sync scripts + rebuild/delete/repair scripts.
4. Workflows + event handlers.
5. Remove legacy search-index scripts/repositories.
6. Storefront query/facet aggregation repositories.

Если нужен меньший blast radius, первые пять пунктов можно сделать в одном
backend cutover PR, а storefront read path во втором PR. Dual-write не нужен,
но временно нельзя выпускать storefront listing до успешного rebuild.

## Acceptance checklist

- [ ] Старые `product_search_index` и `variant_search_index` больше не
      используются в TypeScript.
- [ ] Все новые repositories используют `this.connection` и `this.storeId`.
- [ ] `SyncVariantListingIndexScript` пишет variant rows/prices/tokens до
      product aggregate refresh.
- [ ] `SyncProductListingIndexScript` считает product price aggregates из
      variant listing tables.
- [ ] Token generation пишет только resolved `facet_id` и `facet_value_id`.
- [ ] Token replace operations atomic и deduplicated.
- [ ] Facet mapping changes пересчитывают token tables без изменения price/stock
      rows.
- [ ] Rebuild может восстановить listing tables после truncate.
- [ ] Freshness audit находит missing/stale/unexpected rows и запускает targeted
      repair или full rebuild.
- [ ] Event handlers покрывают product, variant, price, stock, category, tag,
      feature, option, currency и facet mapping changes.
- [ ] Storefront read path для configured facets не использует raw handle arrays.
- [ ] Проверка новой версии выполняется build-ом; `test` и `tsc` отдельно не
      запускаются.
