# План: Category API на уровне архитектуры Product API

## Цель

Довести API категорий в Catalog до такого же уровня готовности к интеграции и архитектурной согласованности, как текущий Product API.

Это one-commit cutover plan. Изменение выполняется атомарно одним backend cutover без периода обратной совместимости:

- Не добавлять `categoryUpdateV2`, legacy aliases или deprecated transitional fields.
- Не поддерживать старую форму `categoryUpdate(input: CategoryUpdateInput!)`.
- Не оставлять временные code paths, которые принимают старый и новый контракты одновременно.
- Все GraphQL schema changes, resolvers, scripts, workflows, repositories, generated artifacts и API consumers внутри repo обновляются в одном change set.
- После cutover публичный контракт считается новым контрактом. Старые queries/mutations могут ломаться и должны быть переписаны в этом же коммите.

Целевой API должен поддерживать:

- API-backed flow для списка категорий, деталей, создания, обновления, удаления, иерархии, медиа, SEO и назначения продуктов.
- Редактирование категорий продукта через полноценный replace-set контракт, а не только через add/move операции.
- Primary category как явный API-контракт.
- Product-style архитектуру мутаций: GraphQL namespace, global IDs, generated schemas, scripts, workflow orchestration для сложных обновлений, `userErrors` и предсказуемые payloads для refresh/cache.

## Текущее Состояние

На backend уже есть полезные category primitives:

- `catalogQuery.category(id)` и `catalogQuery.categories(...)`.
- `Category` поля для handle, publication state, translated name/content, hierarchy, media, SEO, products и `productsCount`.
- `catalogMutation.categoryCreate`, `categoryUpdate`, `categoryMove`, `categoryDelete`.
- Product-in-category операции: `categoryAddProduct`, `categoryMoveProduct`, `categoryRebalance` и `categoryUpdateSort`.
- Repository methods для product-category links, category product connection, media replacement, translations и SEO.

Важные пробелы:

- `catalogQuery.categories` принимает только pagination arguments. Нет `where`, `orderBy` и search.
- Category connection pagination не является полноценной Relay pagination. Сейчас фактически поддерживается только первая forward page, а `hasPreviousPage` всегда `false`.
- Product category assignment неполный. Есть `categoryAddProduct`, но нет remove или replace-set API.
- Primary category существует как `product_category.isPrimary`, но не экспонируется как стабильный API-контракт.
- `Product.categories: [Category!]!` теряет metadata связи, например `isPrimary` и manual rank.
- Resolver `categoryUpdate` принимает `defaultSort/defaultSortDirection`, но `CategoryUpdateInput` в schema эти поля не экспонирует. Публичный контракт сейчас использует `categoryUpdateSort`.
- Category update монолитный по сравнению с product update workflow architecture. Нет optimistic locking, operation results и partial update operation model.

## Архитектурные Правила

Следовать тем же backend и GraphQL правилам, которые используются для продуктов:

- Использовать namespaces `catalogQuery` и `catalogMutation`.
- Принимать и возвращать GraphQL global IDs на границе schema. Декодировать в UUID только в resolvers/scripts.
- Заменять legacy GraphQL contracts напрямую. Не добавлять transitional `V2` API.
- Каждая mutation возвращает `userErrors`.
- Сложные multi-field updates проходят через workflow с operation-level results.
- Простые create/delete операции могут оставаться script-backed.
- Scripts содержат business logic и возвращают `{ result/category/product?, changes?, userErrors }`.
- Repositories остаются multi-tenant через текущий context и используют transaction-aware connection.
- Не добавлять presentation-layer contracts в backend API plan.

## Целевой Backend Contract

### Category Type

Сохранить существующие поля `Category` и добавить product-style concurrency support:

```graphql
type Category implements Node @key(fields: "id") {
  id: ID!
  handle: String!
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime
  revision: Int!

  depth: Int!
  path: String!
  name: String!
  description: RichText
  excerpt: RichText
  defaultSort: ProductSortBy!
  defaultSortDirection: SortDirection!
  seo: Seo

  parent: Category
  children: [Category!]!
  ancestors: [Category!]!
  media: [CategoryMediaItem!]!

  products(
    first: Int
    after: String
    last: Int
    before: String
    orderBy: [ProductOrderByInput!]
    where: CategoryProductWhereInput
  ): CategoryProductConnection!

  productsCount: Int!
}
```

