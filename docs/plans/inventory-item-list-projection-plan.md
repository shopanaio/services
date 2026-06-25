# План: inventory item list projection

## Цель

Сделать `inventoryQuery.inventoryItems` основным API для inventory item list.
Connection должен возвращать обычные `InventoryItem` nodes, а не специальный
`InventoryVariantListItem`.

При этом список должен уметь делать SQL-level search, filter и sort по:

- `productName` в текущей локали;
- `sku`;
- stock columns по warehouse scope: `quantityOnHand`, `reservedQuantity`,
  `unavailableQuantity`, `availableForSale`;
- стабильным tie-breaker полям вроде `id` / `variantId`.

`catalog` остается source of truth для продукта и переводов. `inventory` хранит
только денормализованный read projection, нужный для списка и cursor pagination.

## Почему не federation sort

Текущий stock list read path читает строки через `catalogQuery.variants`, а
inventory data резолвится через federation:

```graphql
Variant.inventoryItem
InventoryItem.stock
```

Так можно отрисовать текущую страницу, но нельзя корректно отсортировать или
отфильтровать весь connection по stock columns и product name:

- `catalogQuery.variants` выполняется в Catalog service;
- `inventoryItem` и `stock` появляются после pagination;
- federation не должна быть местом, где выполняется SQL sort/filter по данным
  другого сервиса.

Поэтому список должен быть owned by Inventory service, но возвращать canonical
`InventoryItem`.

## Target GraphQL API

Расширить существующий `InventoryQuery.inventoryItems`, а не добавлять новый
специальный list type:

```graphql
type InventoryQuery {
  inventoryItems(
    first: Int
    after: String
    last: Int
    before: String
    where: InventoryItemWhereInput
    orderBy: [InventoryItemOrderByInput!]
    meta: InventoryItemInventoryItemsMetaInput
  ): InventoryItemConnection!
}
```

`warehouseScope` задает optional stock scope только для stock columns и живет в
`meta`, как `products(..., meta: { categoriesScope })` и
`categories(..., meta: { hierarchyScope, productsScope })` в Catalog service.
В упрощенной версии GraphQL input сохраняет будущий формат `referenceIds +
mode`, но repository поддерживает только `mode: INCLUDE` с ровно одним warehouse
reference. Unsupported scope варианты не должны silently fallback-ить в
all-stock view: `EXCLUDE` и `INCLUDE` с нулем или несколькими ids должны вернуть
явную input incompatibility error до выполнения list query.

Если `meta.warehouseScope` не передан, stock fields считаются суммой по всем
существующим `warehouse_stock` rows текущего project. Это значит, что
`quantityOnHand`, `reservedQuantity`, `unavailableQuantity` и
`availableForSale` можно использовать в `where` / `orderBy` без явного склада.

Если `meta.warehouseScope` передан как `INCLUDE` с одним id в `referenceIds`,
stock fields считаются только для этого warehouse. Если для item нет
`warehouse_stock` row в выбранном warehouse, stock values считаются `0`.

Сам `InventoryItem` может существовать без `WarehouseStock`, поэтому отсутствие
stock row не должно исключать item из connection.

`InventoryItemConnection` и `InventoryItemEdge` остаются обычными:

```graphql
type InventoryItemConnection {
  edges: [InventoryItemEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type InventoryItemEdge {
  node: InventoryItem!
  cursor: String!
}
```

`InventoryItem` должен оставаться canonical entity type. Если клиенту нужен
product context, его нужно получать через reference к `Variant`:

```graphql
type InventoryItem implements Node @key(fields: "id") {
  id: ID!
  variantId: ID!
  variant: Variant!

  sku: String
  trackInventory: Boolean!
  continueSellingWhenOutOfStock: Boolean!
  stock: [WarehouseStock!]!
  totalAvailable: Int!
}
```

`productName` не обязан быть отдельным полем на `InventoryItem`. Для отображения
можно читать canonical catalog data:

```graphql
node {
  id
  sku
  variant {
    id
    product {
      id
      title
      handle
    }
  }
  stock {
    warehouseId
    quantityOnHand
    reservedQuantity
    unavailableQuantity
    availableForSale
  }
}
```

Но `productName` должен быть доступен в `InventoryItemWhereInput` и
`InventoryItemOrderByInput` как list query key, backed by inventory projection.

Минимальные filter fields:

