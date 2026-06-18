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

Product deletion:

1. `ProductDeleteScript` owns product-level Media service cleanup for product deletion and must not rely on database cascade alone.
2. Permanent product deletion physically deletes `catalog.product`, which cascades to `catalog.product_media` and then to `catalog.variant_media`.
3. Permanent product deletion must notify the Media service after the database deletion commits by calling `entityDeletedNotify` or `media.entityDeleted` for `{ service: "catalog", entityType: "product", entityId: productId }`.
4. Do not rely on PostgreSQL cascade alone for Media service cleanup. The cascade removes Catalog rows only and does not remove Media back references.
5. Soft product deletion must clear product-level Media service back references after the soft-delete mutation commits by syncing the product entity with an empty file list. The `product_media` rows may remain for audit/history, but they must no longer count as active Media usage while the product is soft-deleted.
6. Product deletion must not send variant-level Media notifications. Variant media assignments are Catalog-only links in the target model.

File hard deletion event:

1. Catalog assumes `fileHardDeleted.payload.fileId` is globally unique because Media service file IDs are external UUID references. If file IDs are not globally unique, the event contract must be extended with tenant scope before this cutover is implemented.
2. Catalog deletes matching `catalog.product_media` rows by `file_id`. A `project_id` filter is not required only under the global file ID assumption above.
3. Variant media rows are removed by FK cascade.
4. Update `FileHardDeletedScript`, the file-hard-delete event handler, logs, and metrics to describe product media registry cleanup instead of `variant_media` cleanup.
5. Report the deleted `product_media` row count. Report cascaded `variant_media` cleanup separately only if the implementation can measure it accurately.

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
  - dedupe requested file IDs while preserving input order before validation or insert;
  - resolve file IDs to product media IDs;
  - reject file IDs that are not registered on the variant product;
  - replace only `variant_media` rows for that variant;
  - run the delete-and-insert replacement through the transaction-aware connection so callers can make the whole operation atomic.
- Update hard-delete cleanup to remove from `product_media` by `file_id`.
- Rename or reword hard-delete cleanup methods, logs, and metrics so they no longer describe the cleanup as `variant_media` cleanup.

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
2. Do not create `variant_media` rows from `ProductCreateInput.mediaFileIds`. Product create media registration is product-level only.
3. Do not attach product media automatically to the default variant, first variant, or every variant.
4. Stop duplicating product media across all variants.
5. Return enough product media data for product-level back-reference sync.

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

1. Mark the database mutation as transactional.
2. Dedupe requested file IDs while preserving input order before validation or insert.
3. Load the variant and its product.
4. Validate every deduped requested file ID exists in `product_media` for that product.
5. Resolve deduped file IDs to `product_media.id` values in requested order.
6. Replace `variant_media` rows using `product_media_id`.
7. The variant load, product media lookup, old `variant_media` delete, and new `variant_media` insert must run in one transaction. If validation or insert fails, existing variant media assignments must remain unchanged.
8. Do not modify `product_media`.
9. Do not sync Media service back references.

Soft-deleted variants should not keep active media assignments. If variant deletion remains soft by default, update the deletion script to remove that variant's `variant_media` rows explicitly or make all reads filter out soft-deleted variants consistently.

## GraphQL and Resolver Changes

Keep existing mutation inputs initially:

- `ProductMediaInput.fileIds`
- `VariantUpdateMediaInput.fileIds`

Internally, variant updates resolve those file IDs through `product_media`.

Decode all GraphQL global IDs before passing data to scripts, workflows, or repositories. Internal Catalog code must receive raw UUIDs only:

- `CatalogMutation.productUpdate(productId: ID!, operations: ProductUpdateInput)` must decode `productId` with `decodeGlobalIdByType(productId, GlobalIdEntity.Product)` before building `ProductUpdateWorkflowInput.productId` and before assigning `ProductUpdateParams.id`.
- Every `VariantUpdateInput.variantId` inside `ProductUpdateInput.variants` must be decoded with `decodeGlobalIdByType(variantId, GlobalIdEntity.Variant)` before building `VariantUpdateParams.variantId`.
- `VariantUpdateMediaInput.variantId` must be decoded with `decodeGlobalIdByType(variantId, GlobalIdEntity.Variant)` before calling `VariantUpdateMediaScript`.
- The bulk update helper that maps product update operations must decode the same IDs: product IDs as `GlobalIdEntity.Product`, variant IDs as `GlobalIdEntity.Variant`, and file IDs as `GlobalIdEntity.File`.
- Do not decode only `fileIds`. Media mutations use both entity IDs and file IDs, and all of them cross the GraphQL boundary as global IDs.

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
- Product deletion removes product-level Media service back references after the delete mutation commits: permanent deletion should notify entity deletion, and soft deletion should sync an empty file list.
- Variant media changes do not call the Media service. Removing media from a variant only updates `catalog.variant_media` and must not remove or change Media service back references.

Migrate away from the current variant-level back-reference naming in this implementation. The target entity reference should represent the Catalog product, for example `service: "catalog"`, `entityType: "product"`, `entityId: productId`.

Update all current variant-level back-reference call sites as part of this cutover. This is part of the implementation, not a follow-up:

- `ProductCreateSaga` should sync one product-level entity reference, not one entry per variant.
- `ProductUpdateMediaScript` should sync `catalog/product` after the product media registry transaction commits.
- `ProductDeleteScript` should remove product-level Media references after the product delete transaction commits.
- `VariantUpdateMediaScript` should stop syncing Media service references.
- `VariantDeleteScript` should stop notifying Media about `inventory/variant` media references.

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
4. Add product deletion cleanup:
   - `ProductDeleteScript` must own product-level Media cleanup for both soft and permanent product deletion.
   - If the implementation needs the previous product media file list for logging, reconciliation, or conditional no-op behavior, it must collect that list before permanent deletion because FK cascade removes the registry rows.
   - Permanent deletion must delete the product in the database first, let FK cascade remove `product_media` and `variant_media`, then call `entityDeletedNotify` or `media.entityDeleted` for `{ service: "catalog", entityType: "product", entityId: productId }`.
   - Soft deletion must update the product first, then call `media.syncEntityFiles` or `backRefNotify` for the same product entity with an empty file list.
   - Product deletion cleanup must run only after the database mutation succeeds, and it must not notify Media about `inventory/variant`.
5. Remove variant media update sync:
   - `VariantUpdateMediaScript` must not call `backRefNotify` or `media.syncEntityFiles`.
   - Variant media assignment changes are Catalog-only links and do not affect Media service usage.
6. Review variant deletion notification:
   - Permanent variant deletion may still need inventory cleanup, but it should not notify Media about `inventory/variant` media usage in the new model.
7. Update logging messages:
   - Replace "variant media back-refs" logs for product media flows with "product media back-refs".
   - Log `productId` for product-level syncs.
   - Do not log variant IDs as the Media reference owner for product media.
8. Update script/result DTOs that only exist to return variant media back-reference maps:
   - Remove or replace `variantMediaMap` style outputs from product creation.
   - Return product-level media file IDs if the saga still needs data for post-commit sync.
9. Update workflow/saga step names where they encode the old model:
   - Replace names like `syncVariantBackRefs` with product-level names.
   - Keep workflow IDs and step IDs stable enough for DBOS idempotency, but do not leave misleading new code named after variant media ownership.
10. Add a manual verification step:
   - Product creation with media calls Media sync once for `catalog/product`.
   - Product media update calls Media sync once for `catalog/product` after commit.
   - Permanent product deletion calls Media entity deletion once for `catalog/product` after commit.
   - Soft product deletion syncs an empty file list once for `catalog/product` after commit.
   - Variant media update does not call Media sync.
   - Variant deletion does not create or refresh `inventory/variant` Media usage.

## Codegen, Build, and Verification

After implementation:

1. Generate the Catalog migration through the project migration flow.
2. Regenerate GraphQL types if schema files change.
3. Run the Catalog build when a new compiled version is needed.
4. Do not run `test` or `tsc` as part of this task, per project instruction.

API verification scenarios:

New API calls:

1. `Product.media` read:
   - Create a product with `mediaFileIds`.
   - Query `catalogQuery.product(id) { media { file { id } sortIndex } }`.
   - Assert `Product.media` returns the registered product media even when no variant references it.
   - Assert `Product.media.file.id` is an encoded global `File` ID, not a raw UUID.
