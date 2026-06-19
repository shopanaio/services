# RichText Excerpt Implementation Plan

## Goal

Implement `excerpt` in the Catalog service with the same storage, API, resolver, and admin frontend behavior as `description`.

The shared GraphQL value type must be named `RichText`, with the matching input type named `RichTextInput`.

## Current State

- `Product.description` is stored in multiple formats in `catalog.product_translation`:
  - `description_text`
  - `description_html`
  - `description_json`
- `Product.excerpt` is stored as a single text column:
  - `excerpt`
- `Category` and `Collection` translations store `description_*` columns, but do not store excerpt columns.
- `ProductResolver.excerpt`, `CategoryResolver.excerpt`, and `CollectionResolver.excerpt` return hardcoded empty rich-text objects.
- GraphQL schema currently uses `Description` and `DescriptionInput` for rich text. These names should become `RichText` and `RichTextInput`.
- Product create/update paths already accept excerpt-like input, but product persistence only saves `excerpt.text`.
- Category and collection GraphQL schemas expose `excerpt`, but DTOs and scripts do not currently carry it through to storage.

## Scope

This plan covers Catalog admin API rich text fields for:

- Product `description` and `excerpt`
- Category `description` and `excerpt`
- Collection `description` and `excerpt`

Storefront schema should be checked during implementation. If it does not expose these fields today, no storefront API change is required.

## Phase 1: GraphQL Contract Rename

Update Catalog admin GraphQL schema files:

- `services/catalog/src/api/graphql-admin/schema/product.graphql`
- `services/catalog/src/api/graphql-admin/schema/category.graphql`
- `services/catalog/src/api/graphql-admin/schema/collection.graphql`

Required changes:

- Rename `type Description` to `type RichText`.
- Rename `input DescriptionInput` to `input RichTextInput`.
- Change all rich-text output fields:
  - `description: RichText`
  - `excerpt: RichText`
- Change all rich-text input fields:
  - `description: RichTextInput`
  - `excerpt: RichTextInput`
- Keep the field shape unchanged:
  - `text: String!`
  - `html: String!`
  - `json: JSON!`

## Phase 2: Database Schema and Migration

Update Drizzle models:

- `services/catalog/src/repositories/models/translations.ts`
- `services/catalog/src/repositories/models/categories.ts`
- `services/catalog/src/repositories/models/collection.ts`

Product translation target:

```text
description_text text
description_html text
description_json jsonb
excerpt_text text
excerpt_html text
excerpt_json jsonb
```

Category translation target:

```text
description_text text
description_html text
description_json text or jsonb
excerpt_text text
excerpt_html text
excerpt_json text or jsonb
```

Collection translation target:

```text
description_text text
description_html text
description_json text or jsonb
excerpt_text text
excerpt_html text
excerpt_json text or jsonb
```

Migration requirements:

- For `product_translation`, replace the old `excerpt` text column with nullable `excerpt_text`, `excerpt_html`, and `excerpt_json` columns.
- For `category_translation`, add nullable `excerpt_text`, `excerpt_html`, `excerpt_json`.
- For `collection_translation`, add nullable `excerpt_text`, `excerpt_html`, `excerpt_json`.
- Do not manually edit changeset files.
- Generate the migration through the project tooling:
  - `shopana_db_generate` with `service: "catalog"`.

Open implementation decision:

- `description_json` is `jsonb` for products, but `text` for categories and collections. Decide whether to:
  - keep category/collection `excerpt_json` aligned with their current `description_json` as `text`, or
  - normalize category/collection `description_json` and `excerpt_json` to `jsonb` in the same migration.

The lower-risk implementation is to keep category/collection JSON column types aligned with their existing `description_json` columns.

## Phase 3: Shared Rich Text Types and Helpers

Create or rename shared internal DTOs:

- `DescriptionInput` -> `RichTextInput`
- `Description` -> `RichText`

Candidate files:

- `services/catalog/src/scripts/product/dto/shared.ts`
- `services/catalog/src/resolvers/admin/interfaces/index.ts`
- category and collection DTO files

Add small helpers to avoid repeating fallback logic:

```ts
type RichTextLike = {
  text?: string | null;
  html?: string | null;
  json?: unknown | null;
};

function toRichText(value: RichTextLike | null | undefined): RichText | null;
function serializeRichTextJson(value: Record<string, unknown> | undefined): unknown;
```

Resolver fallback behavior should match existing `description` behavior:

- no translation row: return `null`;
- translation row exists: return `{ text: value ?? "", html: value ?? "", json: value ?? {} }`.

## Phase 4: Repository Updates

Update product translation persistence:

- `services/catalog/src/repositories/translation/TranslationRepository.ts`

Required changes:

- `upsertProductTranslation` must set:
  - `excerptText`
  - `excerptHtml`
  - `excerptJson`
- `upsertProductTranslationsBatch` must include the same fields.
- Existing reads through product loaders should include the new inferred model fields automatically after Drizzle model updates.

Update category translation persistence:

- `services/catalog/src/repositories/category/CategoryRepository.ts`

Required changes:

- `upsertTranslation` input accepts:
  - `excerptText`
  - `excerptHtml`
  - `excerptJson`
- insert and conflict update include all excerpt fields.

Update collection translation persistence:

- `services/catalog/src/repositories/collection/CollectionRepository.ts`

Required changes:

- `upsertTranslation` input accepts:
  - `excerptText`
  - `excerptHtml`
  - `excerptJson`
- insert and conflict update include all excerpt fields.

## Phase 5: Script and Workflow Updates

Product create:

- `services/catalog/src/scripts/product/ProductCreateScript.ts`
- Save `excerpt.text`, `excerpt.html`, and `excerpt.json`.
- Stop saving only `excerpt?.text`.

Product content update:

- `services/catalog/src/scripts/product/ProductUpdateContentScript.ts`
- Compare `excerpt.text`, `excerpt.html`, and `excerpt.json`, or compare a stable serialized rich-text object.
- Persist all excerpt fields when excerpt changes.
- Preserve existing excerpt fields when only description changes.
- Clear all excerpt fields when the input explicitly clears excerpt, if clearing is supported by the API contract.

Product identity update:

- `services/catalog/src/scripts/product/ProductUpdateScript.ts`
- Preserve existing `excerptText`, `excerptHtml`, and `excerptJson` when updating title or handle.

Product update workflow:

- `services/catalog/src/workflows/dto/ProductUpdateWorkflowDto.ts`
- `services/catalog/src/scripts/types/ProductChanges.ts`
- Replace content change payloads that only carry strings with a rich-text-aware shape, or explicitly document that event changes expose only the plain text projection.

Category create/update:

- `services/catalog/src/scripts/category/dto/index.ts`
- `services/catalog/src/scripts/category/CategoryCreateScript.ts`
- `services/catalog/src/scripts/category/CategoryUpdateScript.ts`
- Add `excerpt?: RichTextInput`.
- Save, preserve, and clear excerpt fields with the same semantics as description.

Collection create/update:

- `services/catalog/src/scripts/collection/dto/index.ts`
- `services/catalog/src/scripts/collection/CollectionCreateScript.ts`
- `services/catalog/src/scripts/collection/CollectionUpdateScript.ts`
- Add `excerpt?: RichTextInput`.
- Save, preserve, and clear excerpt fields with the same semantics as description.

## Phase 6: Resolver Updates

Update admin resolvers:

- `services/catalog/src/resolvers/admin/ProductResolver.ts`
- `services/catalog/src/resolvers/admin/CategoryResolver.ts`
- `services/catalog/src/resolvers/admin/CollectionResolver.ts`

Required changes:

- Import/use `RichText` instead of `Description`.
- Resolve `description` through the shared rich-text helper.
- Resolve `excerpt` from translation storage:
  - product: `excerptText`, `excerptHtml`, `excerptJson`
  - category: `excerptText`, `excerptHtml`, `excerptJson`
  - collection: `excerptText`, `excerptHtml`, `excerptJson`
- Remove hardcoded empty excerpt TODO implementations.

## Phase 7: GraphQL Codegen and Federation Schema

Regenerate backend Catalog GraphQL outputs:

- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`

Use project tooling:

- `shopana_codegen` with `service: "catalog"`

Then rebuild the composed schema:

- `shopana_schema` with `action: "build"`

Expected schema result:

- `RichText` exists.
- `RichTextInput` exists.
- `Description` and `DescriptionInput` no longer represent product/category/collection rich text.
- Product/category/collection `excerpt` fields are `RichText`, not `String`.

## Phase 8: Admin Frontend Contract Update

Update Admin GraphQL operations and generated types:

- `admin/src/domains/inventory/graphql/fragments.ts`
- any product/category/collection operation files that reference `DescriptionFields`
- `admin/src/graphql/types.ts` after admin codegen
- `admin/schema.graphql` after schema rebuild/admin codegen

Required changes:

- Rename `DescriptionFields` fragment to `RichTextFields`.
- Change fragment type condition from `on Description` to `on RichText`.
- Replace generated API type references:
  - `ApiDescription` -> `ApiRichText`
  - `ApiDescriptionInput` -> `ApiRichTextInput`
- Keep existing editor mapping behavior:
  - editor JSON -> `{ text, html, json }`
  - API rich text -> editor JSON through `richText.json`

Use project tooling:

- `shopana_admin` with `action: "codegen"`.
- Run admin build only if a new frontend build artifact/version is needed.

## Phase 9: E2E Coverage Updates

Update E2E GraphQL query documents so they request and send `excerpt` as `RichText`, not as `String`.

Product query documents:

- `e2e/queries/inventory-api/ProductCreate.gql`
  - Add `excerpt { text html json }` to the created product selection.
- `e2e/queries/inventory-api/ProductUpdate.gql`
  - Replace scalar `excerpt` selection with `excerpt { text html json }`.
- `e2e/queries/inventory-api/ProductFindOne.gql`
  - Add `description { text html json }` and `excerpt { text html json }` if read-after-create or read-after-update assertions use this query.
- `e2e/queries/inventory-api/ProductFindMany.gql`
  - Update only if product list assertions or generated operation types include content fields.
- `e2e/queries/inventory-api/ProductBulkUpdate.gql`
  - Replace any scalar excerpt selection with `excerpt { text html json }`.
- `e2e/queries/inventory-api/ProductCreateSimple.gql`
  - Update only if simple product creation assertions need excerpt coverage.

Product specs:

- `e2e/tests/inventory-api/product-create.spec.ts`
  - Extend the existing description create case to create `description` and `excerpt` as `RichTextInput`.
  - Assert `excerpt.text`, `excerpt.html`, and `excerpt.json`.
  - Update full-data creation assertions if the full-data scenario includes excerpt.
- `e2e/tests/inventory-api/product-update.spec.ts`
  - Replace all `content.excerpt: "..."` inputs with `content.excerpt: { text, html, json }`.
  - Replace scalar excerpt assertions with rich-text assertions.
  - Update the clear excerpt case according to the final API clear semantics.
- `e2e/tests/inventory-api/product-bulk-edit.spec.ts`
  - Replace bulk update excerpt strings with `RichTextInput`.
  - Assert bulk-updated products expose `excerpt.text`, `excerpt.html`, and `excerpt.json`.
- `e2e/tests/inventory-api/product-query.spec.ts`
  - Add or update read assertions if product query coverage includes content fields.

Category query documents:

- `e2e/queries/category-api/CategoryCreate.gql`
  - Add `excerpt { text html json }` to the created category selection.
- `e2e/queries/category-api/CategoryUpdate.gql`
  - Add `excerpt { text html json }` to the updated category selection.
- `e2e/queries/category-api/CategoryFindOne.gql`
  - Add `excerpt { text html json }`.
- `e2e/queries/category-api/CategoryWithProducts.gql`
  - Update only if category content fields are selected there.
- `e2e/queries/category-api/CategoryCategoryProducts.gql`
  - Update only if category content fields are selected there.

Category specs:

- `e2e/tests/category-api/category-seo.spec.ts`
  - Update if category create/update inputs include description-like content alongside SEO assertions.
- `e2e/tests/category-api/category-sort.spec.ts`
  - Update only if category create helpers require the new generated input type.
- `e2e/tests/category-api/category-products.spec.ts`
  - Update only if category create helpers require the new generated input type.
- `e2e/tests/category-api/category-product-ordering.spec.ts`
  - Update only if category create helpers require the new generated input type.
- `e2e/tests/category-api/category-product-reordering-complex.spec.ts`
  - Update only if category create helpers require the new generated input type.
- Add a focused category rich-text case to an existing category spec or create `e2e/tests/category-api/category-rich-text.spec.ts`:
  - create category with `description` and `excerpt`;
  - update category `excerpt`;
  - query category by id and assert `excerpt.text`, `excerpt.html`, and `excerpt.json`.

Collection query documents:

- `e2e/queries/catalog-api/CollectionCreate.gql`
  - Add `excerpt { text html json }` to the created collection selection.
- `e2e/queries/catalog-api/CollectionUpdate.gql`
  - Add `excerpt { text html json }` to the updated collection selection.
- `e2e/queries/catalog-api/CollectionFindOne.gql`
  - Add `excerpt { text html json }`.
- `e2e/queries/catalog-api/CollectionFindMany.gql`
  - Update only if collection list assertions select content fields.
- `e2e/queries/catalog-api/CollectionByHandle.gql`
  - Add `excerpt { text html json }` if handle lookups assert content.

Collection specs:

- `e2e/tests/collection-api/collection-crud.spec.ts`
  - Extend collection create with `excerpt: RichTextInput`.
  - Add assertions for `excerpt.text`, `excerpt.html`, and `excerpt.json`.
  - Extend collection update with `excerpt: RichTextInput`.
  - Add read-back assertions through `CollectionFindOne`.
- `e2e/tests/collection-api/collection-products-query.spec.ts`
  - Update only if collection content fields are selected.
- `e2e/tests/collection-api/collection-rules.spec.ts`
  - Update only if collection create helpers require the new generated input type.
- `e2e/tests/collection-api/collection-manual-products.spec.ts`
  - Update only if collection create helpers require the new generated input type.

E2E fixtures and seed data:

- `e2e/fixtures/admin/category.ts`
  - Update typed defaults if `ApiCategoryCreateInput` or helper defaults reference rich-text input types.
- `e2e/fixtures/admin/collection.ts`
  - Update typed defaults if collection helpers add or assert excerpt.
- `e2e/data/seed-project.ts`
  - Replace product/category excerpt string payloads with `RichTextInput` if seed data still creates catalog content through admin GraphQL.

Generated E2E artifacts:

- `e2e/schema-admin.graphql`
  - Regenerate after the federation/admin schema contains `RichText`.
- `e2e/codegen/admin-gql.ts`
  - Regenerate so `ApiDescription`/`ApiDescriptionInput` become `ApiRichText`/`ApiRichTextInput`.
- `e2e/queries/filenames.ts`
  - Regenerate only if new `.gql` files are added.

E2E run policy:

- Do not run the whole E2E suite.
- If verification is needed, run one spec file at a time from `e2e/`.
- Candidate targeted files:
  - `e2e/tests/inventory-api/product-create.spec.ts`
  - `e2e/tests/inventory-api/product-update.spec.ts`
  - `e2e/tests/inventory-api/product-bulk-edit.spec.ts`
  - `e2e/tests/category-api/category-rich-text.spec.ts` or the category spec where the rich-text case is added
  - `e2e/tests/collection-api/collection-crud.spec.ts`

## Phase 10: Verification

Do not run `test` or `tsc` directly.

Allowed verification path:

- Generate DB migration through `shopana_db_generate`.
- Generate backend GraphQL types through `shopana_codegen`.
- Build federation schema through `shopana_schema`.
- Generate admin GraphQL types through `shopana_admin`.
- Regenerate E2E GraphQL types and query filename map when E2E query documents change.
- Run build only when a new version of code needs verification.

Manual acceptance checks:

- Creating a product with excerpt rich text stores:
  - `excerpt_text`
  - `excerpt_html`
  - `excerpt_json`
- Updating product content changes all excerpt formats.
- Reading a product returns `excerpt.text`, `excerpt.html`, and `excerpt.json`.
- Category create/update can persist and return excerpt rich text.
- Collection create/update can persist and return excerpt rich text.
- No resolver returns a hardcoded empty excerpt object.
- GraphQL schema exposes `RichText` and `RichTextInput`.
- Admin product content tabs continue to render `description.html` and `excerpt.html`.