```graphql
input InventoryItemWhereInput {
  _and: [InventoryItemWhereInput!]
  _or: [InventoryItemWhereInput!]
  _not: InventoryItemWhereInput

  id: IDFilter
  variantId: IDFilter
  productId: IDFilter
  productName: StringFilter
  sku: StringFilter
  trackInventory: BooleanFilter

  quantityOnHand: IntFilter
  reservedQuantity: IntFilter
  unavailableQuantity: IntFilter
  availableForSale: IntFilter
}
```

Минимальные order fields:

```graphql
enum InventoryItemOrderField {
  productName
  sku
  quantityOnHand
  reservedQuantity
  unavailableQuantity
  availableForSale
  updatedAt
  id
  variantId
}

input InventoryItemOrderByInput {
  field: InventoryItemOrderField!
  direction: SortDirection!
}
```

Metadata input follows the Catalog connection pattern:

```graphql
input InventoryItemInventoryItemsMetaInput {
  warehouseScope: InventoryItemWarehouseScopeInput
}

enum InventoryItemWarehouseScopeMode {
  INCLUDE
  EXCLUDE
}

input InventoryItemWarehouseScopeInput {
  referenceIds: [ID!]!
  mode: InventoryItemWarehouseScopeMode!
}
```

`referenceIds` are `Warehouse` global IDs. The resolver normalizes them before
calling the repository, just like Catalog normalizes category/product scope
global IDs before building repository filters. In this phase only
`mode: INCLUDE` with exactly one decoded warehouse id activates the
warehouse-scoped view.

Search мапится в query filter:

```ts
where: {
  _or: [
    { productName: { _containsi: search } },
    { sku: { _containsi: search } },
  ],
}
```

## Target DB Model

Нужны две projection tables:

1. base projection для связи inventory item / variant / product;
2. catalog-style translation table для product names по locale.

Так product name ведет себя как `catalog.product_translation`: изменение имени в
одной локали обновляет только строку этой локали, а список фильтруется по
активной локали.

### `inventory.inventory_item_catalog_projection`

Хранит нелокализованный catalog snapshot для inventory item list.

```ts
export const inventoryItemCatalogProjection = inventorySchema.table(
  "inventory_item_catalog_projection",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),

    variantId: uuid("variant_id").notNull(),
    productId: uuid("product_id").notNull(),
    productHandle: text("product_handle"),

    externalSystem: text("external_system"),
    externalId: text("external_id"),

    catalogRevision: integer("catalog_revision"),
    lastCatalogEventId: text("last_catalog_event_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
);
```

Indexes/constraints:

- unique `(project_id, variant_id)`;
- index `(project_id, product_id)`;
- index `(project_id, deleted_at)`.

Do not store `inventoryItemId` in this projection. The invariant between Catalog
variant and canonical Inventory item is `inventory_item.variant_id`, which is
already unique. The list view must join real `inventory_item` by
`(projectId, variantId)` and return only existing inventory items. This avoids a
second identifier that would need out-of-order event synchronization.

### `inventory.inventory_product_translation`

Хранит product name по locale тем же translation-паттерном, что и catalog:
`projectId`, `productId`, `locale`, `name`. Это inventory-local копия catalog
translation для read model, но форма таблицы должна оставаться catalog-style
translation, а не `productName`-specific projection.

```ts
export const inventoryProductTranslation = inventorySchema.table(
  "inventory_product_translation",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_inventory_product_translation_project").on(table.projectId),
    index("idx_inventory_product_translation_project_locale").on(
      table.projectId,
      table.locale,
    ),
    index("idx_inventory_product_translation_project_locale_name").on(
      table.projectId,
      table.locale,
      table.name,
    ),
  ],
);
```

Indexes/constraints:

- primary key `(product_id, locale)`, matching `catalog.product_translation`;
- index `(project_id)`;
- index `(project_id, locale)`;
- index `(project_id, locale, name)`;
- optional trigram index for `name` if `_containsi` becomes slow.

Не добавлять `catalogRevision`, `lastCatalogEventId`, `createdAt` или `updatedAt`
в translation table, чтобы она оставалась такой же по форме, как
`catalog.product_translation`. Sync metadata остается в base projection или в
логах handler-а.

Не хранить `locale` и `name` в base projection. Locale-specific data должна
жить только в translation table. View может alias-ить `name` как `productName`
для GraphQL filter/order API.

## Target Views