2. Product media without variant media:
   - Create a product with `mediaFileIds`.
   - Query the product, its variants, `Product.media`, and each `Variant.media`.
   - Assert `Product.media` contains the registered files.
   - Assert no default, first, or generated variant receives automatic `variant_media` rows from product creation.

Updated existing API calls:

1. `productCreate(input.mediaFileIds)`:
   - Keep the existing input shape.
   - Assert product creation writes `product_media` rows only.
   - Assert product creation does not duplicate media into `variant_media`.
   - Assert product creation syncs one product-level Media reference after commit when back-reference calls are observable.
2. `variantUpdateMedia(input)`:
   - Pass encoded global `Variant` and `File` IDs.
   - Assert the resolver decodes `variantId` and `fileIds` before script execution.
   - Assert duplicate file IDs are deduped while preserving first occurrence order.
   - Assert files not registered on the same product are rejected.
   - Assert validation or insert failure leaves previous variant media assignments unchanged.
   - Assert successful updates do not call Media service back-reference sync.
3. `Variant.media` read:
   - Create registered product media and attach a subset to a variant.
   - Query `Variant.media`.
   - Assert it reads through `variant_media -> product_media`.
   - Assert `Variant.media.file.id` is an encoded global `File` ID, not a raw UUID.
4. `productUpdate(productId, operations.media)`:
   - Pass an encoded global `Product` ID and encoded global `File` IDs.
   - Assert the resolver decodes IDs before building workflow input.
   - Assert product media registry order follows `operations.media.fileIds`.
   - Assert retained file IDs preserve existing `product_media.id` values and existing variant assignments.
   - Assert removed product media cascades only the matching variant media links.
   - Assert product-level Media back references are synced after commit when observable.
5. `productUpdate(productId, operations.variants[].media)`:
   - Pass encoded global `Product`, `Variant`, and `File` IDs.
   - Assert variant media updates use only product-registered media.
   - Assert unregistered files are rejected atomically.
   - Assert successful variant media updates do not modify `product_media` and do not sync Media service back references.
6. Bulk product update media mapping:
   - Pass encoded product IDs, variant IDs, and file IDs through the bulk product update path.
   - Assert the bulk helper decodes IDs before building workflow operations.
   - Assert product-level and variant-level media operations behave the same as the single-product `productUpdate` path.
7. `productDelete(input)`:
   - Permanent delete: assert product and media rows are deleted by cascade and product-level Media back references are removed after commit when observable.
   - Soft delete: assert active product-level Media back references are cleared by syncing an empty file list after commit when observable.
   - Assert product deletion does not create or refresh `inventory/variant` Media references.

Non-GraphQL integration scenarios:

1. `fileHardDeleted` event handling:
   - Emit or simulate `fileHardDeleted` with `payload.fileId`.
   - Assert Catalog removes matching `product_media` rows.
   - Assert `variant_media` rows linked through those product media rows are removed by FK cascade.
   - Assert logs and metrics describe product media registry cleanup, not `variant_media` cleanup.
   - Assert the test environment either relies on globally unique Media file IDs or extends the event with tenant scope before validating tenant-specific cleanup.

Manual verification scenarios:

- Product media can be registered without attaching it to any variant.
- `Product.media` returns registered product media even when no variant references it.
- Product creation with `mediaFileIds` creates `product_media` rows only and does not create `variant_media` rows for the default variant, first variant, or all variants.
- `Product.media.file.id` and `Variant.media.file.id` return encoded `File` global IDs using the project GraphQL ID pattern, not raw UUIDs. This is an acceptance criterion for the cutover.
- `CatalogMutation.productUpdate` accepts encoded global `Product` and `Variant` IDs for product-level and variant-level media updates and passes raw UUIDs to the workflow.
- `CatalogMutation.variantUpdateMedia` accepts an encoded global `Variant` ID and passes a raw UUID to `VariantUpdateMediaScript`.
- Bulk product update media mapping decodes product IDs, variant IDs, and file IDs before building workflow operations.
- Updating product media preserves `product_media.id` and existing variant media assignments for file IDs that remain registered on the product.
- Variant media update dedupes duplicate file IDs while preserving first occurrence order.
- Variant media update is atomic: if validation or insert fails, the variant keeps its previous media assignments.
- Variant media update rejects a file that is not in the same product's `product_media`.
- Removing media from a variant does not remove the product media row and does not call the Media service.
- Removing media from the product media registry removes the matching variant links for all product variants through `product_media -> variant_media on delete cascade`.
- Removing media from the product media registry syncs product-level Media service back references with the remaining product media.
- Permanent product deletion cascades product and variant media rows and removes the `catalog/product` Media service back reference after commit.
- Soft product deletion keeps or removes Catalog rows according to the delete implementation, but it clears active `catalog/product` Media service back references after commit.
- Permanent variant deletion removes only that variant's media links through FK cascade.
- Soft variant deletion removes or excludes that variant's media links according to the chosen soft-delete behavior.
- File hard deletion removes product media and cascades variant media cleanup.
- File hard deletion cleanup logs and metrics describe product media registry cleanup, not `variant_media` cleanup.
- `ProductUpdateMediaScript` performs the product media replacement, cascade-triggering deletes, and product touch in one transaction.
- `Product.media` and `Variant.media` are resolved through DataLoader-backed batch repository APIs.

## Risks

- Back-reference sync can become stale if product-level Media service references are not updated after product media changes.
- Product deletion can leave stale Media usage if `ProductDeleteScript` relies only on PostgreSQL cascade and does not notify or resync the product-level Media reference after commit.
- Media updates can silently miss products or variants if GraphQL global `Product` or `Variant` IDs are passed into repository or workflow code without decoding them to raw UUIDs.
- Variant media replacement can clear valid assignments if delete and insert are not atomic or if duplicate requested file IDs are inserted without dedupe.
- File hard-delete cleanup can remove media from the wrong tenant if Media file IDs are not globally unique and the event contract remains `fileId`-only.
- Deleting and reinserting unchanged `product_media` rows would cascade-delete valid variant media links. Preserve row IDs for retained file IDs.
- A GraphQL schema change requires generated resolver types to be updated before build.

## Strict Implementation Plan

Follow these phases in order. Do not start the next phase until the current phase exit criteria are satisfied. Do not add backward-compatibility branches, compatibility views, or old `variant_media.file_id` support.

### Phase 0: Preflight

1. Re-read root `AGENTS.md`, `knowledge/AGENTS.md`, and the relevant knowledge base documents for repository, resolver, DataLoader, script, GraphQL ID, Drizzle, and codegen patterns.
2. Inspect current Catalog media code paths:
   - `services/catalog/src/repositories/models/media.ts`
   - `services/catalog/src/repositories/media/MediaRepository.ts`
   - `services/catalog/src/repositories/variant/VariantRepository.ts`
   - `services/catalog/src/loaders/ProductLoader.ts`
   - `services/catalog/src/loaders/VariantLoader.ts`
   - `services/catalog/src/loaders/Loader.ts`
   - `services/catalog/src/resolvers/admin/ProductResolver.ts`
   - `services/catalog/src/resolvers/admin/VariantResolver.ts`
   - `services/catalog/src/resolvers/admin/MutationResolver.ts`
   - product and variant media scripts, workflows, sagas, and file-hard-delete handlers.
3. Confirm the cutover assumptions:
   - no old `variant_media.file_id` data must be preserved;
   - Media file IDs are globally unique, or the `fileHardDeleted` event contract must be changed before implementation;
   - product create media registration does not create variant media links.
4. Do not edit changeset files manually.

Exit criteria:

- Every old media read/write/back-reference call site is known.
- The implementation keeps the target product-level media ownership model.

### Phase 1: Database Model And Migration

1. Update Drizzle models:
   - add `productMedia`;
   - change `variantMedia` to `projectId`, `productId`, `variantId`, `productMediaId`, and `sortIndex`;
   - remove old `variantMedia.fileId`;
   - add supporting unique constraints on `product(project_id, id)` and `variant(project_id, product_id, id)`;
   - define composite FKs with `project_id` and `product_id` so PostgreSQL enforces same-product variant media usage.
