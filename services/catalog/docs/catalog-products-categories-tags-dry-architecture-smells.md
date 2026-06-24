# Анализ DRY и architecture smells в Catalog: products, categories, tags

Дата анализа: 2026-06-24.

## Область анализа

Проверены слои backend Catalog service для products, categories и tags:

- GraphQL schema и generated filters;
- admin resolvers и connection resolvers;
- repositories, Drizzle models и list views;
- loaders;
- scripts и workflows;
- relation logic `product_category` / `product_tag`;
- локальные project rules из `AGENTS.md` и релевантные документы knowledge base: `patterns/repository.md`, `patterns/resolver.md`, `patterns/script.md`, `patterns/dataloader.md`, `packages/drizzle-query/index.md`.

`dist/` не анализировался как источник истины.

## Краткий вывод

Catalog уже движется к общей архитектуре для product/category list views, Relay pagination, generated filters, section-based updates и optimistic locking. Но зрелость распределена неравномерно:

- `Product` - наиболее развитый API, но с большим количеством mapping/operation boilerplate в `MutationResolver`.
- `Category` частично догнала product API, но содержит одновременно новый workflow path и старый монолитный update script.
- `Tag` заметно отстает: нет soft delete, `updatedAt`, `deletedAt`, `revision`, workflow update, Zod resolver annotations в mutations, а в schema есть `Tag.products`, который не реализован resolver-слоем.

Главные риски: публичный API tags раскрывает tenant field `projectId`, relation counts обновляются разными способами, workflow/repository граница нарушена прямым DB access, а `MutationResolver.ts` стал God object для mapping, validation, event emission и orchestration.

## Находки

### 1. Разная зрелость lifecycle contract у Product/Category/Tag

**Серьезность: high.**

`Product` и `Category` имеют `publishedAt`, `isPublished`, `updatedAt`, `deletedAt`, `revision` и optimistic locking в update contract. См. `services/catalog/src/api/graphql-admin/schema/product.graphql:121` и `services/catalog/src/api/graphql-admin/schema/category.graphql:6`.

`Tag` в GraphQL имеет только `id`, `handle`, `createdAt`, `name`, `products`, `productsCount`; нет `updatedAt`, `deletedAt`, `revision`. См. `services/catalog/src/api/graphql-admin/schema/tag.graphql:6`.

То же видно в Drizzle models:

- product: `updatedAt`, `deletedAt`, `revision` - `services/catalog/src/repositories/models/products.ts:18`;
- category: `updatedAt`, `deletedAt`, `revision`, `productsCount` - `services/catalog/src/repositories/models/categories.ts:22`;
- tag: только `createdAt` и `productsCount` - `services/catalog/src/repositories/models/tags.ts:20`.

Риск: клиенты и bulk flows получают три разных lifecycle-паттерна для сущностей одного catalog bounded context. Tags нельзя безопасно обновлять с optimistic locking, нельзя soft-delete, нельзя унифицировать audit/change propagation.

Рекомендация: явно выбрать один из вариантов:

- довести `Tag` до lifecycle baseline product/category;
- или зафиксировать tag как lightweight dictionary entity и убрать из него поля/операции, которые создают ожидание полноценной catalog entity.

### 2. `Tag.products` объявлен в schema, но не реализован resolver-слоем

**Серьезность: high.**

Schema объявляет:

- `Tag.products(first/after/last/before): ProductConnection!` - `services/catalog/src/api/graphql-admin/schema/tag.graphql:19`.

Но `TagResolver` реализует `id`, `handle`, `createdAt`, `name`, `productsCount` и не имеет метода `products`. См. `services/catalog/src/resolvers/admin/TagResolver.ts:14`.

При этом есть loaders/repository methods для product-tag links, но нет `TagProductConnectionResolver` или reuse `ProductConnectionResolver` с tag scope. См. `services/catalog/src/loaders/TagLoader.ts:35` и `services/catalog/src/repositories/tag/TagRepository.ts:262`.

Риск: GraphQL contract обещает navigation tag -> products, но runtime слой не соответствует контракту.

Рекомендация: добавить tag-scoped product connection через общий product list path (`ProductConnectionResolver` + `meta`/scope) или удалить поле из schema до реализации.