Add two ordinary PostgreSQL views. Both views expose the same list fields used by
GraphQL filter/order keys, including stock columns as regular view columns. This
keeps the connection compatible with the current `@shopana/drizzle-query` API and
does not require runtime computed fields or runtime stock joins.

```text
inventory.inventory_item_list_all_stock_view
inventory.inventory_item_list_warehouse_stock_view
```

Both views join the same base item projection:

- `inventory_item`;
- `inventory_item_catalog_projection`;
- `inventory_product_translation`.

The views intentionally do not filter locale. Repository scope does that so the
same views support any locale.

### `inventory.inventory_item_list_all_stock_view`

Used when `meta.warehouseScope` is omitted. One row represents one
`InventoryItem` in one locale. Stock columns are sums across all existing
`warehouse_stock` rows in the current project.

Conceptual shape:

```sql
SELECT
  item.project_id,
  item.id,
  item.variant_id,
  projection.product_id,
  projection.product_handle,
  translation.locale,
  translation.name AS product_name,
  item.sku,
  item.track_inventory,
  item.continue_selling_when_out_of_stock,
  projection.deleted_at,
  greatest(item.updated_at, coalesce(projection.updated_at, item.updated_at)) AS updated_at,
  coalesce(stock.quantity_on_hand, 0) AS quantity_on_hand,
  coalesce(stock.reserved_quantity, 0) AS reserved_quantity,
  coalesce(stock.unavailable_quantity, 0) AS unavailable_quantity,
  coalesce(stock.quantity_on_hand, 0)
    - coalesce(stock.reserved_quantity, 0)
    - coalesce(stock.unavailable_quantity, 0) AS available_for_sale
FROM inventory.inventory_item item
JOIN inventory.inventory_item_catalog_projection projection
  ON projection.project_id = item.project_id
 AND projection.variant_id = item.variant_id
JOIN inventory.inventory_product_translation translation
  ON translation.project_id = item.project_id
 AND translation.product_id = projection.product_id
LEFT JOIN (
  SELECT
    project_id,
    variant_id,
    SUM(quantity_on_hand) AS quantity_on_hand,
    SUM(reserved_qty) AS reserved_quantity,
    SUM(unavailable_qty) AS unavailable_quantity
  FROM inventory.warehouse_stock
  GROUP BY project_id, variant_id
) stock
  ON stock.project_id = item.project_id
 AND stock.variant_id = item.variant_id
```

### `inventory.inventory_item_list_warehouse_stock_view`

Used when `meta.warehouseScope` is `mode: INCLUDE` with exactly one id in
`referenceIds`. One row represents one `InventoryItem` in one locale for one
warehouse. The view must create rows from `inventory_item × warehouses` and then
`LEFT JOIN warehouse_stock`; it must not start from `warehouse_stock`, otherwise
items without stock in the selected warehouse would disappear instead of
returning zero values.

Conceptual shape:

```sql
SELECT
  item.project_id,
  item.id,
  item.variant_id,
  projection.product_id,
  projection.product_handle,
  translation.locale,
  translation.name AS product_name,
  warehouse.id AS warehouse_scope_id,
  item.sku,
  item.track_inventory,
  item.continue_selling_when_out_of_stock,
  projection.deleted_at,
  greatest(item.updated_at, coalesce(projection.updated_at, item.updated_at)) AS updated_at,
  coalesce(stock.quantity_on_hand, 0) AS quantity_on_hand,
  coalesce(stock.reserved_qty, 0) AS reserved_quantity,
  coalesce(stock.unavailable_qty, 0) AS unavailable_quantity,
  coalesce(stock.quantity_on_hand, 0)
    - coalesce(stock.reserved_qty, 0)
    - coalesce(stock.unavailable_qty, 0) AS available_for_sale
FROM inventory.inventory_item item
JOIN inventory.inventory_item_catalog_projection projection
  ON projection.project_id = item.project_id
 AND projection.variant_id = item.variant_id
JOIN inventory.inventory_product_translation translation
  ON translation.project_id = item.project_id
 AND translation.product_id = projection.product_id
JOIN inventory.warehouses warehouse
  ON warehouse.project_id = item.project_id
LEFT JOIN inventory.warehouse_stock stock
  ON stock.project_id = item.project_id
 AND stock.variant_id = item.variant_id
 AND stock.warehouse_id = warehouse.id
```

Repository scope must add:

- `projectId = ctx.store.id`;
- `locale = ctx.locale ?? "uk"`;
- `deletedAt is null`;
- `warehouseScopeId = normalizedWarehouseId` only for the warehouse-scoped view.

### Warehouse stock scope

`warehouseScope` keeps the future-compatible `INCLUDE` / `EXCLUDE` input shape,
but this plan only supports `INCLUDE` with exactly one warehouse id. Unsupported
scope variants are incompatible with this phase and must produce an explicit
GraphQL input error before executing the list query.

Repository must split execution into these paths:

1. **All warehouses path**: used when `meta.warehouseScope` is omitted. It
   queries `inventory_item_list_all_stock_view`. Stock filters/order fields use
   all-warehouse totals from the view.
2. **Single warehouse path**: used when normalized `warehouseScope` is
   `INCLUDE` with exactly one valid warehouse id. It queries
   `inventory_item_list_warehouse_stock_view` and adds an internal
   `warehouseScopeId = warehouseId` filter.
3. **Invalid scope path**: used when `warehouseScope` is `EXCLUDE` or `INCLUDE`
   with zero/multiple ids. The resolver returns an input incompatibility error;
   it must not call the repository and must not silently use all-warehouse
   totals.
4. **Empty scope path**: used when an explicitly provided single warehouse
   reference is invalid or resolves to no warehouse in the current project. It
   returns an empty connection. This is distinct from a valid warehouse with no
   stock rows: valid warehouses still return all items with zero stock values
   where no `warehouse_stock` row exists.

Important behavior:

- `meta.warehouseScope.referenceIds` must be decoded from `Warehouse` global IDs
  before choosing the repository query.
- Only `mode: INCLUDE` with exactly one decoded id can produce
  `{ kind: "warehouse" }`.
- `mode: EXCLUDE` and `mode: INCLUDE` with zero/multiple ids produce a
  resolver-level input error such as
  `UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE`; they do not produce
  `{ kind: "all" }`.
- Stock fields in `where` or `orderBy` are valid without `warehouseScope`; the
  default scope is all existing warehouses in the current project.
- Missing matching `warehouse_stock` rows in the warehouse-scoped view produce
  `0` values for stock fields.
- `warehouseScopeId` is an internal repository/view field. Do not expose it in
  GraphQL `InventoryItemWhereInput`.
- No `@shopana/drizzle-query` extension is required for this simplified scope,
  because stock fields are ordinary view columns.

Repository-normalized type mirrors Catalog scope normalizers:

```ts
type NormalizedInventoryItemWarehouseScope =
  | { kind: "all" }
  | { kind: "empty" }
  | { kind: "warehouse"; warehouseId: string }
  | { kind: "invalid"; code: string; message: string };
```

Normalization rules:

```ts
if (!input) return { kind: "all" };
if (input.mode !== "INCLUDE") {
  return {
    kind: "invalid",
    code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
    message: "Only warehouseScope mode INCLUDE is supported for inventoryItems.",
  };
}
if (input.referenceIds?.length !== 1) {
  return {
    kind: "invalid",
    code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
    message: "inventoryItems supports exactly one warehouseScope referenceId.",
  };
}

const warehouseId = decodeWarehouseGlobalId(input.referenceIds[0]);
if (!warehouseId) return { kind: "empty" };

return { kind: "warehouse", warehouseId };
```

The resolver must throw/return the normalized input error before calling the
repository. Optionally validate that the decoded warehouse belongs to the current
project before executing the list query. A decoded but missing/foreign warehouse
should produce `{ kind: "empty" }`, not an inner join that changes item
listability.

## Repository

Update `InventoryItemRepository` or add a small list-query repository used by it.
The public repository method should still be `inventoryItem.getConnection(...)`,
because GraphQL returns `InventoryItemConnection`.

Relay queries:

```ts
export const inventoryItemAllStockRelayQuery = createRelayQuery(
  createQuery(inventoryItemListAllStockView)
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" },
);

export const inventoryItemWarehouseStockRelayQuery = createRelayQuery(
  createQuery(inventoryItemListWarehouseStockView)
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" },
);
```

Both relay queries must expose the same GraphQL-facing `where` / `orderBy`
fields. `warehouseScopeId` exists only on the warehouse-scoped view and is added
by the repository as an internal filter; it must not be accepted from GraphQL
input.

`getConnection()`:

```ts
export type InventoryItemConnectionMetaInput = {
  warehouseScope?: NormalizedInventoryItemWarehouseScope;
};

export type InventoryItemConnectionInput = InventoryItemListRelayInput & {
  meta?: InventoryItemConnectionMetaInput;
};

const { where, orderBy, meta, ...paginationArgs } = args;
const warehouseScope = meta?.warehouseScope ?? { kind: "all" };

if (warehouseScope.kind === "empty") {
  return emptyInventoryItemConnection();
}

const relayQuery =
  warehouseScope.kind === "warehouse"
    ? inventoryItemWarehouseStockRelayQuery
    : inventoryItemAllStockRelayQuery;

const mergedWhere = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    { deletedAt: { _is: null } },
    ...(warehouseScope.kind === "warehouse"
      ? [{ warehouseScopeId: { _eq: warehouseScope.warehouseId } }]
      : []),
    ...(where ? [where] : []),
  ],
};

const executeInput = {
  ...paginationArgs,
  where: mergedWhere,
  orderBy: orderBy ?? [
    { field: "productName", direction: "asc" },
  ],
};

const [result, totalCount] = await Promise.all([
  relayQuery.execute(this.connection, executeInput),
  relayQuery.count(this.connection, { where: mergedWhere }),
]);

return {
  edges: result.edges.map((edge) => ({
    cursor: edge.cursor,
    nodeId: edge.node.id,
  })),
  pageInfo: result.pageInfo,
  totalCount,
};
```

The repository chooses the relay query from `warehouseScope`, not from the
presence of stock fields. Stock fields are available in both views, so
`quantityOnHand`, `reservedQuantity`, `unavailableQuantity` and
`availableForSale` can be used in `where` / `orderBy` with or without
`warehouseScope`.

`totalCount` must use the exact same `mergedWhere`; otherwise filtered count will
not match the returned edges.

Do not add `id` manually to the default `orderBy`: `createRelayQuery` already
receives `tieBreaker: "id"` and should append it for stable cursor ordering.

## GraphQL Resolver

`InventoryQueryResolver.inventoryItems` should:

- normalize optional `meta.warehouseScope` through a resolver helper, mirroring
  `normalizeProductCategoriesScopeInput` and `normalizeCategoryProductsScopeInput`;
- decode `meta.warehouseScope.referenceIds` as `Warehouse` global IDs;
- return a GraphQL input incompatibility error for unsupported scope
  combinations such as `EXCLUDE`, `INCLUDE` with zero ids, or `INCLUDE` with
  multiple ids;
- pass only valid normalized scopes `{ kind: "all" }`,
  `{ kind: "warehouse", warehouseId }`, or `{ kind: "empty" }` to the
  repository;
- allow stock filter/order fields when `warehouseScope` is omitted, using the
  default all-warehouses view;
- call inventory item connection repository;
- return `InventoryItemConnection`;
- create each edge node as `new InventoryItemResolver(nodeId, ctx)`.

No `InventoryVariantListItem` / `InventoryItemListItem` GraphQL object should be
introduced.

Add `InventoryItem.variant` to the GraphQL schema. The resolver already has
enough data through `InventoryItem.variantId` to return a federation reference:

```ts
{
  __typename: "Variant",
  id: encodeGlobalIdByType(variantId, GlobalIdEntity.Variant),
}
```

### Stock field loading

Stock-scoped list sorting/filtering uses `meta.warehouseScope`, but
`InventoryItem.stock` is still a canonical field that loads stock for all
warehouses from `InventoryItemResolver.stock`.

For the first migration step, clients may continue to query `node.stock` and
apply the same warehouse scope client-side for display: pick the selected
warehouse when `warehouseScope` is supported `INCLUDE` with one id, or sum all
warehouses when scope is omitted. Unsupported scopes return an input error and
should not reach display mapping. This creates N+1 and overfetch risk if stock
loading is not batched.

This does not need a new repository design. `StockRepository` already has
`getByVariantsBatch(variantIds)`, so the implementation should wire that method
through request-scoped DataLoader:

- add `stockByVariant` / `stockByVariants` loader that calls
  `repository.stock.getByVariantsBatch([...variantIds])`;
- update `InventoryItemResolver.stock()` to load all listed variants through
  that DataLoader;
- update `InventoryItemResolver.totalAvailable()` and `inStock()` to reuse the
  same batched stock data instead of calling `getByVariantId()` per node.

