# Listing Index Update API Contract

## Цель

Документ фиксирует публичный broker API сервиса `listing`, через который `catalog` передает
изменения, влияющие на товарный листинг.

API описывает доменные snapshot-контракты sellable items, а не физическое устройство индекса. В
контракте намеренно нет таблиц, posting lists, bitmap, doc ids, BM25, SQL, search engine schemas или
внутренних mapping rules listing service.

## Границы владения

| Область                                             | Владелец  | Как участвует в update API                                             |
| --------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| Product canonical data                              | `catalog` | Передается как snapshot sellable item.                                 |
| Variant canonical data                              | `catalog` | Передается внутри snapshot родительского item.                         |
| Category, collection, vendor, tag assignments       | `catalog` | Передаются как публичные listing dimensions.                           |
| Facet handles и value handles                       | `catalog` | Передаются как стабильные публичные ключи фильтрации.                  |
| Facet labels, ui type, swatches                     | `catalog` | Не передаются в update API; читаются через canonical API / federation. |
| Listing order, filters, searchability, availability | `listing` | Вычисляются из публичного snapshot.                                    |
| Internal index layout                               | `listing` | Не является частью API.                                                |

Главное правило: `catalog` сообщает, что представляет собой sellable item для листинга. `catalog` не
сообщает, как `listing` должен это индексировать.

## Broker actions

Все action names ниже вызываются через полный broker name с префиксом сервиса:

```ts
await broker.call("listing.syncSellableItem", params);
```

### `listing.syncSellableItem`

Полная замена публичного listing snapshot для одного sellable item.

Используется для product create, update, publish, unpublish, variant, price, stock, category,
vendor, tag, facet и searchable content changes.

```ts
interface SyncSellableItemParams {
  meta: ListingUpdateMeta;
  storeId: string;
  item: ListingSellableItemSnapshot;
}

type SyncSellableItemResult = ListingUpdateResult;
```

### `listing.deleteSellableItem`

Удаление sellable item из листинга.

Используется, когда canonical item удален или больше не должен существовать в read model listing
service. Unpublish не обязан вызывать delete: для unpublish достаточно `syncSellableItem` со
статусом `draft`.

```ts
interface DeleteSellableItemParams {
  meta: ListingUpdateMeta;
  storeId: string;
  itemRef: ListingSellableItemRef;
  sourceSequence: number;
  deletedAt: string;
  reason?: "deleted" | "merged" | "project_removed" | "manual";
}

type DeleteSellableItemResult = ListingUpdateResult;
```

### `listing.syncSellableItems`

Batch wrapper над `listing.syncSellableItem`.

Каждый item обрабатывается независимо. Ошибка одного item не должна менять контракт результата для
остальных items. Рекомендуемый размер batch: до 100 items.

```ts
interface SyncSellableItemsParams {
  meta: ListingUpdateMeta;
  storeId: string;
  items: ListingSellableItemSnapshot[];
}

interface SyncSellableItemsResult {
  operationId: string;
  status: "completed" | "partial";
  results: ListingUpdateResult[];
}
```

## Common metadata

```ts
interface ListingUpdateMeta {
  contractVersion: "2026-07-04";
  operationId: string;
  idempotencyKey: string;
  occurredAt: string;
  source: ListingUpdateSource;
}

interface ListingUpdateSource {
  service: "catalog";
  actor?: "admin" | "system" | "migration" | "api";
  requestId?: string;
  workflowId?: string;
}
```

Правила:

- `operationId` нужен для trace/log correlation.
- `idempotencyKey` должен быть стабильным для одного и того же source update. Рекомендуемый формат:
  `catalog:<storeId>:<entityType>:<entityId>:<revision>`.
- `occurredAt` всегда ISO 8601.
- `contractVersion` меняется только при breaking change публичного DTO.

## Identity contract

```ts
interface ListingSellableItemRef {
  entityType: "product";
  id: string;
}
```

`id` - canonical ID сущности, которой владеет `catalog`. Это не listing doc id, не database row id
listing service и не cursor.

## Sellable item snapshot

Snapshot всегда полный. Отсутствующее значение в массиве означает, что такого значения больше нет.
Partial patch semantics в этом API нет.

```ts
interface ListingSellableItemSnapshot extends ListingSellableItemRef {
  sourceSequence: number;
  sourceUpdatedAt: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;

  content: ListingContentSnapshot;
  availability: ListingAvailabilitySnapshot;
  priceRanges: ListingPriceRangeSnapshot[];

  vendorId?: string | null;
  scopes: ListingScopeMembershipSnapshot[];
  productFacets: ListingFacetSelectionSnapshot[];
  variants: ListingVariantSnapshot[];
}
```

### Content