### 3. Public filters для Tag раскрывают `projectId`

**Серьезность: high.**

Для Product и Category generator исключает internal fields:

- Product excludes `projectId`, `deletedAt`, `revision` - `services/catalog/scripts/generate-filters.ts:32`;
- Category excludes `projectId`, `deletedAt`, `revision` - `services/catalog/scripts/generate-filters.ts:77`.

Для Tag exclusions отсутствуют:

- `tagWhere` и `tagOrderBy` генерируются без `excludeFields` - `services/catalog/scripts/generate-filters.ts:99`.

В generated schema это уже попало в public API:

- `TagWhereInput.projectId` - `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql:195`;
- `TagOrderField.projectId` - `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql:218`.

Риск: tenant-owned поле становится частью публичного query contract. Даже если repository потом добавляет `projectId = storeId`, API surface подталкивает клиентов к tenant-aware фильтрации извне и ломает boundary rule из repository pattern.

Рекомендация: добавить `excludeFields: ["projectId"]` для tag filters/order. Если tag получит soft delete/revision, исключать и их по тому же правилу.

### 4. `MutationResolver.ts` стал God object

**Серьезность: high.**

`MutationResolver.ts` делает слишком много:

- декодирует global IDs;
- строит workflow DTO;
- содержит category update mapper - `services/catalog/src/resolvers/admin/MutationResolver.ts:212`;
- содержит event emission helpers - `services/catalog/src/resolvers/admin/MutationResolver.ts:337`;
- содержит product update mapper - `services/catalog/src/resolvers/admin/MutationResolver.ts:572`;
- содержит bulk mapper, частично дублирующий product update mapper - `services/catalog/src/resolvers/admin/MutationResolver.ts:3021`;
- содержит tag mutations без `@ZodResolver` - `services/catalog/src/resolvers/admin/MutationResolver.ts:2135`.

Это расходится с documented resolver pattern: resolver должен быть GraphQL boundary, а business logic и orchestration должны жить в scripts/workflows.

Риск: mapping single update и bulk update расходятся при любом изменении contract. Validation/error shape также расходятся: product/category используют generated schemas, tags - нет, хотя `TagCreateInputSchema`, `TagUpdateInputSchema`, `TagDeleteInputSchema` существуют.

Рекомендация:

- вынести product update mapping в общий module, используемый single и bulk;
- вынести category update mapping из resolver;
- импортировать и применить Tag input schemas в tag mutations;
- event emission helpers вынести в workflow/script service или dedicated event publisher.

### 5. Repository слой смешивает разные ответственности

**Серьезность: medium-high.**

`CategoryRepository` содержит CRUD, tree/path logic, root category connection, category-product connection, product-category relation mutations, counters, translations, media и rank rebalance в одном классе. См. `services/catalog/src/repositories/category/CategoryRepository.ts:133`.

Product/Category/Tag `getConnection()` имеют почти одинаковый skeleton:

- Product - `services/catalog/src/repositories/product/ProductRepository.ts:253`;
- Category - `services/catalog/src/repositories/category/CategoryRepository.ts:421`;
- Tag - `services/catalog/src/repositories/tag/TagRepository.ts:149`.

Category дополнительно содержит custom mapping `ListingOrderByInput -> nested drizzle fields` внутри repository - `services/catalog/src/repositories/category/CategoryRepository.ts:879`.

Риск: изменение Relay defaults, tenant filters, locale behavior или totalCount behavior требует ручной синхронизации в нескольких repositories.

Рекомендация:

- выделить shared helper для Relay connection execution: merge internal filters, default order, execute/count, map edges;
- разделить `CategoryRepository` минимум на `CategoryRepository`, `CategoryProductRepository`, `CategoryMediaRepository`/relation helpers или внутренние scope classes;
- mapping listing sort оставить declarative рядом с query definition, а не inline switch в repository method.

### 6. Workflow обходит repository multi-tenancy guard

**Серьезность: medium-high.**

Repository pattern требует multi-tenant filtering через context/storeId. `BaseRepository.storeId` берет tenant из context - `services/catalog/src/repositories/BaseRepository.ts:34`.

