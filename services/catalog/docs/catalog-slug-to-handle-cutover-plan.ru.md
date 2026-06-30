# План: Catalog slug -> handle cutover

## Цель

Переименовать оставшиеся catalog `slug` в `handle` напрямую в migration-файлах и провести один атомарный cutover по backend API, GraphQL schema, Admin UI и e2e. Старый публичный контракт `slug` для catalog options/features/facets не сохранять как compatibility layer.

Проект на ранней стадии, stage/production data нет, поэтому допустимо менять уже существующие migration SQL in-place, а не добавлять отдельные `ALTER TABLE ... RENAME COLUMN ...` миграции.

## Правила Выполнения

- Не редактировать changeset-файлы.
- Не запускать `test` и `tsc` для проверки.
- Использовать `shopana-cli` MCP для development-команд; build запускать только когда нужна новая версия кода.
- После изменения GraphQL schema обязательно перегенерировать schema/codegen через проектный workflow.
- Admin UI должен импортировать API-типы напрямую из `@/graphql/types`; не добавлять локальные API-output view model типы.

## Изменения В Migration SQL

Переименовать колонки, constraints, indexes и SQL references `slug` -> `handle` в этих файлах:

- `services/catalog/migrations/domains/0300_options/0300_options__tables.sql`
  - `product_option.slug` -> `product_option.handle`.
  - unique key `("product_id", "slug")` -> `("product_id", "handle")`.
  - имя constraint/index привести к `..._handle...`, например `product_option_product_id_handle_key`.
- `services/catalog/migrations/domains/0300_options/0301_options__values.sql`
  - `product_option_value.slug` -> `product_option_value.handle`.
  - unique key `("option_id", "slug")` -> `("option_id", "handle")`.
  - имя constraint/index привести к `..._handle...`.
- `services/catalog/migrations/domains/0400_features/0400_features__features.sql`
  - `product_feature.slug` -> `product_feature.handle`.
  - unique key `("product_id", "slug")` -> `("product_id", "handle")`.
  - имя constraint/index привести к `..._handle...`.
- `services/catalog/migrations/domains/0400_features/0401_features__values.sql`
  - `product_feature_value.slug` -> `product_feature_value.handle`.
  - unique key `("feature_id", "slug")` -> `("feature_id", "handle")`.
  - имя constraint/index привести к `..._handle...`.
- `services/catalog/migrations/domains/0500_facets/0500_facets__tables.sql`
  - `facet.slug` -> `facet.handle`.
  - constraint `facet_project_id_slug_uniq` -> `facet_project_id_handle_uniq`.
- `services/catalog/migrations/domains/0500_facets/0504_facets__source_candidate_view.sql`
  - `po.slug AS handle` -> `po.handle AS handle`.
  - `pf.slug AS handle` -> `pf.handle AS handle`.
  - `GROUP BY ... po.slug/pf.slug` -> `GROUP BY ... po.handle/pf.handle`.
  - indexes on `product_option(project_id, slug)` and `product_feature(project_id, is_group, slug)` -> `handle`.
  - index names привести к `...handle...`.
- `services/catalog/migrations/domains/0500_facets/0505_facets__value_candidate_views.sql`
  - все compositions вида `po.slug || ':' || pov.slug` -> `po.handle || ':' || pov.handle`.
  - все `source_handle` и `handle` expressions перевести на `handle`.
  - `GROUP BY ... slug` -> `GROUP BY ... handle`.

После правки migration SQL проверить, что в `services/catalog/migrations/domains` больше нет `slug`:

```bash
rg -n "\bslug\b|Slug" services/catalog/migrations/domains
```

## Backend TS И DB Models

### Drizzle Models

Обновить schema definitions:

- `services/catalog/src/repositories/models/options.ts`
  - поля `slug` -> `handle` у `productOption` и `productOptionValue`.
  - DB column names `text/varchar("slug")` -> `("handle")`.
  - unique names и `.on(... table.slug)` -> `table.handle`.