```ts
interface ListingContentSnapshot {
  defaultLocale: string;
  translations: Record<string, ListingLocalizedContentSnapshot>;
  keywords?: string[];
}

interface ListingLocalizedContentSnapshot {
  title: string;
  subtitle?: string | null;
  plainDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}
```

`plainDescription` передается как plain text. Rich text, HTML и editor AST не являются частью
listing update contract.

### Availability

```ts
interface ListingAvailabilitySnapshot {
  availableForSale: boolean;
  totalQuantity?: number | null;
}
```

`availableForSale` - публичный sellable-state flag. Конкретные складские правила и warehouse-level
данные в этот контракт не входят.

Listing materializer использует `availableForSale` как единственный источник
`criterion.availability=available|unavailable`. `totalQuantity` не меняет этот term: quantity-zero
variant с разрешённым backorder остаётся `available`. Broker payload не содержит и не может передать
raw/encoded physical term key.

### Prices

```ts
interface ListingPriceRangeSnapshot {
  currencyCode: string;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
}

interface ListingVariantPriceSnapshot {
  currencyCode: string;
  amountMinor: number | null;
}
```

Money values передаются в minor units. `currencyCode` - ISO 4217 uppercase. Если проект пока
работает только в default currency, `catalog` передает только эту currency. Мультивалютность
остается расширением того же публичного shape.

### Scopes

```ts
type ListingScopeMembershipSnapshot =
  ListingCategoryScopeMembershipSnapshot | ListingCollectionScopeMembershipSnapshot;

interface ListingCategoryScopeMembershipSnapshot {
  scopeType: "category";
  categoryId: string;
  primary: boolean;
  manualRank?: string | null;
}

interface ListingCollectionScopeMembershipSnapshot {
  scopeType: "collection";
  collectionId: string;
  manualRank?: string | null;
}
```

`manualRank` - публичная позиция item внутри scope. Формат rank принадлежит `catalog`; `listing`
может использовать его для manual sort, но API не требует конкретный алгоритм сортировки.

### Facets

```ts
interface ListingFacetSelectionSnapshot {
  scope: "product" | "variant";
  facet: ListingFacetRef;
  values: ListingFacetValueRef[];
}

interface ListingFacetRef {
  type: "tag" | "feature" | "option" | "custom";
  handle: string;
  id?: string;
}

interface ListingFacetValueRef {
  handle: string;
  id?: string;
}
```

Facet contract использует публичные `handle` values, которые могут быть использованы в listing
filter input. Labels, translations, swatches, source child values, ui type и sort presentation
metadata не передаются здесь.

Если изменился только label, translation, swatch или ui type facet value, `catalog` не вызывает
`listing.syncSellableItem`. Если изменился public handle facet/value или membership item в facet
value, `catalog` вызывает sync для затронутых items.

### Variants

```ts
interface ListingVariantSnapshot {
  id: string;
  sourceSequence?: number;
  status: "active" | "inactive" | "archived";
  availability: ListingAvailabilitySnapshot;
  prices: ListingVariantPriceSnapshot[];
  facets: ListingFacetSelectionSnapshot[];
}
```

Variant snapshot содержит только данные, которые влияют на variant-level filtering, price filtering,
availability или matched variant selection. Canonical SKU, barcode, media, dimensions и inventory
rows не входят в listing update API, если они не влияют на публичный listing behavior.

Только `status=active` materializes в `system.state=indexable`, criterion/OPTION terms и runtime
variant price index. `inactive`/`archived` source values могут присутствовать в snapshot, но не
попадают в runtime index.

## Result contract

```ts
interface ListingUpdateResult {
  operationId: string;
  storeId: string;
  itemRef: ListingSellableItemRef;
  sourceSequence: number;
  status: "applied" | "noop" | "ignored_stale" | "accepted";
  processedAt: string;
  warnings?: ListingUpdateWarning[];
}

interface ListingUpdateWarning {
  code: string;
  field?: string[];
  message: string;
}
```

Status semantics:

- `applied` - snapshot принят как текущая версия item.
- `noop` - тот же `idempotencyKey` или та же revision уже обработаны.
- `ignored_stale` - update старее уже принятой source revision.
- `accepted` - update принят, но visibility в read path может стать eventual.

`ignored_stale` не является ошибкой и должен быть безопасен для retries.

## Validation rules

- `storeId` обязателен и всегда принадлежит source project/store.
- `sourceSequence` должен монотонно расти для одного `storeId + entityType + id`.
- `content.defaultLocale` обязателен.
- `content.translations[defaultLocale].title` должен быть непустым для `published` item.
- `currencyCode` uppercase ISO 4217.
- Amount fields are integer minor units or `null`.
- Duplicate variant IDs inside one snapshot are invalid.
- Duplicate facet value handles inside one facet selection are invalid.
- `productFacets[].scope` must be `product`.
- `variants[].facets[].scope` must be `variant`.
- Empty arrays are valid and mean "no values".
- `null` is used only where the field explicitly allows absence.

