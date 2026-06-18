# Product Media Registry Plan

## Cutover Strategy

This implementation is a single-commit cutover:

- No backward compatibility with the current `variant_media.file_id` storage model is required.
- No existing data migration is required.
- Existing product and variant media rows may be dropped or left unsupported by the cutover migration.
- The implementation should optimize for the target schema and runtime behavior, not for mixed-version operation.

## Goal

Introduce a product-level media registry in Catalog:

- Product media is stored in `catalog.product_media`.
- Variant media links point to registered product media entries.
- A variant can only attach media that belongs to its own product.
- Removing a product media registry row cascades and removes that media from every variant of the product.
- Removing media from a variant only removes the variant link and does not remove the product media registration.

## Current State

Product media is currently represented indirectly through variant media:

- `catalog.variant_media` stores `variant_id -> file_id`.
- `file_id` is an external UUID from the Media service and has no database FK.
- Product-level media updates are implemented by writing media to the default variant.
- Variant-level media updates write directly to `variant_media`.
- Media service back references are synchronized after catalog media changes.

This makes product media and variant media the same physical relation, so the database cannot enforce "only files registered on this product can be attached to variants".

## Target Schema

### `catalog.product_media`

Create a new table:

```sql
catalog.product_media
```

Columns:

- `id uuid primary key`
- `project_id uuid not null`
- `product_id uuid not null`
- `file_id uuid not null`
- `sort_index integer not null default 0`
- `created_at timestamptz not null default now()`

Indexes and constraints:

- composite FK `(project_id, product_id) -> catalog.product(project_id, id) on delete cascade`
- `unique(project_id, product_id, file_id)`
- `unique(project_id, product_id, id)`
- `unique(project_id, id)`
- index on `project_id`
- index on `(project_id, product_id)`
- index on `(project_id, file_id)`
- index on `(project_id, product_id, sort_index)`

`file_id` remains an external Media service reference, so it should not get a cross-service FK.

### `catalog.variant_media`

Change variant media to link through `product_media`:

```sql
catalog.variant_media
```

Target columns:

- `project_id uuid not null`
- `product_id uuid not null`
- `variant_id uuid not null`
- `product_media_id uuid not null`
- `sort_index integer not null default 0`

Target constraints:

- primary key `(project_id, variant_id, product_media_id)`
- composite FK `(project_id, product_id, product_media_id) -> catalog.product_media(project_id, product_id, id) on delete cascade`
- composite FK `(project_id, product_id, variant_id) -> catalog.variant(project_id, product_id, id) on delete cascade`
- index on `project_id`
- index on `(project_id, product_id)`
- index on `(project_id, variant_id)`
- index on `(project_id, product_media_id)`
- index on `(project_id, variant_id, sort_index)`

The denormalized `product_id` is intentional. It lets PostgreSQL enforce that a variant can only reference `product_media` rows from the same product.

The denormalized `project_id` must be part of the composite FKs. It prevents rows from claiming one project while referencing a product, variant, or product media row that belongs to another project.

Add supporting unique constraints or unique indexes on existing tables:

- `catalog.product(project_id, id)` for the `product_media` product FK.
- `catalog.variant(project_id, product_id, id)` for the `variant_media` variant FK.

## Cutover Migration DDL Order

Because this is a single-commit cutover without data migration, the migration does not need temporary nullable columns, backfill steps, or compatibility views.

Recommended DDL order:

1. Drop the existing `catalog.variant_media` table or otherwise remove the old `variant_media.file_id` storage model.
2. Add the supporting unique constraints or unique indexes on `catalog.product(project_id, id)` and `catalog.variant(project_id, product_id, id)`.
3. Create `catalog.product_media` with its target columns, indexes, unique constraints, and composite FK to `catalog.product`.
4. Recreate `catalog.variant_media` with `project_id`, `product_id`, `variant_id`, `product_media_id`, and `sort_index`.
5. Add the target `variant_media` primary key, indexes, product media FK, and variant FK.
6. Do not backfill old `variant_media.file_id` rows. Existing media assignments are intentionally not preserved by this cutover.

## Cascade Behavior

Product media registry row removal:

1. Delete rows from `catalog.product_media`.
2. PostgreSQL cascades those rows out of `catalog.variant_media`.
3. Catalog syncs Media service back references for the product with the remaining registered product media file IDs.