`CategoryUpdateWorkflow.stepAcquireRevision()` делает прямой DB update, но включает `projectId`, `id`, `deletedAt` - `services/catalog/src/workflows/CategoryUpdateWorkflow.ts:111`.

`ProductUpdateWorkflow.stepAcquireRevision()` тоже делает прямой DB update, но фильтрует только по `productId` и optional `revision`; `projectId` и `deletedAt` отсутствуют - `services/catalog/src/workflows/ProductUpdateWorkflow.ts:192`.

Риск: workflow-level CAS имеет другой security/consistency contract, чем repository methods. Даже если `product.id` глобально уникален, паттерн multi-tenancy нарушен и становится примером для будущих прямых DB операций.

Рекомендация: перенести CAS в repository methods (`tryAcquireProductRevision`, `tryAcquireCategoryRevision`) или минимум добавить `storeId`/`deletedAt IS NULL` в product workflow, как в category workflow.

### 7. Старый category update path сосуществует с новым workflow path

**Серьезность: medium.**

Есть монолитный `CategoryUpdateScript`, который обновляет identity/content/media/SEO/sort в одном script - `services/catalog/src/scripts/category/CategoryUpdateScript.ts:11`.

Новый `CategoryUpdateWorkflow` вызывает секционные scripts: identity/content/seo/status/media/hierarchy/sort - `services/catalog/src/workflows/CategoryUpdateWorkflow.ts:166`.

Риск: два способа обновить category будут расходиться по validation, error fields, change tracking и side effects. Уже видно дублирование allowed sorts в `CategoryUpdateScript` и `CategoryUpdateSortSectionScript`.

Рекомендация: удалить legacy script после проверки отсутствия вызовов или превратить его в thin wrapper поверх workflow/section scripts.

### 8. Counters для category/tag обновляются разными стратегиями

**Серьезность: medium.**

`TagRepository.linkProductToTag()` / `unlinkProductFromTag()` напрямую increment/decrement `productsCount` - `services/catalog/src/repositories/tag/TagRepository.ts:309`.

`CategoryRepository` имеет batch refresh `refreshProductsCountByCategoryIds()` - `services/catalog/src/repositories/category/CategoryRepository.ts:702`, но `CategoryAddProductScript` и `CategoryRemoveProductScript` не вызывают refresh. См. `services/catalog/src/scripts/category/CategoryAddProductScript.ts:44` и `services/catalog/src/scripts/category/CategoryRemoveProductScript.ts:72`.

`CategoryResolver.productsCount()` читает denormalized field - `services/catalog/src/resolvers/admin/CategoryResolver.ts:165`.

Риск: `productsCount` для categories может становиться stale после add/remove, а tags используют другую consistency model. Это не только DRY issue, но и behavior divergence.

Рекомендация: выбрать одну стратегию для denormalized counters: synchronous relation mutation update, async refresh script, DB trigger или derived count. Применить одинаково к category/tag.

### 9. Relation API surfaces несимметричны

**Серьезность: medium.**

Product -> categories получил explicit metadata-aware contract:

- `primaryCategory`;
- `categoryAssignments { category, isPrimary }`.

См. `services/catalog/src/api/graphql-admin/schema/product.graphql:169` и resolver `services/catalog/src/resolvers/admin/ProductResolver.ts:167`.

Product -> tags остается простым `[Tag!]!` без assignment metadata и без connection - `services/catalog/src/api/graphql-admin/schema/product.graphql:175`.

Category -> products имеет dedicated `CategoryProductConnection` и listing sorting - `services/catalog/src/api/graphql-admin/schema/category.graphql:67`.

Tag -> products обещает `ProductConnection`, но не реализован - `services/catalog/src/api/graphql-admin/schema/tag.graphql:19`.

Риск: clients вынуждены запоминать разные relation idioms для похожих catalog relationships. Расширение tag relations позже будет breaking или потребует parallel fields.

Рекомендация: оформить relation API decision:

- categories остаются assignment entity из-за `isPrimary`/rank;
- tags либо получают `TagProductConnection`, либо public field удаляется;
- если у tags появится rank/source/metadata, вводить `ProductTagAssignment` заранее.