An alternative future improvement is a scoped stock summary field/argument or
connection path that returns only the scoped stock aggregate, while keeping
canonical `stock` available for all-warehouse reads.

The list view's warehouse-scoped values are for SQL filter/sort only; do not
silently make `InventoryItem.stock` mean "warehouseScope only" without an
explicit field/argument, because that would change canonical field semantics.

## Variant / InventoryItem Lifecycle

`InventoryItem` is the canonical Inventory-owned entity for a Catalog variant,
but Catalog owns the variant lifecycle. When Catalog deletes a variant,
Inventory must stop exposing that item through list APIs immediately.

Variant deletion rules:

- `variantDeleted` must soft-delete the corresponding
  `inventory_item_catalog_projection` row by `(projectId, variantId)`;
- `inventoryQuery.inventoryItems` excludes the item through
  `inventory_item_catalog_projection.deleted_at is null`;
- canonical `inventory_item` may be retained for audit/history and to preserve
  existing stock/cost/change records unless a separate hard-delete cleanup
  policy is defined;
- retained canonical `inventory_item` is not enough to make the item listable:
  the list is controlled by the projection row lifecycle.

Node lookup rules:

- Query resolvers must be read-only. They must not create, upsert, or repair
  `InventoryItem` / projection rows as a side effect of resolving
  `inventoryItem`, `inventoryItemByVariant`, federation references, or list
  nodes.
- `inventoryItem(id)` should return the canonical item only if its projection row
  is active; otherwise return `null` so deleted variants do not remain reachable
  from list APIs;
- `inventoryItemByVariant(variantId)` must not lazily recreate or expose an
  `InventoryItem` when the projection row is missing or soft-deleted. It should
  return `null` for missing, deleted, or unknown variants. If a caller needs an
  item to exist, that must happen through a command/write path such as product
  create saga, inventory broker action, or projection event sync;
- federation reference resolution for `InventoryItem` should follow the same
  active-projection rule to avoid returning orphan inventory entities.

The current `inventoryItemByVariant` resolver uses lazy `upsertByVariantId`.
That behavior must be removed before read paths rely on
`inventoryQuery.inventoryItems`. Read queries must not repair missing projection
state.

## Catalog Snapshot Sync

Projection is updated from catalog product change events, but Inventory must not
blindly trust partial event payloads for localized names.

Current risks:

- `productUpdated.product.title` is a partial field and currently does not carry
  an explicit locale in the shared event type;
- catalog handlers often default locale to `uk`;
- if Inventory applies a title update without locale, it can overwrite the wrong
  translation row or only update `uk`.

Required Phase 1 contract: add a catalog broker snapshot action that returns
base projection plus translations.

This must be a full inter-service contract, not an ad-hoc local helper:

- add request/response types to `packages/broker-types` under Catalog actions,
  for example `Catalog.GetInventoryItemProjectionSnapshotParams` and
  `Catalog.GetInventoryItemProjectionSnapshotResult`;
- register `@Action("getInventoryItemProjectionSnapshot")` in
  `services/catalog/src/actions/index.ts` (currently Catalog broker actions only
  expose `getOffers`);
- execute the action under explicit Catalog service context built from
  `storeId`, `organizationId`, request `locale` / default locale, and optional
  `userId` / `requestId`; do not hardcode `uk` inside the action;
- define retry semantics: broker failures, missing transient dependencies, and
  snapshot query failures are retryable for Inventory event handlers;
  invalid input and confirmed missing/deleted Catalog entities are not
  retryable business outcomes.

This is a prerequisite for Inventory projection handlers.
Do not implement `inventory_product_translation` updates from existing
`productCreated.name` or `productUpdated.product.title` payloads directly:
those payloads are not locale-complete and can write the wrong translation row.
Until either this snapshot action exists or product events become explicitly
locale-aware, Inventory must fetch the snapshot before writing localized product
name rows.

```ts
catalog.getInventoryItemProjectionSnapshot({
  storeId: string;
  organizationId: string;
  locale?: string;
  userId?: string;
  requestId?: string;
  productId: string;
  variantIds?: string[];
  locales?: string[];
})
```

`locale` is the request context locale. `locales` is an optional translation
filter for the snapshot payload; when omitted, Catalog should return all product
translation rows needed to keep Inventory's projection locale-complete.

Response:

```ts
{
  productId: string;
  productHandle: string | null;
  deletedAt: string | null;
  revision: number | null;
  variants: Array<{
    variantId: string;
    externalSystem: string | null;
    externalId: string | null;
    deletedAt: string | null;
  }>;
  translations: Array<{
    productId: string;
    locale: string;
    name: string;
  }>;
}
```

Catalog builds the snapshot from:

- `product`;
- `product_translation`;
- `variant`.

Variant translations are not needed for this table.

## Locale Update Rules

When product name changes in one locale, Inventory must update only that locale's
row in `inventory_product_translation`.

Implementation options:

1. Extend product events so title changes include locale:

```ts
product: {
  translation?: {
    locale: string;
    name: string;
  };
}
```

2. If event payload does not include locale, Inventory handler must fetch all
product translations for that product from catalog snapshot and upsert them all.

Do not infer locale from handler defaults. Do not write a changed product name to
`uk` unless the event/snapshot explicitly says the changed locale is `uk`.

The list repository filters the view with `locale = ctx.locale ?? "uk"`, so:

- Ukrainian request locale filters/sorts by Ukrainian `productName`;
- English request locale filters/sorts by English `productName`;
- changing the English name updates only the English translation row.

## Implementation Order

1. Add `catalog.getInventoryItemProjectionSnapshot` and make it return base
   product/variant projection plus all requested product translations.
2. Add Inventory projection tables/view/repository.
3. Add Inventory event handlers that always use the snapshot action when the
   event payload does not explicitly identify changed locales.

## Inventory Event Handlers

Extend `services/inventory/src/InventoryEventHandlers.ts`.

Handle:

- `productCreated`: fetch full snapshot and upsert base + translation rows;
- `productUpdated`: fetch changed locales/variants when event tells us enough;
  otherwise fetch full product snapshot;
- `productDeleted`: soft-delete base projection rows by productId and delete or
  retain `inventory_product_translation` rows according to retention policy;
- `variantDeleted`: soft-delete base projection row by variantId.

Variant create/delete flows must emit a product-level change event or dedicated
variant event.

Handler rules:

- base projection upsert is idempotent on `(projectId, variantId)`;
- translation upsert is idempotent on `(productId, locale)` and scoped by
  `projectId` for query safety;
- `catalogRevision` prevents applying older snapshots over newer rows when
  revision is present;
- `lastCatalogEventId` is stored for observability/debugging;
- snapshot fetch failure is retryable.

## Implementation Phases

### Phase 1. Catalog snapshot provider

- Add catalog broker action for inventory item projection snapshots.
- Add typed broker contract in `packages/broker-types` and use it from both
  Catalog action implementation and Inventory callers.
- Register `@Action("getInventoryItemProjectionSnapshot")` in Catalog broker
  actions and run it with explicit store/org/locale context.
- Document and implement retry semantics for Inventory consumers of the action.
- Return base variant/product snapshot separately from product translations.
- Include all locales or explicitly requested locales.
- Do not include variant names.
- Do not start Inventory projection event sync until this action exists, unless
  product events are changed to be explicitly locale-aware first.

### Phase 2. DB model and view

- Add `inventoryItemCatalogProjection`.
- Add `inventoryProductTranslation`.
- Add `inventoryItemListAllStockView`.
- Add `inventoryItemListWarehouseStockView`.
- Export models from inventory repository models index.
- Generate Drizzle migration for tables, indexes and views.

### Phase 3. Repository and GraphQL schema

- Implement `inventoryItem.getConnection(...)` over the two inventory item list
  views.
- Extend `InventoryItemWhereInput` and `InventoryItemOrderByInput`.
- Keep `InventoryItemConnection` / `InventoryItemEdge` returning
  `InventoryItem`.
- Add `InventoryItem.variant` to the GraphQL schema. The resolver already exists,
  but the field must be present in schema before clients can query it.
- Add a stock DataLoader backed by existing
  `repository.stock.getByVariantsBatch()` and use it from
  `InventoryItemResolver.stock()`, `totalAvailable()` and `inStock()`.
- Update `InventoryQuery.inventoryItems` args to include Relay pagination,
  `where`, `orderBy` and `meta`.
- Add `InventoryItemWarehouseScopeInput` and resolver-side normalization for
  `meta.warehouseScope.referenceIds` / `mode`.
- Make `inventoryItem`, `inventoryItemByVariant`, federation reference
  resolution, and list node resolution read-only. Remove lazy
  `upsertByVariantId` from query resolvers; missing active projection means the
  resolver returns `null`, not that it creates or repairs data.