Database change:

```sql
ALTER TABLE catalog.category
  ADD COLUMN revision integer NOT NULL DEFAULT 0;
```

Каждый category update workflow должен сначала захватывать revision, а затем применять операции. Это должно работать так же, как `ProductUpdateWorkflow` для продуктов.

### Product Category Relationship Metadata

Новый product-facing контракт для category assignment должен быть явным и metadata-aware. Не сохранять `Product.categories` как compatibility requirement. Если поле остается в schema, оно должно быть обновлено в этом же cutover и считаться convenience display field, а не legacy contract.

```graphql
type ProductCategoryAssignment {
  category: Category!
  isPrimary: Boolean!
  rank: String!
}

extend type Product {
  primaryCategory: Category
  categoryAssignments: [ProductCategoryAssignment!]!
}

type CategoryProductEdge {
  node: Product!
  cursor: String!
  isPrimary: Boolean!
  rank: String!
}
```

Repository/database rules:

- Не больше одной primary category на product в рамках project.
- `primaryCategoryId` должен быть `null` или входить в назначенные `categoryIds`.
- Product-category rows должны сохранять manual rank в рамках каждой category.
- Удаление продукта из category должно удалять и его manual rank в этой category.

Рекомендуемый database constraint:

```sql
CREATE UNIQUE INDEX product_category_one_primary_per_product_idx
  ON catalog.product_category(project_id, product_id)
  WHERE is_primary = true;
```

## Целевой Query Contract

### Category List

Список категорий требует такого же connection behavior, как product screens, плюс category-specific filters.

```graphql
enum CategorySortBy {
  CREATED_AT
  UPDATED_AT
  NAME
  HANDLE
  PRODUCTS_COUNT
  PUBLISHED_AT
}

input CategoryOrderByInput {
  field: CategorySortBy!
  direction: SortDirection
}

input CategoryWhereInput {
  search: String
  parentId: ID
  isPublished: Boolean
  deletedAt: DateTimeFilter
  createdAt: DateTimeFilter
  updatedAt: DateTimeFilter
}

type CatalogQuery {
  categories(
    first: Int
    after: String
    last: Int
    before: String
    where: CategoryWhereInput
    orderBy: [CategoryOrderByInput!]
  ): CategoryConnection!
}
```

Implementation notes:

- Предпочесть Relay helpers из `@shopana/drizzle-query`, а не hand-rolled cursor handling.
- Search должен искать по translated category name и category handle.
- `parentId` нужно декодировать из global category ID перед repository access.
- `totalCount` должен учитывать те же filters, что и connection.
- `hasPreviousPage`, `last` и `before` должны быть реализованы, а не hardcoded.

### Category Details

Существующего `catalogQuery.category(id)` достаточно как root field. Backend должен экспонировать поля, необходимые для category details:

- identity: `id`, `handle`, `revision`;
- publication: `isPublished`, `publishedAt`, `deletedAt`;
- timestamps: `createdAt`, `updatedAt`;
- hierarchy: `depth`, `path`, `parent`, `ancestors`, `children`;
- translated content: `name`, `description`, `excerpt`;
- PLP settings: `defaultSort`, `defaultSortDirection`;
- SEO: `seo`;
- media: `media`;
- products connection: `products`;
- aggregate count: `productsCount`.

## Целевой Mutation Contract

### Category Create

Сохранить create как script-backed operation, но обновить schema и resolver в этом же cutover:

```graphql
input CategoryCreateInput {
  handle: String!
  name: String!
  parentId: ID
  description: RichTextInput
  excerpt: RichTextInput
  seo: SeoInput
  mediaFileIds: [ID!]
  publish: Boolean
}

type CategoryCreatePayload {
  category: Category
  userErrors: [GenericUserError!]!
}
```

Required fixes:

- Консистентно валидировать duplicate handle.
- Декодировать `parentId`, `mediaFileIds` и `seo.ogImageId`.
- Синхронизировать media back-references, если category media должен отслеживаться media service.
- Возвращать созданную category с достаточным набором fields для cache refresh.

### Unified Category Update

Заменить текущую публичную `categoryUpdate` mutation на product-style update contract. Не добавлять `categoryUpdateV2` и не поддерживать старый `categoryUpdate(input: CategoryUpdateInput!)`.