### 10. Loaders повторяют O(n*m) mapping

**Серьезность: medium.**

Большинство DataLoader batch functions делают `ids.map(... results.find/filter ...)`:

- ProductLoader - `services/catalog/src/loaders/ProductLoader.ts:24`;
- CategoryLoader - `services/catalog/src/loaders/CategoryLoader.ts:23`;
- TagLoader - `services/catalog/src/loaders/TagLoader.ts:16`.

Для relation arrays используется `filter` на каждый requested id, что дает O(n*m) на больших batch sizes.

Риск: повторяющийся boilerplate и деградация на больших GraphQL selection sets.

Рекомендация: добавить shared helpers вроде `indexById`, `groupByKey`, `mapBatch`, `mapBatchMany` и использовать их во всех loaders.

### 11. List-view/filter manifests дублируются вручную

**Серьезность: medium.**

`productListView`, `categoryListView`, `tagListView` задают read model. Затем `scripts/generate-filters.ts` вручную повторяет field type map для каждой сущности:

- product map - `services/catalog/scripts/generate-filters.ts:16`;
- category map - `services/catalog/scripts/generate-filters.ts:61`;
- tag map - `services/catalog/scripts/generate-filters.ts:89`.

Именно из-за ручной карты tag получил public `projectId`.

Риск: query contract расходится с repository-owned fields и list view schema.

Рекомендация: завести declarative manifest на entity list query:

- public field types;
- excluded internal fields;
- global ID mappers;
- default order;
- internal tenant/locale filters.

Generator и repository должны читать один источник правил.

### 12. Scope normalizers silently превращают invalid input в empty result

**Серьезность: low-medium.**

`filter-normalizers.ts` для invalid direction/mode/id возвращает `{ kind: "empty" }`, а repository превращает это в impossible where:

- normalizers - `services/catalog/src/resolvers/admin/filter-normalizers.ts:32`;
- product empty where - `services/catalog/src/repositories/product/ProductRepository.ts:55`;
- category empty where - `services/catalog/src/repositories/category/CategoryRepository.ts:64`.

Риск: invalid client input выглядит как пустой список, а не как validation error. Для admin API это ухудшает диагностику и может маскировать bug в UI.

Рекомендация: для явно invalid global IDs/modes возвращать `userErrors` или GraphQL validation error. `{ kind: "empty" }` оставить только для валидных, но пустых scopes.

### 13. Catalog kernel сохраняет inventory naming

**Серьезность: low.**

В catalog kernel типы и комментарии называют service inventory:

- `InventoryKernelServices` - `services/catalog/src/kernel/types.ts:23`;
- `BaseScript` использует `InventoryKernelServices` - `services/catalog/src/kernel/BaseScript.ts:27`.

Риск: низкий runtime-риск, но сильный copy/paste smell на уровне bounded context. Новые contributors будут переносить неправильные имена дальше.

Рекомендация: переименовать в `CatalogKernelServices` отдельным mechanical refactor.

## Приоритетный план исправлений

1. Закрыть high-risk API issues:
   - убрать `projectId` из Tag filters/order;
   - реализовать или удалить `Tag.products`;
   - включить `@ZodResolver` для tag mutations.

2. Стабилизировать consistency:
   - унифицировать category/tag productsCount strategy;
   - добавить `storeId` и `deletedAt` guard в product revision CAS или перенести CAS в repository.

3. Снизить DRY-долг:
   - вынести product update mapping из `MutationResolver` и переиспользовать в bulk;
   - вынести category update mapping;
   - добавить DataLoader mapping helpers;
   - выделить shared Relay connection execution helper.

4. Упростить architecture:
   - удалить/обернуть legacy `CategoryUpdateScript`;
   - разделить `CategoryRepository` по relation/media/counter responsibilities;
   - оформить общий list-query manifest для Product/Category/Tag.

5. Почистить naming:
   - переименовать `InventoryKernelServices` в `CatalogKernelServices`.

## Что не запускалось

Тесты, `tsc` и build не запускались: задача была документационной, а project instructions запрещают запускать test/tsc для проверки.