## Error contract

Validation and contract errors should be stable enough for callers to log, retry or fail the
producer workflow.

```ts
interface ListingUpdateError {
  code:
    | "UNSUPPORTED_CONTRACT_VERSION"
    | "VALIDATION_FAILED"
    | "PROJECT_MISMATCH"
    | "TRANSIENT_UNAVAILABLE"
    | "INTERNAL_ERROR";
  message: string;
  field?: string[];
  retryable: boolean;
}
```

Retry rules:

- `TRANSIENT_UNAVAILABLE` is retryable.
- `INTERNAL_ERROR` may be retryable depending on broker/runtime metadata.
- `VALIDATION_FAILED`, `PROJECT_MISMATCH` and `UNSUPPORTED_CONTRACT_VERSION` are not retryable
  without producer changes.

## Catalog call matrix

| Catalog change                                     | Required listing action                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Product created                                    | `listing.syncSellableItem`                                                   |
| Title, description, SEO text or keywords changed   | `listing.syncSellableItem`                                                   |
| Published/unpublished/archive status changed       | `listing.syncSellableItem`                                                   |
| Product deleted                                    | `listing.deleteSellableItem`                                                 |
| Variant created/updated/deleted                    | `listing.syncSellableItem` for parent item                                   |
| Price changed                                      | `listing.syncSellableItem` for parent item                                   |
| Stock availability changed                         | `listing.syncSellableItem` for parent item                                   |
| Category/collection membership changed             | `listing.syncSellableItem`                                                   |
| Manual position inside category/collection changed | `listing.syncSellableItem` or `listing.syncSellableItems` for affected items |
| Vendor/tag/facet membership changed                | `listing.syncSellableItem`                                                   |
| Facet label/translation/swatch/ui type changed     | No listing update; canonical read API owns presentation                      |
| Facet handle/value handle changed                  | `listing.syncSellableItem` or batch sync for affected items                  |

## Example

```ts
await broker.call("listing.syncSellableItem", {
  meta: {
    contractVersion: "2026-07-04",
    operationId: "0d9e2db0-9d1e-43a8-8b10-56f1f8c1f070",
    idempotencyKey: "catalog:store_1:product:prod_1:42",
    occurredAt: "2026-07-04T12:00:00.000Z",
    source: {
      service: "catalog",
      actor: "admin",
      workflowId: "product-update-prod_1-42",
    },
  },
  storeId: "store_1",
  item: {
    entityType: "product",
    id: "prod_1",
    sourceSequence: 42,
    sourceUpdatedAt: "2026-07-04T12:00:00.000Z",
    status: "published",
    publishedAt: "2026-07-04T11:59:00.000Z",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-07-04T12:00:00.000Z",
    content: {
      defaultLocale: "uk",
      translations: {
        uk: {
          title: "Бавовняна футболка",
          plainDescription: "Легка базова футболка.",
        },
      },
      keywords: ["basic", "cotton"],
    },
    availability: {
      availableForSale: true,
      totalQuantity: 12,
    },
    priceRanges: [
      {
        currencyCode: "UAH",
        minAmountMinor: 79900,
        maxAmountMinor: 89900,
      },
    ],
    vendorId: "vendor_1",
    scopes: [
      {
        scopeType: "category",
        categoryId: "cat_tshirts",
        primary: true,
        manualRank: "a0",
      },
    ],
    productFacets: [
      {
        scope: "product",
        facet: { type: "tag", handle: "tag" },
        values: [{ handle: "summer" }],
      },
      {
        scope: "product",
        facet: { type: "feature", handle: "material" },
        values: [{ handle: "cotton" }],
      },
    ],
    variants: [
      {
        id: "var_1",
        status: "active",
        availability: {
          availableForSale: true,
          totalQuantity: 7,
        },
        prices: [{ currencyCode: "UAH", amountMinor: 79900 }],
        facets: [
          {
            scope: "variant",
            facet: { type: "option", handle: "color" },
            values: [{ handle: "black" }],
          },
          {
            scope: "variant",
            facet: { type: "option", handle: "size" },
            values: [{ handle: "m" }],
          },
        ],
      },
    ],
  },
});
```

## Explicit non-contract fields

Следующие значения запрещено добавлять в публичный update API:

- listing `productDocId`, `variantDocId` or any allocated numeric doc id;
- posting field names, posting keys, `valueKey`, bitmap payloads;
- table names, SQL fragments, migration names;
- search-engine collection/schema fields;
- BM25 vectors, ranks, internal relevance scores;
- GraphQL cursor payloads;
- generated read-model row shapes from `listing` repositories.

Если такое значение нужно для реализации, оно должно вычисляться внутри `listing` после приема
публичного snapshot.