Only product media rows for files that are actually removed from the product registry should be deleted. Product media rows for files that remain on the product must keep their existing `product_media.id` values so existing variant assignments keep pointing to the same registry entries.

Variant media removal:

1. Delete rows from `catalog.variant_media`.
2. Do not delete from `catalog.product_media`.
3. Do not sync Media service back references, because variant media links are only Catalog-level assignments.

Variant deletion:

1. Permanent `catalog.variant` deletion cascades to `catalog.variant_media`.
2. Soft variant deletion must explicitly remove or ignore that variant's `variant_media` rows, because PostgreSQL FK cascade only runs for physical row deletion.
3. `catalog.product_media` remains unchanged.

File hard deletion event:

1. Catalog deletes matching `catalog.product_media` rows by `file_id`.
2. Variant media rows are removed by FK cascade.

## Repository Changes

Update `services/catalog/src/repositories/models/media.ts`:

- Add `productMedia`.
- Replace `variantMedia.fileId` with `variantMedia.productMediaId`.
- Add the composite FK definitions described above.

Update `MediaRepository`:

- Add `getProductMedia(productId)`.
- Add `getProductMediaByProductIds(productIds)` for the `Product.media` DataLoader.
- Add `setProductMedia(productId, fileIds)`.
- Add `getProductMediaByFileIds(productId, fileIds)`.
- Update `getVariantMedia(variantId)` to join `variant_media -> product_media`.
- Add or update `getVariantMediaByVariantIds(variantIds)` to return joined `variant_media -> product_media` rows for the `Variant.media` DataLoader.
- Update `setVariantMedia(variantId, fileIds)` to:
  - load the variant and its `productId`;
  - resolve file IDs to product media IDs;
  - reject file IDs that are not registered on the variant product;
  - replace only `variant_media` rows for that variant.
- Update hard-delete cleanup to remove from `product_media` by `file_id`.

Repository read APIs used by GraphQL loaders must be batch-oriented. Resolvers should not call single-product or single-variant repository methods directly for `Product.media` or `Variant.media`.

Current code note: `VariantLoader.variantMedia` currently calls `repository.variant.getMediaByVariantIds(variantIds)`. The cutover should avoid two competing media batch-read implementations.

Use `MediaRepository` as the owner of product and variant media reads after this cutover:

1. Add `MediaRepository.getProductMediaByProductIds(productIds)`.
2. Add `MediaRepository.getVariantMediaByVariantIds(variantIds)` with the required `variant_media -> product_media` join.
3. Update `VariantLoader.variantMedia` to call `repository.media.getVariantMediaByVariantIds(variantIds)`.
4. Add `ProductLoader.productMedia` to call `repository.media.getProductMediaByProductIds(productIds)`.
5. Remove or stop using the old `VariantRepository.getMediaByVariantIds` path so joined media rows are not implemented twice.

If implementation chooses to keep variant media reads in `VariantRepository` instead, then this plan must be updated before coding. Do not add a new `MediaRepository.getVariantMediaByVariantIds` method while leaving `VariantLoader` wired to the old `VariantRepository.getMediaByVariantIds` method.

`setProductMedia(productId, fileIds)` must be a diff/merge operation, not a delete-all-and-reinsert replacement:

1. Dedupe requested file IDs while preserving input order.
2. Load existing `product_media` rows for the product.
3. Keep rows whose `file_id` is still requested, preserving their existing `id`.
4. Update `sort_index` for kept rows when order changes.
5. Insert rows only for newly requested file IDs.
6. Delete rows only for removed file IDs, allowing FK cascade to remove variant links only for media that truly left the product registry.

This preserves variant media assignments for files that remain registered on the product.

## Script Changes

### ProductCreateScript

1. Register `mediaFileIds` in `product_media` once per product.
2. Stop duplicating product media across all variants.
3. Return enough product media data for product-level back-reference sync.

### ProductUpdateMediaScript

Change the script from "write media to the default variant" to "update product media registry":

1. Mark the script execution as transactional.
2. Load current product media.
3. Compute removed and added file IDs.
4. Merge `product_media` rows for the product using the `setProductMedia` diff/merge behavior. Do not delete and recreate rows for file IDs that are still present.
5. Let FK cascade remove deleted media from all variant links.
6. Touch the product in the same transaction.
7. Sync Media service back references for the product only after the database mutation succeeds.

The database mutation and product touch must be committed before Media service synchronization is started. If the script method is decorated with `@Transactional()`, keep the external back-reference sync outside that transactional method or split the transactional database work into a separate method that returns the committed result.