Итоговая schema:

```graphql
input CategoryContentInput {
  description: RichTextInput
  excerpt: RichTextInput
}

input CategoryMediaInput {
  fileIds: [ID!]!
}

input CategoryHierarchyInput {
  parentId: ID
}

input CategorySortInput {
  defaultSort: ProductSortBy!
  defaultSortDirection: SortDirection!
}

input CategoryUpdateInput {
  handle: String
  name: String
  content: CategoryContentInput
  seo: SeoInput
  status: ProductStatus
  media: CategoryMediaInput
  hierarchy: CategoryHierarchyInput
  sort: CategorySortInput
}

enum CategoryUpdateOperationType {
  CATEGORY_UPDATE
}

type CategoryOperationResult {
  type: CategoryUpdateOperationType!
  applied: Boolean!
  errors: [GenericUserError!]!
}

type CategoryUpdatePayload {
  category: Category
  operationResults: [CategoryOperationResult!]!
  userErrors: [GenericUserError!]!
}

type CatalogMutation {
  categoryUpdate(
    categoryId: ID!
    operations: CategoryUpdateInput
    expectedRevision: Int
  ): CategoryUpdatePayload!
}
```

Workflow behavior:

- Захватить category revision через compare-and-swap до любой операции.
- Запускать только scripts, нужные для переданных fields.
- Агрегировать operation errors в `operationResults` и `userErrors`.
- Эмитить `categoryUpdated` с partial delta, если что-то изменилось.
- Возвращать updated category resolver.

Suggested workflow DTO:

```ts
interface CategoryUpdateWorkflowInput {
  categoryId: string;
  expectedRevision?: number;
  operations: CategoryUpdateParams;
  context: WorkflowContext;
}

interface CategoryUpdateParams {
  id: string;
  handle?: string;
  name?: string;
  content?: {
    description?: RichTextInput | null;
    excerpt?: RichTextInput | null;
  };
  seo?: SeoInput | null;
  status?: "published" | "draft";
  media?: { fileIds: string[] };
  hierarchy?: { parentId: string | null };
  sort?: {
    defaultSort: "manual" | "price" | "newest" | "name";
    defaultSortDirection: "asc" | "desc";
  };
}
```

Recommended script split:

- `CategoryUpdateIdentityScript`: handle и translated name.
- `CategoryUpdateContentScript`: description и excerpt.
- `CategoryUpdateSeoScript`: SEO и Open Graph.
- `CategoryUpdateStatusScript`: publish/unpublish.
- `CategoryUpdateMediaScript`: category media replacement и back-ref sync.
- `CategoryMoveScript`: parent/hierarchy move.
- `CategoryUpdateSortScript`: PLP default sort.

Cutover requirement: do not leave the old monolithic `CategoryUpdateScript` as the public mutation path. It may be reused internally only if wrapped behind operation-specific scripts and the exposed workflow behavior matches the new operation-result contract in the same commit.

### Product Category Assignment From Product Editing

Product edit categories должен быть частью product update architecture, потому что это меняет product-facing data.

Расширить `ProductUpdateInput`:

```graphql
input ProductCategoriesInput {
  categoryIds: [ID!]!
  primaryCategoryId: ID
}

input ProductUpdateInput {
  handle: String
  title: String
  content: ProductContentInput
  seo: ProductSeoInput
  status: ProductStatus
  media: ProductMediaInput
  categories: ProductCategoriesInput
  variants: [VariantUpdateInput!]
}
```

Расширить `ProductUpdateWorkflow`:

- Добавить `categories?: ProductCategoriesParams` в `ProductUpdateParams`.
- Добавить `ProductUpdateCategoriesScript`.
- Script выполняет complete replace-set semantics:
  - Декодирует и валидирует все category IDs.
  - Отклоняет duplicate category IDs.
  - Отклоняет missing categories.
  - Вставляет missing links.
  - Удаляет removed links.
  - Обновляет `isPrimary`.
  - Сохраняет existing rank для links, которые остались.
  - Назначает новые ranks в конец каждой category.
  - Touch product и increment revision через существующий workflow.
  - Эмитит product delta с category IDs и primary category ID.

Это основной API, который нужен product edit categories flow.

### Category Product Management From Category Details

Category details также требует category-centric product management.

Добавить недостающие remove/sync operations:

```graphql
input CategoryRemoveProductInput {
  categoryId: ID!
  productId: ID!
}

type CategoryRemoveProductPayload {
  category: Category
  userErrors: [GenericUserError!]!
}

input CategoryProductsSyncInput {
  categoryId: ID!
  productIds: [ID!]!
}

type CategoryProductsSyncPayload {
  category: Category
  userErrors: [GenericUserError!]!
}
```

Keep existing category-centric operations only as part of the final post-cutover contract:

- `categoryAddProduct`
- `categoryMoveProduct`
- `categoryRebalance`

Добавить:

- `categoryRemoveProduct`: удаляет один product из category.
- `categoryProductsSync`: complete replace-set для вручную назначенных products category.

Implementation notes:

- `categoryProductsSync` должен сохранять rank для existing products, которые остаются.
- New products нужно append после текущего last rank.
- Removed products должны удалять rows из `product_category`.
- Если удаляемая category была primary для product, clear primary или deterministic fallback допустимы только если product-level contract явно этого требует. Предпочтительно вернуть validation error, если не добавлен `allowPrimaryFallback`.

## Repository Plan

### Category Connection

Заменить текущий hand-rolled `getConnection` на relay query на базе `@shopana/drizzle-query`.

Required capabilities:

- `first/after/last/before`
- `where.search`
- `where.parentId`
- `where.isPublished`
- `where.deletedAt`
- `orderBy`
- total count с filters
- stable cursor tie-breaker по category ID

Concrete integration instructions:

1. Add dedicated root category query builders near the existing category product relay query:

```ts
const categoryQuery = createQuery(category).maxLimit(100).defaultLimit(20);

export const categoryRelayQuery = createRelayQuery(
  createQuery(category).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "category", tieBreaker: "id" },
);

export type CategoryQueryInput = InferExecuteOptions<typeof categoryQuery>;
export type CategoryRelayInput = InferRelayInput<typeof categoryRelayQuery>;
```

2. Replace `CategoryRepository.getConnection` manual cursor construction with `categoryRelayQuery.execute`.
   Do not create cursors with `Buffer.from(category.id)`. Cursors, `hasNextPage`, `hasPreviousPage`,
   `startCursor` and `endCursor` must come from drizzle-query relay result.

```ts
async getConnection(args: CategoryRelayInput): Promise<CategoryConnectionResult> {
  const { where, orderBy, ...paginationArgs } = args;

  const mergedWhere: CategoryRelayInput["where"] = {
    _and: [
      { projectId: { _eq: this.storeId } },
      { deletedAt: { _is: null } },
      ...(where ? [where] : []),
    ],
  };

  const executeInput: CategoryRelayInput = {
    ...paginationArgs,
    where: mergedWhere,
    orderBy: orderBy ?? [
      { field: "createdAt", direction: "desc" },
      { field: "id", direction: "desc" },
    ],
  };

  const [result, totalCount] = await Promise.all([
    categoryRelayQuery.execute(this.connection, executeInput),
    categoryRelayQuery.count(this.connection, { where: mergedWhere }),
  ]);

  return {
    edges: result.edges.map((edge) => ({
      cursor: edge.cursor,
      nodeId: edge.node.id,
    })),
    pageInfo: result.pageInfo,
    totalCount,
  };
}
```

3. Map GraphQL input to drizzle-query input at the resolver/repository boundary:

- `first`, `after`, `last`, `before` pass through unchanged.
- `where.parentId` must be decoded from global category ID before repository access.
- `where.parentId === null` means root categories: `{ parentId: { _is: null } }`.
- `where.parentId === undefined` means no parent filter.
- `where.isPublished` maps to `publishedAt _is null` / `_isNot null`, unless a generated computed field is added.
- `where.deletedAt` must be opt-in. Default category list keeps `{ deletedAt: { _is: null } }`.
- `orderBy` must be converted from GraphQL enum names to drizzle-query field names.

4. Implement category search with drizzle-query instead of repository-local SQL string assembly:

- Search must match category `handle`.
- Search must match translated category `name`.
- If direct filtering across `categoryTranslation` requires joins, define a `categoryTranslationQuery`
  with `createQuery(categoryTranslation, ...)` and add a `translation` join field to the root category
  query builder.