2. Generate the Catalog migration through the project migration flow.
3. Inspect the generated migration manually:
   - old `variant_media` storage is dropped or recreated;
   - `product_media` is created before the new `variant_media` FK that references it;
   - no old rows are backfilled;
   - no cross-service FK to Media files exists;
   - DDL order matches this plan.

Exit criteria:

- Drizzle models and SQL migration express the target schema exactly.
- The migration contains no compatibility path for `variant_media.file_id`.

### Phase 2: Repository Layer

1. Make `MediaRepository` the owner of product and variant media reads and writes.
2. Add product media methods:
   - `getProductMedia(productId)`;
   - `getProductMediaByProductIds(productIds)`;
   - `getProductMediaByFileIds(productId, fileIds)`;
   - `setProductMedia(productId, fileIds)`.
3. Implement `setProductMedia(productId, fileIds)` as diff/merge:
   - dedupe file IDs while preserving input order;
   - preserve existing `product_media.id` values for retained files;
   - update `sort_index` for retained files whose order changes;
   - insert only new files;
   - delete only removed files.
4. Add joined variant media reads:
   - `getVariantMedia(variantId)` joins `variant_media -> product_media`;
   - `getVariantMediaByVariantIds(variantIds)` returns joined rows for loaders.
5. Implement `setVariantMedia(variantId, fileIds)`:
   - load variant and product;
   - dedupe file IDs while preserving input order;
   - resolve to product media rows for that product;
   - reject missing or cross-product files;
   - replace only that variant's `variant_media` rows using `product_media_id`;
   - use the transaction-aware repository connection so script-level transactions make delete/insert atomic.
6. Stop using or remove `VariantRepository.getMediaByVariantIds` for media reads.
7. Update hard-delete cleanup methods to delete `product_media` by globally unique `file_id`, and rename logs/metrics away from `variant_media` cleanup.

Exit criteria:

- There is one batch media read path for loaders, owned by `MediaRepository`.
- Product media updates preserve IDs for retained files.
- Variant media replacement is dedupe-aware and can be run atomically by callers.

### Phase 3: GraphQL Schema, Codegen, Loaders, And Resolvers

1. Update GraphQL schema:
   - add `ProductMediaItem` in `services/catalog/src/api/graphql-admin/schema/media.graphql`;
   - add `Product.media: [ProductMediaItem!]!` in `services/catalog/src/api/graphql-admin/schema/product.graphql`;
   - keep existing mutation input shapes.
2. Regenerate resolver types and validation schemas through the project codegen flow.
3. Update loaders:
   - add `productMedia` loader backed by `MediaRepository.getProductMediaByProductIds`;
   - update `variantMedia` loader to use `MediaRepository.getVariantMediaByVariantIds`.
4. Update resolvers:
   - `ProductResolver.media()` returns registered product media in `sort_index` order;
   - `VariantResolver.media()` returns joined variant media in `sort_index` order;
   - both fields return `File` federation references with `encodeGlobalIdByType(fileId, GlobalIdEntity.File)`.
5. Update GraphQL input decoding:
   - decode `CatalogMutation.productUpdate.productId` as `GlobalIdEntity.Product`;
   - decode every `VariantUpdateInput.variantId` as `GlobalIdEntity.Variant`;
   - decode `VariantUpdateMediaInput.variantId` as `GlobalIdEntity.Variant`;
   - decode every file ID as `GlobalIdEntity.File`;
   - update the bulk product update helper with the same decoding rules.

Exit criteria:

- `Product.media` exists and reads from `product_media`.
- `Variant.media` still exists but reads through `variant_media -> product_media`.
- No resolver returns raw UUIDs for `File.id`.
- Scripts and workflows receive raw UUIDs only.

### Phase 4: Product And Variant Scripts

1. Update `ProductCreateScript`:
   - register `mediaFileIds` in `product_media`;
   - do not create `variant_media` rows from product media input;
   - return product-level media data needed for post-commit back-reference sync.
2. Update `ProductCreateSaga`:
   - sync one Media reference for `{ service: "catalog", entityType: "product", entityId: productId }`;
   - remove `variantMediaMap`-style flow or replace it with product-level data.
3. Update `ProductUpdateMediaScript`:
   - split transactional database mutation from external Media sync if needed;
   - update product media through the repository diff/merge operation;
   - touch the product in the same database transaction;
   - sync product-level Media back references only after commit.
