# План: inventory item list projection для Admin stock table

## Цель

Сделать `inventoryQuery.inventoryItems` основным API для Admin stock table.
Connection должен возвращать обычные `InventoryItem` nodes, а не специальный
`InventoryVariantListItem`.

При этом список должен уметь делать SQL-level search, filter и sort по:

- `productName` в текущей локали;
- `sku`;
- stock columns выбранного склада: `quantityOnHand`, `reservedQuantity`,
  `unavailableQuantity`, `availableForSale`;
- стабильным tie-breaker полям вроде `id` / `variantId`.

`catalog` остается source of truth для продукта и переводов. `inventory` хранит
только денормализованный read projection, нужный для списка и cursor pagination.

## Почему не federation sort

Текущий Admin Inventory page читает строки через `catalogQuery.variants`, а
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
    warehouseId: ID
    where: InventoryItemWhereInput
    orderBy: [InventoryItemOrderByInput!]
  ): InventoryItemConnection!
}
```

`warehouseId` задает stock scope для list filter/sort. Если он не передан,
resolver может использовать default warehouse. Если default warehouse не
настроен, resolver возвращает пустой connection, а Admin UI остается read-only.

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

`InventoryItem` должен оставаться canonical entity type. Если Admin page нужен
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

Admin search мапится в query filter:

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

## Target View

Добавить обычную PostgreSQL VIEW:

```text
inventory.inventory_item_list_view
```

View объединяет:

- `inventory_item`;
- `inventory_item_catalog_projection`;
- `inventory_product_translation`;
- `warehouses`;
- `warehouse_stock`.

Концептуальная Drizzle модель:

```ts
export const inventoryItemListView = inventorySchema
  .view("inventory_item_list_view")
  .as((qb) =>
    qb
      .select({
        projectId: inventoryItem.projectId,
        id: inventoryItem.id,
        variantId: inventoryItem.variantId,
        productId: inventoryItemCatalogProjection.productId,
        productHandle: inventoryItemCatalogProjection.productHandle,

        locale: inventoryProductTranslation.locale,
        productName: inventoryProductTranslation.name,

        sku: inventoryItem.sku,
        trackInventory: inventoryItem.trackInventory,
        continueSellingWhenOutOfStock:
          inventoryItem.continueSellingWhenOutOfStock,

        warehouseId: warehouses.id,
        stockId: warehouseStock.id,
        quantityOnHand: sql<number>`coalesce(${warehouseStock.quantityOnHand}, 0)`.as("quantity_on_hand"),
        reservedQuantity: sql<number>`coalesce(${warehouseStock.reservedQty}, 0)`.as("reserved_quantity"),
        unavailableQuantity: sql<number>`coalesce(${warehouseStock.unavailableQty}, 0)`.as("unavailable_quantity"),
        availableForSale: sql<number>`
          coalesce(${warehouseStock.quantityOnHand}, 0)
          - coalesce(${warehouseStock.reservedQty}, 0)
          - coalesce(${warehouseStock.unavailableQty}, 0)
        `.as("available_for_sale"),
        deletedAt: inventoryItemCatalogProjection.deletedAt,
        updatedAt: sql<string>`
          greatest(
            ${inventoryItem.updatedAt},
            coalesce(${inventoryItemCatalogProjection.updatedAt}, ${inventoryItem.updatedAt}),
            coalesce(${warehouseStock.updatedAt}, ${inventoryItem.updatedAt})
          )
        `.as("updated_at"),
      })
      .from(inventoryItem)
      .innerJoin(
        inventoryItemCatalogProjection,
        sql`${inventoryItemCatalogProjection.projectId} = ${inventoryItem.projectId}
          AND ${inventoryItemCatalogProjection.variantId} = ${inventoryItem.variantId}`
      )
      .innerJoin(
        inventoryProductTranslation,
        sql`${inventoryProductTranslation.projectId} = ${inventoryItem.projectId}
          AND ${inventoryProductTranslation.productId} = ${inventoryItemCatalogProjection.productId}`
      )
      .innerJoin(
        warehouses,
        sql`${warehouses.projectId} = ${inventoryItem.projectId}`
      )
      .leftJoin(
        warehouseStock,
        sql`${warehouseStock.projectId} = ${inventoryItem.projectId}
          AND ${warehouseStock.variantId} = ${inventoryItem.variantId}
          AND ${warehouseStock.warehouseId} = ${warehouses.id}`
      )
  );