- If translated name search needs locale scoping, include current `this.locale` in the search filter.
- If `PRODUCTS_COUNT` sorting/filtering cannot be expressed through the base table, introduce a Drizzle
  view with computed `productsCount` and build `categoryRelayQuery` from that view.

5. `totalCount` must always use the same `mergedWhere` as the relay query:

```ts
categoryRelayQuery.count(this.connection, { where: mergedWhere });
```

Do not use the existing unfiltered `count()` method for connection `totalCount`.

6. Keep tenant and soft-delete constraints inside repository-level `mergedWhere` so consumers cannot omit them:

```ts
_and: [
  { projectId: { _eq: this.storeId } },
  { deletedAt: { _is: null } },
  ...(where ? [where] : []),
]
```

7. Preserve the existing connection resolver contract:

- Repository returns `{ edges: [{ cursor, nodeId }], pageInfo, totalCount }`.
- `CategoryConnectionResolver` continues to load nodes through existing resolver/data-loader flow.
- The repository should not return raw category records from `getConnection` unless the connection
  resolver contract is intentionally changed.

### Product Category Links

Добавить repository methods:

```ts
getProductCategoryLinks(productId: string): Promise<ProductCategory[]>;
getProductCategoryLinksByProductIds(productIds: readonly string[]): Promise<ProductCategory[]>;
removeProductFromCategory(productId: string, categoryId: string): Promise<boolean>;
removeProductFromCategories(productId: string, categoryIds: string[]): Promise<number>;
syncProductCategories(input: {
  productId: string;
  categoryIds: string[];
  primaryCategoryId?: string | null;
}): Promise<ProductCategory[]>;
syncCategoryProducts(input: {
  categoryId: string;
  productIds: string[];
}): Promise<ProductCategory[]>;
setProductPrimaryCategory(productId: string, primaryCategoryId: string | null): Promise<void>;
```

Validation belongs in scripts. Repositories не должны silently invent fallback primary category behavior.

## Resolver Plan

### Query Resolver

- Декодировать global IDs в `category(id)`.
- Нормализовать category filters перед передачей в repository.
- Возвращать resolver instances, а не raw records.

### Category Resolver

- Добавить `revision()`.
- Оставить `products(args)` через `CategoryProductConnectionResolver`.
- Добавить relation metadata в `CategoryProductEdge` через connection resolver data.

### Product Resolver

- Update or remove `categories()` in the same cutover. New integrations must use `primaryCategory()` and `categoryAssignments()` for assignment metadata.
- Добавить `primaryCategory()`.
- Добавить `categoryAssignments()`.
- Использовать DataLoader для category links, чтобы избежать N+1 queries.

### Mutation Resolver

- Оставить namespace под `catalogMutation`.
- Направить `categoryUpdate` через `CategoryUpdateWorkflow`.
- Направить `productUpdate.categories` через `ProductUpdateWorkflow`.
- Добавить `categoryRemoveProduct` и `categoryProductsSync`.
- Декодировать все global IDs на GraphQL boundary.
- Не бросать validation errors для user input. Возвращать `userErrors`.

## Event And Search Index Plan

Product category changes должны обновлять product search indexes, потому что category handles входят в product search index.

Required event behavior:

- Product category assignment через `productUpdate.categories` эмитит `productUpdated`.
- Category product add/remove/sync эмитит product update events для affected products или напрямую schedules product index sync.
- Category handle/name/status changes должны schedule category-aware product index sync для продуктов в category, если category handles или searchable category labels denormalized.

Preferred first implementation:

- Для product category assignment использовать существующую `productUpdated` обработку через `ProductUpdateWorkflow`.
- Для category-centric bulk changes запускать `SyncProductIndexScript` для affected products после transaction commit.

## Generated Schema

После backend schema changes:

- Regenerate catalog GraphQL schema artifacts.
- Regenerate resolver generated types.
- Regenerate Zod schemas generated from GraphQL inputs.
- Проверить, что публичная schema содержит новые fields, inputs и payloads.
- Проверить, что schema composition/federation проходит с новыми `Product` fields.

## One-Commit Cutover Work Plan

Все пункты ниже входят в один commit. Нельзя merge/deploy частичный state, где schema уже изменилась, но resolvers/scripts/codegen/admin queries еще старые.

### 1. Schema Cutover