### VariantUpdateMediaScript

Change the script to treat `fileIds` as product-registered media:

1. Load the variant and its product.
2. Validate every requested file ID exists in `product_media` for that product.
3. Replace `variant_media` rows using `product_media_id`.
4. Do not modify `product_media`.
5. Do not sync Media service back references.

Soft-deleted variants should not keep active media assignments. If variant deletion remains soft by default, update the deletion script to remove that variant's `variant_media` rows explicitly or make all reads filter out soft-deleted variants consistently.

## GraphQL and Resolver Changes

Keep existing mutation inputs initially:

- `ProductMediaInput.fileIds`
- `VariantUpdateMediaInput.fileIds`

Internally, variant updates resolve those file IDs through `product_media`.

Add product-level media reads to the GraphQL API:

```graphql
type ProductMediaItem {
  file: File!
  sortIndex: Int!
}

type Product {
  media: [ProductMediaItem!]!
}
```

`Product.media` must read from `catalog.product_media`, not from the default variant. This makes registered product media visible even when it is not attached to any variant.

Keep `Variant.media: [VariantMediaItem!]!` for media attached to a specific variant.

Consider adding `productMediaId` to `ProductMediaItem` and `VariantMediaItem` later if clients need to address product media registry entries directly.

Schema changes should be applied concretely in:

- `services/catalog/src/api/graphql-admin/schema/media.graphql`: add `ProductMediaItem`.
- `services/catalog/src/api/graphql-admin/schema/product.graphql`: add `Product.media: [ProductMediaItem!]!`.
- Regenerated resolver types and schemas after GraphQL schema changes.

Update `ProductResolver.media()`:

- Load rows from `product_media` ordered by `sort_index`.
- Return `File` federation references using `product_media.file_id`.
- Encode `File` IDs with the project GraphQL ID pattern: `encodeGlobalIdByType(fileId, GlobalIdEntity.File)`. This is required for the initial cutover and is not optional.

Update `VariantResolver.media()`:

- Load joined rows from `variant_media -> product_media`.
- Return `File` federation references using product media `file_id`.
- Encode `File` IDs with the project GraphQL ID pattern: `encodeGlobalIdByType(fileId, GlobalIdEntity.File)`. This is required for the initial cutover and fixes the current raw UUID response.

Update loaders:

- Add a `productMedia` loader keyed by `productId`, backed by `getProductMediaByProductIds(productIds)`.
- Update `variantMedia` loader to return joined product media data, backed by `getVariantMediaByVariantIds(variantIds)`.
- Keep `Product.media` and `Variant.media` resolver methods on loaders rather than direct repository calls.

## Media Back References

Back references must stay consistent at the product level. Media service usage is based on registered product media, not on variant media assignments.

Recommended behavior:

- Product media changes sync Media service back references for `entityType: "product"` using the product ID and the current `product_media.file_id` list.
- Product creation syncs product-level back references after product media is registered.
- Product media registry row removal syncs the product back references with the remaining registered file IDs.
- Variant media changes do not call the Media service. Removing media from a variant only updates `catalog.variant_media` and must not remove or change Media service back references.

Migrate away from the current variant-level back-reference naming in this implementation. The target entity reference should represent the Catalog product, for example `service: "catalog"`, `entityType: "product"`, `entityId: productId`.

Update all current variant-level back-reference call sites as part of this cutover. This is part of the implementation, not a follow-up:

- `ProductCreateSaga` should sync one product-level entity reference, not one entry per variant.
- `ProductUpdateMediaScript` should sync `catalog/product` after the product media registry transaction commits.
- `VariantUpdateMediaScript` should stop syncing Media service references.
- `VariantDeleteScript` should stop notifying Media about `inventory/variant` media references unless legacy cleanup is still required.

Because this cutover changes the external Media entity reference from `inventory/variant` to `catalog/product`, decide and document how stale legacy variant-level back references are handled. Either run a one-time reconciliation/cleanup against the Media service, or explicitly accept that old variant-level references may remain until a separate cleanup task removes them.

### Back-reference implementation checklist

Use this checklist during implementation so the old variant-level Media reference model is not left partially active.

1. Search Catalog for all Media back-reference calls:
   - `backRefNotify`
   - `media.syncEntityFiles`
   - `entityDeletedNotify`
   - `service: "inventory"`
   - `entityType: "variant"`