### Phase 4. Event sync

- Extend inventory event handlers for product create/update/delete and variant
  delete.
- Ensure locale-specific product name changes update only the matching
  translation row.
- Ensure variant create/delete flows emit events Inventory can consume.

## Out of Scope

- Replacing stock write path.
- Full-text search infrastructure.
- Materialized view refresh strategy.
- Projection data backfill / reindex.
- Cross-service SQL joins into catalog schema.
- Making projection the source of truth for product names.
- Introducing a special list GraphQL node type.
- Applying multi-warehouse `INCLUDE` or `EXCLUDE` warehouse scope semantics.
  The input shape remains, but unsupported combinations return an explicit input
  incompatibility error in this phase.
- Extending `@shopana/drizzle-query` for runtime stock joins or runtime computed
  stock fields.
- Running local test/tsc verification as part of this planning task.

## Strict Execution Order

### Phase 1. Catalog snapshot contract

1. Add typed broker request/response contracts for
   `catalog.getInventoryItemProjectionSnapshot` in `packages/broker-types`.
2. Implement the Catalog snapshot query from `product`, `product_translation`
   and `variant`.
3. Register `@Action("getInventoryItemProjectionSnapshot")` in Catalog broker
   actions.
4. Execute the action under explicit store/org/locale context.
5. Return base product/variant projection separately from product translations.
6. Define retryable and non-retryable outcomes for Inventory callers.

Do not start Inventory projection event sync before this phase is complete,
unless product events are changed to be explicitly locale-aware first.

### Phase 2. Inventory database model

1. Add `inventoryItemCatalogProjection`.
2. Add `inventoryProductTranslation`.
3. Add `inventoryItemListAllStockView`.
4. Add `inventoryItemListWarehouseStockView`.
5. Export the new tables/views from the inventory repository models index.
6. Generate the Drizzle migration for the new tables, indexes and views.

### Phase 3. Inventory list repository

1. Add relay query support for `inventoryItemListAllStockView`.
2. Add relay query support for `inventoryItemListWarehouseStockView`.
3. Map GraphQL-facing `where` fields, including global ID decoding for `id`,
   `productId` and `variantId`.
4. Keep `warehouseScopeId` internal to the repository path.
5. Implement all-warehouses connection execution.
6. Implement single-warehouse connection execution.
7. Implement empty-scope connection execution.
8. Use the same merged `where` for page edges and `totalCount`.

### Phase 4. GraphQL schema and resolvers

1. Extend `InventoryItemWhereInput`.
2. Extend `InventoryItemOrderByInput`.
3. Add `InventoryItemInventoryItemsMetaInput`.
4. Add `InventoryItemWarehouseScopeInput` and
   `InventoryItemWarehouseScopeMode`.
5. Add `InventoryItem.variant` to the GraphQL schema.
6. Normalize `meta.warehouseScope` in the resolver before calling the
   repository.
7. Return explicit input incompatibility errors for unsupported warehouse scope
   combinations.
8. Wire `InventoryQuery.inventoryItems` to `inventoryItem.getConnection(...)`.
9. Make `inventoryItem`, `inventoryItemByVariant`, federation reference
   resolution and list node resolution read-only.

### Phase 5. Stock field batching

1. Add a request-scoped stock-by-variant DataLoader.
2. Back the loader with `repository.stock.getByVariantsBatch(...)`.
3. Update `InventoryItemResolver.stock()` to use the loader.
4. Update `InventoryItemResolver.totalAvailable()` to reuse the same loaded
   stock data.
5. Update `InventoryItemResolver.inStock()` to reuse the same loaded stock data.

### Phase 6. Inventory projection event sync

1. Extend inventory event handlers for `productCreated`.
2. Extend inventory event handlers for `productUpdated`.
3. Extend inventory event handlers for `productDeleted`.
4. Extend inventory event handlers for `variantDeleted`.
5. Fetch Catalog snapshots when event payloads are not locale-complete.
6. Upsert base projection rows idempotently by `(projectId, variantId)`.
7. Upsert translation rows idempotently by `(productId, locale)`.
8. Apply `catalogRevision` ordering when revision is present.
9. Persist `lastCatalogEventId` for observability/debugging.
10. Ensure variant create/delete flows emit events Inventory can consume.