4. Update `VariantUpdateMediaScript`:
   - mark the database mutation transactional;
   - dedupe file IDs while preserving input order;
   - validate file IDs against the variant product's product media registry;
   - replace `variant_media` atomically;
   - do not call Media back-reference sync.
5. Update product update workflow paths:
   - product-level media operation calls `ProductUpdateMediaScript`;
   - variant-level media operation calls `VariantUpdateMediaScript`;
   - workflow change snapshots reflect the new semantics.
6. Update bulk product update mapping to use decoded IDs and the same product/variant media operation semantics.

Exit criteria:

- Product create does not attach media to variants.
- Product media update preserves variant assignments for retained files.
- Variant media update is atomic and does not modify product media.
- No variant media mutation writes Media service back references.

### Phase 5: Deletion, File Events, And Back References

1. Update `ProductDeleteScript`:
   - permanent deletion removes product-level Media back references after database commit;
   - soft deletion syncs an empty product-level file list after database commit;
   - no variant-level Media notification is sent.
2. Update `VariantDeleteScript`:
   - remove Media usage notifications for `{ service: "inventory", entityType: "variant" }`;
   - keep any non-Media inventory cleanup separate and explicitly named.
3. Update file-hard-delete handling:
   - delete `product_media` rows by globally unique `file_id`;
   - rely on FK cascade for matching `variant_media`;
   - update handler logs and metrics to product media registry cleanup.
4. Search for and eliminate old runtime Media reference ownership:
   - `backRefNotify`;
   - `media.syncEntityFiles`;
   - `entityDeletedNotify`;
   - `service: "inventory"`;
   - `entityType: "variant"`.

Exit criteria:

- Media service references are product-level only for product media.
- Product deletion and product media deletion cannot leave active product-level Media usage stale.
- File-hard-delete cleanup no longer reports itself as `variant_media` cleanup.

### Phase 6: API Query Documents And Verification Assets

1. Add or update GraphQL operation documents needed by API verification:
   - product create with media;
   - product query with `Product.media`;
   - variant query with `Variant.media`;
   - `variantUpdateMedia`;
   - `productUpdate` product media operation;
   - `productUpdate` variant media operation;
   - bulk product update media operation if the existing test harness covers it;
   - product delete.
2. Regenerate query filename maps and generated e2e types only through the project e2e/query generation flow if those artifacts are needed.
3. Keep the API verification scenarios in this document mapped to concrete operation names before running any checks.

Exit criteria:

- Every new or changed API behavior has a corresponding operation document or an explicit manual verification path.
- Generated operation artifacts, if required, are produced by the project generation flow.

### Phase 7: Build And Manual Verification

1. Run the required project generation steps:
   - Catalog migration generation after model changes;
   - Catalog GraphQL codegen after schema changes;
   - schema composition/build if required by the changed GraphQL schema.
2. Run the Catalog build when a new compiled version is needed.
3. Do not run `test` or `tsc` for this task under the current project instruction.
4. Execute manual/API verification scenarios from this plan against the running development stack only when the environment is available and the user wants verification.
5. If a scenario requires observing Media service back-reference calls and the environment cannot expose them, record it as an integration-observability gap instead of marking it verified.

Exit criteria:

- Build completes when run.
- Manual/API verification results are recorded for each scenario that can be observed.
- Any unobservable Media back-reference scenario is explicitly called out.

### Phase 8: Final Consistency Pass

1. Search the Catalog codebase for old media model terms:
   - `variantMedia.fileId`;
   - `variant_media.file_id`;
   - `variantMediaMap`;
   - `syncVariantBackRefs`;
   - `inventory/variant` Media usage;
   - raw `File` UUID responses in media resolvers.
2. Confirm all changed code follows repository, script, DataLoader, resolver, and global ID patterns from the knowledge base.
3. Confirm no changeset file was edited manually.
4. Confirm generated files changed only where required by migration, schema, codegen, or query generation.
5. Summarize remaining risks or blocked verification items before handoff.

Exit criteria:

- No old runtime media ownership path remains active.
- The implementation matches the target schema, API, script, and back-reference behavior described in this plan.
