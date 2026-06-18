# Product Media Registry Plan

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

## Cascade Behavior

Product media registry row removal:

1. Delete rows from `catalog.product_media`.
2. PostgreSQL cascades those rows out of `catalog.variant_media`.
3. Catalog syncs Media service back references for the product with the remaining registered product media file IDs.

Variant media removal:

1. Delete rows from `catalog.variant_media`.
2. Do not delete from `catalog.product_media`.
3. Do not sync Media service back references, because variant media links are only Catalog-level assignments.

Variant deletion:

1. `catalog.variant` deletion cascades to `catalog.variant_media`.
2. `catalog.product_media` remains unchanged.

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
3. Return enough product media data for product-level back-reference sync.

### ProductUpdateMediaScript

Change the script from "write media to the default variant" to "update product media registry":

1. Load current product media.
2. Compute removed and added file IDs.
3. Replace `product_media` rows for the product.
4. Let FK cascade remove deleted media from all variant links.
5. Sync Media service back references for the product only.
6. Touch the product.

### VariantUpdateMediaScript

Change the script to treat `fileIds` as product-registered media:

1. Load the variant and its product.
2. Validate every requested file ID exists in `product_media` for that product.
3. Replace `variant_media` rows using `product_media_id`.
4. Do not modify `product_media`.
5. Do not sync Media service back references.

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

Update `ProductResolver.media()`:

- Load rows from `product_media` ordered by `sort_index`.
- Return `File` federation references using `product_media.file_id`.
- Encode `File` IDs with the project GraphQL ID pattern: `encodeGlobalIdByType(fileId, GlobalIdEntity.File)`.

Update `VariantResolver.media()`:

- Load joined rows from `variant_media -> product_media`.
- Return `File` federation references using product media `file_id`.
- Encode `File` IDs with the project GraphQL ID pattern: `encodeGlobalIdByType(fileId, GlobalIdEntity.File)`.

Update loaders:

- Add a `productMedia` loader keyed by `productId`.
- Update `variantMedia` loader to return joined product media data.

## Media Back References

Back references must stay consistent at the product level. Media service usage is based on registered product media, not on variant media assignments.

Recommended behavior:

- Product media changes sync Media service back references for `entityType: "product"` using the product ID and the current `product_media.file_id` list.
- Product creation syncs product-level back references after product media is registered.
- Product media registry row removal syncs the product back references with the remaining registered file IDs.
- Variant media changes do not call the Media service. Removing media from a variant only updates `catalog.variant_media` and must not remove or change Media service back references.

Migrate away from the current variant-level back-reference naming in this implementation. The target entity reference should represent the Catalog product, for example `service: "catalog"`, `entityType: "product"`, `entityId: productId`.

## Codegen, Build, and Verification

After implementation:

1. Generate the Catalog migration through the project migration flow.
2. Regenerate GraphQL types if schema files change.
3. Run the Catalog build when a new compiled version is needed.
4. Do not run `test` or `tsc` as part of this task, per project instruction.

Manual verification scenarios:

- Product media can be registered without attaching it to any variant.
- `Product.media` returns registered product media even when no variant references it.
- `Product.media.file.id` and `Variant.media.file.id` return encoded `File` global IDs using the project GraphQL ID pattern, not raw UUIDs.
- Variant media update rejects a file that is not in the same product's `product_media`.
- Removing media from a variant does not remove the product media row and does not call the Media service.
- Removing media from the product media registry removes the matching variant links for all product variants through `product_media -> variant_media on delete cascade`.
- Removing media from the product media registry syncs product-level Media service back references with the remaining product media.
- Variant deletion removes only that variant's media links.
- File hard deletion removes product media and cascades variant media cleanup.

## Risks

- Back-reference sync can become stale if product-level Media service references are not updated after product media changes.
- A GraphQL schema change requires generated resolver types to be updated before build.