- `services/catalog/src/repositories/models/features.ts`
  - поля `slug` -> `handle` у `productFeature` и `productFeatureValue`.
  - DB column names, unique names и indexes перевести на `handle`.
- `services/catalog/src/repositories/models/facet.ts`
  - `facet.slug` -> `facet.handle`.
  - unique constraint `facet_project_id_handle_uniq`.
- `services/catalog/src/repositories/models/facetSourceCandidateView.ts`
- `services/catalog/src/repositories/models/facetOptionValueCandidateView.ts`
- `services/catalog/src/repositories/models/facetFeatureValueCandidateView.ts`
  - SQL view snippets перевести на `handle`.

### Repositories

Переименовать public/internal methods и DTO-поля, не оставляя `Slug` в catalog API:

- `services/catalog/src/repositories/option/OptionRepository.ts`
  - `findBySlug` -> `findByHandle`.
  - args/data/update fields `slug` -> `handle`.
  - all `productOption.slug`, `productOptionValue.slug` -> `handle`.
- `services/catalog/src/repositories/feature/FeatureRepository.ts`
  - `findBySlug` -> `findByHandle`.
  - `findValueBySlug` -> `findValueByHandle`.
  - args/data/update fields `slug` -> `handle`.
- `services/catalog/src/repositories/facet/FacetRepository.ts`
  - `FacetValueSourceToken.facetSlug` -> `facetHandle`.
  - `findBySlug` -> `findByHandle`.
  - token parsing/resolution against `facet.handle`.
- `services/catalog/src/repositories/listing/SearchIndexRepository.ts`
- `services/catalog/src/repositories/listing/VariantSearchIndexRepository.ts`
  - TypeScript names `featureSlugs`/`optionSlugs` заменить на `featureHandles`/`optionHandles`.
  - DB columns `feature_slugs`/`option_slugs` можно либо переименовать in-place отдельным migration scope, либо оставить как storage detail. Для чистого cutover предпочтительно переименовать и read-model SQL тоже.
- `services/catalog/src/repositories/models/searchIndex.ts`
- `services/catalog/src/repositories/models/variantSearchIndex.ts`
  - синхронизировать с выбранным решением по `featureHandles`/`optionHandles`.

### Scripts И Validation

Переименовать в domain language `handle`, но можно оставить общий utility-файл `shared/slug.ts`, если он описывает формат URL-safe handle:

- `services/catalog/src/scripts/shared/slug.ts`
  - либо переименовать в `handle.ts`, либо экспортировать `HANDLE_REGEX`/`isValidHandle`; старые имена не использовать в catalog domain code.
- `services/catalog/src/scripts/option/*`
  - `OptionCreateDto`, `OptionUpdateDto`, `OptionSyncDto`, `shared.ts`, validation schema/semantic, `OptionCreateScript`, `OptionUpdateScript`, `OptionsSyncScript`.
  - userErrors fields `"slug"` -> `"handle"`.
  - messages заменить с `slug` на `handle`.
- `services/catalog/src/scripts/feature/*`
  - `FeatureCreateDto`, `FeatureUpdateDto`, `FeatureSyncDto`, `shared.ts`, validation schema/semantic, `FeatureCreateScript`, `FeatureUpdateScript`, `FeaturesSyncScript`.
  - userErrors fields `"slug"` -> `"handle"`.
- `services/catalog/src/scripts/facet/*`
  - `FacetCreateScript`, `FacetUpdateScript`, `ResolveFacetsScript`, `facetValueValidation.ts`, `dto/index.ts`.
  - `facetSlug` -> `facetHandle`, `featureSlugs`/`optionSlugs` -> `featureHandles`/`optionHandles`.
- `services/catalog/src/scripts/product/ProductCreateScript.ts`
  - `optionValuesBySlug` -> `optionValuesByHandle`.
  - variant handle parsing should use option/value handles.
- `services/catalog/src/scripts/product/dto/ProductCreateDto.ts`
  - product option/value inputs `slug` -> `handle`.