```

View intentionally does not filter locale or warehouse. Repository scope does
that so the same view supports any locale and warehouse.

Repository scope must add:

- `projectId = ctx.store.id`;
- `locale = ctx.locale ?? "uk"`;
- `warehouseId = selected/default warehouse`;
- `deletedAt is null`.

## Repository

Update `InventoryItemRepository` or add a small list-query repository used by it.
The public repository method should still be `inventoryItem.getConnection(...)`,
because GraphQL returns `InventoryItemConnection`.

Relay query:

```ts
export const inventoryItemRelayQuery = createRelayQuery(
  createQuery(inventoryItemListView)
    .include(["id", "variantId", "warehouseId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
      warehouseId: decodeWarehouseGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" },
);
```

`getConnection()`:

```ts
const mergedWhere = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { locale: { _eq: this.locale } },
    { warehouseId: { _eq: warehouseId } },
    { deletedAt: { _is: null } },
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
  inventoryItemRelayQuery.execute(this.connection, executeInput),
  inventoryItemRelayQuery.count(this.connection, { where: mergedWhere }),
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

`totalCount` must use the exact same `mergedWhere`; otherwise filtered count will
not match the returned edges.

Do not add `id` manually to the default `orderBy`: `createRelayQuery` already
receives `tieBreaker: "id"` and should append it for stable cursor ordering.

## GraphQL Resolver

`InventoryQueryResolver.inventoryItems` should:

- decode optional `warehouseId`;
- resolve default warehouse when `warehouseId` is omitted;
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

`inventory_item_list_view` scopes list sorting/filtering to one selected
warehouse, but `InventoryItem.stock` is still a canonical field that currently
loads stock for all warehouses from `InventoryItemResolver.stock`.

For the first migration step, Admin may continue to query `node.stock` and pick
the selected warehouse client-side, but this creates N+1 and overfetch risk:
each listed item can trigger a separate all-warehouses stock query.

Before enabling the new Admin read path for large stores, add one of these
mechanisms:

- preferred: batch stock loading by variant IDs through a DataLoader, so
  `InventoryItem.stock` resolves all listed nodes in one repository call;
- alternative: add a scoped stock field/argument or connection path that returns
  only the selected warehouse stock, while keeping canonical `stock` available
  for all-warehouse reads.

The list view's selected-warehouse values are for SQL filter/sort only; do not
silently make `InventoryItem.stock` mean "selected warehouse only" without an
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

- `inventoryItem(id)` should return the canonical item only if its projection row
  is active; otherwise return `null` so deleted variants do not remain reachable
  from Admin APIs;
- `inventoryItemByVariant(variantId)` must not lazily recreate or expose an
  `InventoryItem` when the projection row is missing or soft-deleted. It should
  return `null` for deleted/unknown variants, or fetch the Catalog snapshot first
  and only create/expose the item if Catalog confirms the variant is active;
- federation reference resolution for `InventoryItem` should follow the same
  active-projection rule to avoid returning orphan inventory entities.

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

This is a prerequisite for Inventory projection handlers and for Admin migration.
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

- Ukrainian Admin session filters/sorts by Ukrainian `productName`;
- English Admin session filters/sorts by English `productName`;
- changing the English name updates only the English translation row.

## Implementation Order

1. Add `catalog.getInventoryItemProjectionSnapshot` and make it return base
   product/variant projection plus all requested product translations.
2. Add Inventory projection tables/view/repository.
3. Add Inventory event handlers that always use the snapshot action when the
   event payload does not explicitly identify changed locales.
4. Switch Admin Inventory page to `inventoryQuery.inventoryItems`.

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
variant event. If current variant mutations do not emit events, add that before
switching Admin Inventory page to the new query.

Handler rules:

- base projection upsert is idempotent on `(projectId, variantId)`;
- translation upsert is idempotent on `(productId, locale)` and scoped by
  `projectId` for query safety;
- `catalogRevision` prevents applying older snapshots over newer rows when
  revision is present;
- `lastCatalogEventId` is stored for observability/debugging;
- snapshot fetch failure is retryable.

## Admin Migration

Replace Inventory page read query:

- from `catalogQuery.variants`;
- to `inventoryQuery.inventoryItems`.

The UI should still use generated API types directly. Row mapping can read:

- `node.id`;
- `node.variantId`;
- `node.sku`;
- `node.trackInventory`;
- `node.continueSellingWhenOutOfStock`;
- `node.variant.product.title` for display;
- `node.stock` for selected warehouse stock values.

New sort mapping can expose:

- `productName`;
- `sku`;
- `quantityOnHand`;
- `reservedQuantity`;
- `unavailableQuantity`;
- `availableForSale`;
- `updatedAt`.

Search/filter mapping:

```ts
where: {
  _or: [
    { productName: { _containsi: search } },
    { sku: { _containsi: search } },
  ],
}
```

The existing save path can remain unchanged for the first step. This plan is
about the read model/list query. A later step can move stock writes from
`catalogMutation.productBulkUpdate` to inventory-owned bulk mutation if write
ownership changes.

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
- Add `inventoryItemListView`.
- Export models from inventory repository models index.
- Generate Drizzle migration for tables, indexes and view.

### Phase 3. Repository and GraphQL schema

- Implement `inventoryItem.getConnection(...)` over `inventoryItemListView`.
- Extend `InventoryItemWhereInput` and `InventoryItemOrderByInput`.
- Keep `InventoryItemConnection` / `InventoryItemEdge` returning
  `InventoryItem`.
- Add `InventoryItem.variant` to the GraphQL schema. The resolver already exists,
  but the field must be present in schema before Admin can query it.
- Add a batched/scoped stock loading strategy so `node.stock` on the Admin list
  does not run one all-warehouses query per row.
- Update `InventoryQuery.inventoryItems` args to include Relay pagination,
  `warehouseId`, `where` and `orderBy`.

### Phase 4. Event sync

- Extend inventory event handlers for product create/update/delete and variant
  delete.
- Ensure locale-specific product name changes update only the matching
  translation row.
- Ensure variant create/delete flows emit events Inventory can consume.

### Phase 5. Admin read path

- Add inventory module GraphQL query document for `inventoryQuery.inventoryItems`.
- Update generated Admin GraphQL types.
- Update row mapper to consume `InventoryItem` nodes.
- Enable server-side sort/search/filter for product name and stock columns.
- Reset cursor pagination on sort/filter changes.

## Out of Scope

- Replacing stock write path.
- Full-text search infrastructure.
- Materialized view refresh strategy.
- Cross-service SQL joins into catalog schema.
- Making projection the source of truth for product names.
- Introducing a special list GraphQL node type.
- Running local test/tsc verification as part of this planning task.