2. Replace product media creation sync:
   - Current shape: one Media reference per variant.
   - Target shape: one Media reference for the product.
   - Entity ref: `{ service: "catalog", entityType: "product", entityId: productId }`.
   - File list: current registered `product_media.file_id` values in registry order.
3. Replace product media update sync:
   - Sync only after the product media registry transaction commits.
   - Entity ref: `{ service: "catalog", entityType: "product", entityId: productId }`.
   - File list: current registered `product_media.file_id` values after the update.
   - Do not sync using the default variant ID.
4. Remove variant media update sync:
   - `VariantUpdateMediaScript` must not call `backRefNotify` or `media.syncEntityFiles`.
   - Variant media assignment changes are Catalog-only links and do not affect Media service usage.
5. Review variant deletion notification:
   - Permanent variant deletion may still need inventory cleanup, but it should not notify Media about `inventory/variant` media usage in the new model.
   - If legacy Media reference cleanup is needed, keep it explicitly named as legacy cleanup so it is not confused with the new product-level reference model.
6. Update logging messages:
   - Replace "variant media back-refs" logs for product media flows with "product media back-refs".
   - Log `productId` for product-level syncs.
   - Do not log variant IDs as the Media reference owner for product media.
7. Update script/result DTOs that only exist to return variant media back-reference maps:
   - Remove or replace `variantMediaMap` style outputs from product creation.
   - Return product-level media file IDs if the saga still needs data for post-commit sync.
8. Update workflow/saga step names where they encode the old model:
   - Replace names like `syncVariantBackRefs` with product-level names.
   - Keep workflow IDs and step IDs stable enough for DBOS idempotency, but do not leave misleading new code named after variant media ownership.
9. Add a manual verification step:
   - Product creation with media calls Media sync once for `catalog/product`.
   - Product media update calls Media sync once for `catalog/product` after commit.
   - Variant media update does not call Media sync.
   - Variant deletion does not create or refresh `inventory/variant` Media usage.

### Legacy Media references

This Catalog cutover does not automatically remove references that may already exist inside the Media service for `{ service: "inventory", entityType: "variant" }`.

Choose one explicit legacy strategy before merging the implementation:

- Cleanup now: run or add a reconciliation flow that removes legacy variant-level Media references for Catalog variant media.
- Cleanup later: document that old `inventory/variant` references may remain temporarily and create a follow-up cleanup task.
- No cleanup required: only valid if the environment has no existing variant-level Media references or the Media service can safely ignore them.

Do not leave the strategy implicit. The new runtime behavior must consistently write product-level references only.

## Codegen, Build, and Verification

After implementation:

1. Generate the Catalog migration through the project migration flow.
2. Regenerate GraphQL types if schema files change.
3. Run the Catalog build when a new compiled version is needed.
4. Do not run `test` or `tsc` as part of this task, per project instruction.

Manual verification scenarios:

- Product media can be registered without attaching it to any variant.
- `Product.media` returns registered product media even when no variant references it.
- `Product.media.file.id` and `Variant.media.file.id` return encoded `File` global IDs using the project GraphQL ID pattern, not raw UUIDs. This is an acceptance criterion for the cutover.
- Updating product media preserves `product_media.id` and existing variant media assignments for file IDs that remain registered on the product.
- Variant media update rejects a file that is not in the same product's `product_media`.
- Removing media from a variant does not remove the product media row and does not call the Media service.
- Removing media from the product media registry removes the matching variant links for all product variants through `product_media -> variant_media on delete cascade`.
- Removing media from the product media registry syncs product-level Media service back references with the remaining product media.
- Permanent variant deletion removes only that variant's media links through FK cascade.
- Soft variant deletion removes or excludes that variant's media links according to the chosen soft-delete behavior.
- File hard deletion removes product media and cascades variant media cleanup.
- `ProductUpdateMediaScript` performs the product media replacement, cascade-triggering deletes, and product touch in one transaction.
- `Product.media` and `Variant.media` are resolved through DataLoader-backed batch repository APIs.

## Risks

- Back-reference sync can become stale if product-level Media service references are not updated after product media changes.
- Legacy variant-level Media service back references can remain stale unless the cutover includes explicit cleanup or reconciliation.
- Deleting and reinserting unchanged `product_media` rows would cascade-delete valid variant media links. Preserve row IDs for retained file IDs.
- A GraphQL schema change requires generated resolver types to be updated before build.