- Добавить category `revision`.
- Заменить `catalogQuery.categories` signature на connection с `where` и `orderBy`.
- Заменить `catalogMutation.categoryUpdate` signature на `categoryId`, `operations`, `expectedRevision`.
- Удалить старый публичный `categoryUpdate(input: CategoryUpdateInput!)` контракт из schema и generated types.
- Добавить product category relationship metadata fields: `primaryCategory`, `categoryAssignments`, edge `isPrimary`, edge `rank`.
- Добавить `ProductCategoriesInput` в существующий `ProductUpdateInput`.
- Добавить category remove/sync product mutations.
- Убрать или переподключить legacy fields/resolvers, которые конфликтуют с новым контрактом. Не оставлять deprecated aliases.

### 2. Migration And Repository Cutover

- Добавить database migration для `category.revision`.
- Добавить primary category uniqueness migration.
- Реализовать full Relay category connection на `@shopana/drizzle-query`.
- Удалить ручной cursor handling из `CategoryRepository.getConnection`.
- Добавить product-category link read/remove/sync/primary methods.
- Сохранять все queries scoped by `projectId`.
- Считать category connection `totalCount` с теми же filters, что и relay query.

### 3. Script And Workflow Cutover

- Добавить `CategoryUpdateWorkflow` и сделать его единственным path для `categoryUpdate`.
- Разделить или wrap category update scripts по operation responsibility в этом же commit.
- Добавить `ProductUpdateCategoriesScript`.
- Добавить `CategoryRemoveProductScript`.
- Добавить `CategoryProductsSyncScript`.
- Сделать stable `userErrors` codes и fields во всех scripts.
- Убедиться, что old category update script не вызывается напрямую из resolver после cutover.

### 4. Resolver And Loader Cutover

- Декодировать global IDs на GraphQL boundary.
- Подключить новый `categoryUpdate` к workflow.
- Подключить `productUpdate.categories`.
- Подключить category remove/sync mutations.
- Добавить resolver fields для `revision`, `primaryCategory` и `categoryAssignments`.
- Обновить `Product.categories`, если поле остается в schema, чтобы оно работало поверх нового assignment source. Иначе удалить его из schema и generated resolvers в этом же commit.
- Добавить или обновить DataLoader для product-category links, чтобы новые fields не создавали N+1 queries.

### 5. Generated Artifacts Cutover

- Regenerate service GraphQL generated types and schemas.
- Regenerate Zod schemas for new GraphQL inputs.
- Regenerate schema composition/federation artifacts.
- Update all in-repo GraphQL documents/queries/mutations that referenced old category contracts.
- Remove generated references to the old `categoryUpdate(input: ...)` shape.

### 6. Event And Index Cutover

- Product category assignment через `productUpdate.categories` должен эмитить `productUpdated`.
- Category product add/remove/sync должен обновлять search index для affected products.
- Category handle/name/status changes должны schedule category-aware product index sync, если category handles или searchable labels denormalized.
- Не оставлять old event behavior that only handles add/move without remove/sync.

### 7. Verification

Не использовать `test` или `tsc` для этого проекта, если инструкции не изменятся.

Использовать build только когда нужно проверить новую версию кода.

Manual/API verification checklist:

- Query categories with pagination, search, filters и sorting.
- Query category details with hierarchy, media, SEO и products.
- Create category with parent, media, SEO и publish flag.
- Update category sections with expected revision.
- Verify revision conflict returns `REVISION_CONFLICT`.
- Assign product categories through `productUpdate.categories` with replace-set semantics.
- Remove category from product and verify `primaryCategory`, `categoryAssignments` and `Product.categories` only if that convenience field remains in schema.
- Add, remove, sync и reorder products from category details.
- Verify product search index/category handles after product-category changes.
- Verify no generated schema or resolver type still exposes old `categoryUpdate(input: ...)`.
- Verify no `categoryUpdateV2` or deprecated compatibility field exists.

## Cutover Decisions

- Primary category остается optional: `primaryCategoryId` может быть `null`, но если он задан, он должен входить в `categoryIds`.
- Category-centric product sync должен возвращать validation error при попытке удалить primary assignment, если request не добавляет явную опцию `allowPrimaryFallback`.
- Category media back-reference sync нужен только если media service already tracks product media back-references with the same ownership semantics.
- Category name search должен работать по current locale first. Поиск по всем translations допустим только если это явно поддержано query builder/view и не ломает pagination stability.
