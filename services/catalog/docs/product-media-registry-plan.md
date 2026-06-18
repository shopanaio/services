# Product Media Registry Plan

## Goal

Introduce a product-level media registry in Catalog:

- Product media is stored in `catalog.product_media`.
- Variant media links point to registered product media entries.
- A variant can only attach media that belongs to its own product.
- Removing media from a product cascades and removes that media from every variant of the product.
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
- `product_id uuid not null references catalog.product(id) on delete cascade`
- `file_id uuid not null`
- `sort_index integer not null default 0`
- `created_at timestamptz not null default now()`

Indexes and constraints:

- `unique(product_id, file_id)`
- `unique(product_id, id)`
- index on `project_id`
- index on `product_id`
- index on `file_id`
- index on `(product_id, sort_index)`

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

- primary key `(variant_id, product_media_id)`
- FK `variant_id -> catalog.variant(id) on delete cascade`
- composite FK `(product_id, product_media_id) -> catalog.product_media(product_id, id) on delete cascade`
- composite FK `(variant_id, product_id) -> catalog.variant(id, product_id) on delete cascade`
- index on `project_id`
- index on `product_id`
- index on `variant_id`
- index on `product_media_id`
- index on `(variant_id, sort_index)`

The denormalized `product_id` is intentional. It lets PostgreSQL enforce that a variant can only reference `product_media` rows from the same product. To support the composite FK, add a unique constraint or unique index on `catalog.variant(id, product_id)`.

## Cascade Behavior

Product media removal:

1. Delete rows from `catalog.product_media`.
2. PostgreSQL cascades those rows out of `catalog.variant_media`.
3. Catalog syncs Media service back references for affected variants.

Variant media removal:

1. Delete rows from `catalog.variant_media`.
2. Do not delete from `catalog.product_media`.
3. Sync Media service back references only for the affected variant.

Product deletion:

1. `catalog.product` deletion cascades to `catalog.product_media`.
2. `catalog.product_media` deletion cascades to `catalog.variant_media`.

Variant deletion:

1. `catalog.variant` deletion cascades to `catalog.variant_media`.
2. `catalog.product_media` remains unchanged.

File hard deletion event:

1. Catalog deletes matching `catalog.product_media` rows by `file_id`.
2. Variant media rows are removed by FK cascade.

## Migration Plan

Use a two-step migration to avoid losing existing links.

### Step 1: Expand

1. Add `product_media`.
2. Add `product_id` and `product_media_id` to `variant_media` as nullable columns.
3. Add the required unique constraint on `variant(id, product_id)`.

### Step 2: Backfill

For every existing `variant_media` row:

1. Join `catalog.variant` to get `product_id`.
2. Insert one `product_media` row per distinct `(product_id, file_id)`.
3. Set `product_media.sort_index` from the default variant when available.
4. If no default variant has that file, use the lowest existing variant media `sort_index`.
5. Backfill `variant_media.product_id` and `variant_media.product_media_id`.

### Step 3: Contract

1. Make `variant_media.product_id` and `variant_media.product_media_id` not null.
2. Add the composite FKs.
3. Drop the old `variant_media.file_id` column after code no longer reads it.
4. Update Drizzle snapshots through the normal migration generation flow.

## Repository Changes

Update `services/catalog/src/repositories/models/media.ts`:

- Add `productMedia`.
- Replace `variantMedia.fileId` with `variantMedia.productMediaId`.
- Add the composite FK definitions described above.

Update `MediaRepository`:

- Add `getProductMedia(productId)`.
- Add `setProductMedia(productId, fileIds)`.
- Add `getProductMediaByFileIds(productId, fileIds)`.
- Update `getVariantMedia(variantId)` to join `variant_media -> product_media`.
- Update `setVariantMedia(variantId, fileIds)` to:
  - load the variant and its `productId`;
  - resolve file IDs to product media IDs;
  - reject file IDs that are not registered on the variant product;
  - replace only `variant_media` rows for that variant.
- Update hard-delete cleanup to remove from `product_media` by `file_id`.

## Script Changes

### ProductCreateScript

1. Register `mediaFileIds` in `product_media` once per product.
2. Stop duplicating product media across all variants.
3. If backward compatibility is required for products without options, attach registered product media to the default variant.
4. Return enough media mapping data for back-reference sync.

### ProductUpdateMediaScript

Change the script from "write media to the default variant" to "update product media registry":

1. Load current product media.
2. Compute removed and added file IDs.
3. Replace `product_media` rows for the product.
4. Let FK cascade remove deleted media from all variant links.
5. Sync back references for all variants whose effective media changed.
6. Touch the product.

### VariantUpdateMediaScript

Change the script to treat `fileIds` as product-registered media:

1. Load the variant and its product.
2. Validate every requested file ID exists in `product_media` for that product.
3. Replace `variant_media` rows using `product_media_id`.
4. Do not modify `product_media`.
5. Sync back references for the variant.

## GraphQL and Resolver Changes

Keep existing mutation inputs initially:

- `ProductMediaInput.fileIds`
- `VariantUpdateMediaInput.fileIds`

Internally, variant updates resolve those file IDs through `product_media`.

Add or update read models:

- Add `Product.media: [ProductMediaItem!]!` if clients need first-class product media reads.
- Keep `Variant.media: [VariantMediaItem!]!`.
- Consider adding `productMediaId` to media item types if clients need to address product media entries directly.

Update `VariantResolver.media()`:

- Load joined rows from `variant_media -> product_media`.
- Return `File` federation references using product media `file_id`.
- Encode `File` IDs consistently before returning federation references.

Update loaders:

- Add `productMedia` loader if `Product.media` is exposed.
- Update `variantMedia` loader to return joined product media data.

## Media Back References

Back references must stay consistent because database cascades do not notify the Media service.

Recommended behavior:

- Variant media links continue to sync variant back references after every variant media change.
- Product media changes must compute affected variant IDs before deleting product media rows, then sync those variants after the catalog write.
- If registered product media should count as file usage even when no variant uses it, add product-level back references with `entityType: "product"` and sync them from `ProductUpdateMediaScript`.

Keep the current variant back-reference entity naming in the first implementation pass unless a separate compatibility migration is planned.

## Codegen, Build, and Verification

After implementation:

1. Generate the Catalog migration through the project migration flow.
2. Regenerate GraphQL types if schema files change.
3. Run the Catalog build when a new compiled version is needed.
4. Do not run `test` or `tsc` as part of this task, per project instruction.

Manual verification scenarios:

- Product media can be registered without attaching it to any variant.
- Variant media update rejects a file that is not in the same product's `product_media`.
- Removing media from a variant does not remove the product media row.
- Removing media from a product removes the matching variant links for all product variants.
- Product deletion removes product media and variant media.
- Variant deletion removes only that variant's media links.
- File hard deletion removes product media and cascades variant media cleanup.

## Risks

- Existing clients may rely on product media being stored on the default variant.
- Existing product creation currently attaches the same media to every variant when options are present.
- Back-reference sync can become stale if affected variants are not captured before product media rows are deleted.
- A GraphQL schema change requires generated resolver types to be updated before build.