- `services/catalog/src/scripts/variant/VariantCreateScript.ts`
- `services/catalog/src/scripts/variant/helpers/buildVariantHandle.ts`
  - value `slug` terminology -> value `handle`.

## Backend GraphQL API

### Schema Files

Заменить public GraphQL fields/inputs `slug` -> `handle`:

- `services/catalog/src/api/graphql-admin/schema/options.graphql`
  - `ProductOption.slug`, `ProductOptionValue.slug`, create/update/sync inputs.
  - descriptions `URL-friendly slug` -> `URL-friendly handle`.
- `services/catalog/src/api/graphql-admin/schema/features.graphql`
  - `ProductFeature.slug`, `ProductFeatureValue.slug`, create/update/sync inputs.
- `services/catalog/src/api/graphql-admin/schema/facet.graphql`
  - `Facet.slug` -> `Facet.handle`.
  - `FacetCreateInput.slug`/`FacetUpdateInput.slug` -> `handle`.
  - Если `FacetValue` еще возвращает `slug`, заменить на `handle` либо удалить дублирование, если уже есть `handle`.
- `services/catalog/src/api/graphql-admin/schema/product.graphql`
  - product create/update nested options/features inputs и returned product fragments: `slug` -> `handle`.

### Resolvers

Обновить resolver method names and mappings:

- `services/catalog/src/resolvers/admin/OptionResolver.ts`
  - `slug()` -> `handle()`.
- `services/catalog/src/resolvers/admin/OptionValueResolver.ts`
  - `slug()` -> `handle()`.
- `services/catalog/src/resolvers/admin/FeatureResolver.ts`
  - `slug()` -> `handle()`.
- `services/catalog/src/resolvers/admin/FeatureValueResolver.ts`
  - `slug()` -> `handle()`.
- `services/catalog/src/resolvers/admin/FacetResolver.ts`
  - `slug()` -> `handle()`.
- `services/catalog/src/resolvers/admin/MutationResolver.ts`
  - all input/output mapping `input.slug`, `opt.slug`, `value.slug` -> `handle`.
  - userErrors field paths `slug` -> `handle`.

## Generated Artifacts

После schema changes перегенерировать:

- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`
- federation/supergraph artifacts under `infra/federation` if schema build updates them.
- `admin/src/graphql/types.ts`
- `e2e/codegen/admin-gql.ts`
- `e2e/queries/filenames.ts`, если querygen нужен после правки `.gql`.
- `packages/platform-api/src/types.ts`, если этот пакет генерируется из admin/client schema и содержит catalog `slug`.

Планируемые команды уточнить через `shopana-cli` MCP, а не запускать напрямую вслепую. Не запускать `test`/`tsc`.

## Admin UI После Codegen

### Facets Module

Файлы, где `slug` является catalog API field и должен стать `handle`:

- `admin/src/domains/inventory/facets/graphql/fragments.ts`
- `admin/src/domains/inventory/facets/graphql/operation-types.ts`
- `admin/src/domains/inventory/facets/mappers/facet-input.mapper.ts`
- `admin/src/domains/inventory/facets/mappers/facet-value-input.mapper.ts`
- `admin/src/domains/inventory/facets/mappers/facet-grid-row.mapper.ts`
- `admin/src/domains/inventory/facets/mappers/facet-errors.mapper.ts`
- `admin/src/domains/inventory/facets/components/facet-name-cell.tsx`
- `admin/src/domains/inventory/facets/components/facet-tree-name-cell.tsx`
- `admin/src/domains/inventory/facets/components/facet-values-cell.tsx`
- `admin/src/domains/inventory/facets/modals.ts`
- `admin/src/domains/inventory/facets/modals/create-facet-modal/create-facet-modal.tsx`
- `admin/src/domains/inventory/facets/modals/create-facet-modal/schema.ts`
- `admin/src/domains/inventory/facets/modals/edit-facet-modal/edit-facet-modal.tsx`
- `admin/src/domains/inventory/facets/modals/edit-facet-modal/schema.ts`
- `admin/src/domains/inventory/facets/page/page-config.ts`
- `admin/src/domains/inventory/facets/page/page.tsx`

UI form field names можно тоже переименовать `slug` -> `handle`, чтобы ошибки API мапились напрямую и не было двойной терминологии.

### Products Module

Файлы, где option/feature/value `slug` станет `handle`:

- `admin/src/domains/inventory/products/graphql/fragments.ts`
- `admin/src/domains/inventory/products/mappers/product-create.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-options.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-features.mapper.ts`
- `admin/src/domains/inventory/products/modals/create-product-modal/schema.ts`
- `admin/src/domains/inventory/products/modals/create-product-modal/variants-section.tsx`
- `admin/src/domains/inventory/products/modals/create-product-modal/utils/generate-variants.ts`
- `admin/src/domains/inventory/products/modals/edit-options-modal/types.ts`
- `admin/src/domains/inventory/products/modals/edit-options-modal/hooks/use-edit-options-form.ts`
- `admin/src/domains/inventory/products/modals/edit-options-modal/edit-options-modal.styles.ts`
- `admin/src/domains/inventory/products/modals/edit-attributes-modal/types.ts`
- `admin/src/domains/inventory/products/modals/edit-attributes-modal/edit-attributes-modal.tsx`
- `admin/src/domains/inventory/products/components/variants/variants-table.tsx`
- `admin/src/domains/inventory/products/modals.ts`

Файлы ниже используют product/category SEO handle или modal payload `productSlug`; менять только если локальный термин реально относится к catalog option/feature/facet API:

- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/components/seo/seo-block.tsx`
- `admin/src/domains/inventory/products/modals/edit-seo-modal/edit-seo-modal.tsx`
- `admin/src/domains/inventory/products/modals/edit-tags-modal/edit-tags-modal.tsx`
- `admin/src/domains/inventory/products/modals/edit-tags-modal/edit-tags-modal.styles.ts`

## E2E И Test Fixtures После Codegen

### GraphQL Query Files

Заменить selection/input fields `slug` -> `handle`:

- `e2e/queries/facet-api/Facet.gql`
- `e2e/queries/facet-api/FacetCreate.gql`
- `e2e/queries/facet-api/FacetUpdate.gql`
- `e2e/queries/facet-api/FacetValue.gql`
- `e2e/queries/facet-api/FacetValueCreate.gql`
- `e2e/queries/facet-api/FacetValueUpdate.gql`
- `e2e/queries/facet-api/FacetValues.gql`
- `e2e/queries/facet-api/Facets.gql`
- `e2e/queries/inventory-api/ProductCreate.gql`
- `e2e/queries/inventory-api/ProductCreateSimple.gql`
- `e2e/queries/inventory-api/ProductFindMany.gql`
- `e2e/queries/inventory-api/ProductFindOne.gql`
- `e2e/queries/inventory-api/ProductOptionsSync.gql`
- `e2e/queries/inventory-api/ProductUpdate.gql`

### API Specs

Обновить input objects, type annotations and assertions:

- `e2e/tests/facet-api/facet.spec.ts`
- `e2e/tests/facet-api/facet-value.spec.ts`
- `e2e/tests/inventory-api/features-sync.spec.ts`
- `e2e/tests/inventory-api/options-sync.spec.ts`
- `e2e/tests/inventory-api/product-create.spec.ts`
- `e2e/tests/inventory-api/product-update.spec.ts`
- `e2e/tests/inventory-api/product-bulk-edit.spec.ts`
- `e2e/tests/inventory-api/variant-query.spec.ts`

### Admin UI Specs

Проверить и заменить catalog API payload `slug` -> `handle`. Не трогать `api.session.projectSlug` и URL route params:

- `e2e/tests/admin-ui/facet-create.spec.ts`
- `e2e/tests/admin-ui/product-create.spec.ts`
- `e2e/tests/admin-ui/product-options-variants-lifecycle.spec.ts`
- `e2e/tests/admin-ui/product-pricing-widget.spec.ts`
- `e2e/tests/admin-ui/product-update-attributes.spec.ts`
- `e2e/tests/admin-ui/product-update-options.spec.ts`
- `e2e/tests/admin-ui/product-update-variants.spec.ts`
- `e2e/tests/admin-ui/product-variants-read-path.spec.ts`
- `e2e/tests/admin-ui/products-table.spec.ts`
- `e2e/tests/admin-ui/inventory-page.spec.ts`

Эти файлы содержат `projectSlug`, category/tag/product page slug или copy text. Просмотреть, но менять только catalog option/feature/facet API references:

- `e2e/tests/admin-ui/categories-table.spec.ts`
- `e2e/tests/admin-ui/category-create.spec.ts`
- `e2e/tests/admin-ui/category-details-update.spec.ts`
- `e2e/tests/admin-ui/product-update-content-seo.spec.ts`
- `e2e/tests/admin-ui/product-update-media.spec.ts`
- `e2e/tests/admin-ui/product-update-tags.spec.ts`
- `e2e/tests/admin-ui/product-update-title-slug.spec.ts`
- `e2e/tests/admin-ui/seed-project-products.spec.ts`
- `e2e/tests/admin-ui/tags.spec.ts`

### Fixtures And Seed Data

Обновить только API-facing structures или переименовать seed schema целиком, если хотим единый словарь:

- `e2e/fixtures/admin/product.ts`
  - `options[].slug`, `values[].slug` -> `handle`.
  - helper variable names `optionSlug` -> `optionHandle`.
- `e2e/data/seed-data.ts`
  - product/category/tag/feature seed fields сейчас называются `slug`. Если это становится source data термином, переименовать в `handle`; если это только seed-file naming convention, оставить и маппить в `handle` на API boundary.
- `e2e/data/seed-project.ts`
  - API calls уже отправляют `handle` для products/categories/tags, но features сейчас отправляются как `slug`; заменить на `handle`.
  - internal maps `tagSlug`, `childSlug`, `slugBasedImageId` можно оставить, если seed JSON остается slug-based.
- `e2e/data/product-prompt.md`
  - обновить документацию seed JSON, если seed schema переименовывается.
- `e2e/data/seed-json/**` и `e2e/data/seed-boxing/**`
  - массово переименовывать `slug` -> `handle` только при решении менять seed JSON contract. Это большой механический слой, не обязательный для backend cutover, если loader продолжит принимать `slug` и отправлять API `handle`.

## Порядок Работ

1. Изменить migration SQL in-place и добиться нулевого `slug` в `services/catalog/migrations/domains`.
2. Обновить Drizzle models и SQL view model snippets.
3. Обновить repositories, scripts, DTO, validation, resolver mappings.
4. Обновить GraphQL schema files.
5. Запустить schema/codegen generation через `shopana-cli`.
6. Исправить compile-level fallout в Admin UI по generated API types.
7. Исправить e2e `.gql`, specs, fixtures and seed loaders.
8. При необходимости запустить build через `shopana-cli`; `test` и `tsc` не запускать.

## Контрольные Поиски

После cutover эти поиски должны либо возвращать пусто, либо только допустимые исключения:

```bash
rg -n "\bslug\b|Slug" services/catalog/migrations/domains
rg -n "\bslug\b|Slug" services/catalog/src -g '!**/generated/**'
rg -n "\bslug\b|Slug" admin/src/domains/inventory/facets admin/src/domains/inventory/products
rg -n "\bslug\b|Slug" e2e/queries/facet-api e2e/queries/inventory-api e2e/tests/facet-api e2e/tests/inventory-api
```

Допустимые исключения после миграции:

- `projectSlug`, organization/store route slugs outside catalog option/feature/facet API.
- seed JSON source files, если принято решение оставить seed contract как `slug` и маппить его в API `handle`.
- generic validation helper filename `slug.ts`, только если в domain code exported names уже `handle`.
