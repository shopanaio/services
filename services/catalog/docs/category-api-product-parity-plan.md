# План: Category API на уровне архитектуры Product API

## Цель

Довести API категорий в Catalog до такого же уровня готовности к интеграции и архитектурной согласованности, как текущий Product API.

Это one-commit cutover plan. Изменение выполняется атомарно одним backend cutover без периода обратной совместимости:

- Не поддерживать старую форму `categoryUpdate(input: CategoryUpdateInput!)`.
- Не оставлять временные code paths, которые принимают старый и новый контракты одновременно.
- Все GraphQL schema changes, resolvers, scripts, workflows, repositories, generated artifacts и API consumers внутри repo обновляются в одном change set.
- После cutover публичный контракт считается новым контрактом. Старые queries/mutations могут ломаться и должны быть переписаны в этом же коммите.

Целевой API должен поддерживать:

- API-backed flow для списка категорий, деталей, создания, обновления, удаления, иерархии, медиа, SEO и назначения продуктов.
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
- Product category assignment неполный. Есть `categoryAddProduct`, но нет remove.
- Primary category существует как `product_category.isPrimary`, но не экспонируется как стабильный API-контракт.
- `Product.categories: [Category!]!` теряет metadata связи, например `isPrimary` и manual rank.
- Resolver `categoryUpdate` принимает `defaultSort/defaultSortDirection`, но `CategoryUpdateInput` в schema эти поля не экспонирует. Публичный контракт сейчас использует `categoryUpdateSort`.
- Category update монолитный по сравнению с product update workflow architecture. Нет optimistic locking, operation results и partial update operation model.

## Архитектурные Правила

Следовать тем же backend и GraphQL правилам, которые используются для продуктов:

- Использовать namespaces `catalogQuery` и `catalogMutation`.
- Принимать и возвращать GraphQL global IDs на границе schema. Декодировать в UUID только в resolvers/scripts.
- Заменять legacy GraphQL contracts напрямую.
- Каждая mutation возвращает `userErrors`.
- Сложные multi-field updates проходят через workflow с operation-level results.
- Простые create/delete операции могут оставаться script-backed.
- Scripts содержат business logic и возвращают `{ result/category/product?, changes?, userErrors }`.
- Repositories остаются multi-tenant через текущий context и используют transaction-aware connection.

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

Каждый category update workflow должен использовать product-style optimistic locking через revision
compare-and-swap, но category update имеет более строгую all-or-nothing семантику, потому что наружу
возвращается один public `CATEGORY_UPDATE` result.

### Product Category Relationship Metadata

Новый product-facing контракт для category assignment должен быть явным и metadata-aware. Не сохранять `Product.categories` как compatibility requirement. Если поле остается в schema, оно должно быть обновлено в этом же cutover и считаться convenience display field, а не legacy contract.

```graphql
type ProductCategoryAssignment {
  category: Category!
  isPrimary: Boolean!
}

extend type Product {
  categoryAssignments: [ProductCategoryAssignment!]!
}

type CategoryProductEdge {
  node: Product!
  cursor: String!
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

Migration note: current model already has a partial unique index named
`idx_product_category_primary` on `product_category(product_id) WHERE is_primary = true`.
The migration must replace that existing index instead of adding a second overlapping constraint:

## Целевой Query Contract

### Category List

Список категорий требует такого же connection behavior, как product screens, плюс category-specific filters.

```graphql
enum CategorySortBy {
  CREATED_AT
  UPDATED_AT
  HANDLE
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

- Relay helpers из `@shopana/drizzle-query`.
- Search должен искать по `category.handle` в этом cutover. Search/sort по translated category name
  не входит в обязательный table-based cutover и может быть добавлен отдельно, если будет
  реализован без dedicated category list view и без дублирования category rows.
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

enum CategoryStatus {
  DRAFT
  PUBLISHED
}

input CategoryUpdateInput {
  handle: String
  name: String
  content: CategoryContentInput
  seo: SeoInput
  status: CategoryStatus
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
    operations: CategoryUpdateInput!
    expectedRevision: Int
  ): CategoryUpdatePayload!
}
```

Workflow behavior:

- `operations` обязателен на GraphQL уровне, как часть нового публичного contract. Missing
  `operations` должен отсекаться GraphQL validation, потому что argument non-null.
- Пустой `operations` object без requested sections должен копировать текущее no-op поведение
  `ProductUpdateWorkflow`: выполнить revision compare-and-swap, инкрементить `revision` при
  successful CAS, не выполнять section scripts, вернуть updated category payload,
  один `CATEGORY_UPDATE` result с `applied: true`, `userErrors: []`, не эмитить
  `productUpdated`/`categoryUpdated`.
- Захватить category revision через compare-and-swap до применения update sections.
- CAS и все requested category sections должны быть atomic as a unit: либо все requested sections
  применены и `revision` инкрементирован ровно один раз, либо ни один section не применен и
  `revision` не меняется.
- Копировать product-style no-op update behavior для пустого `operations`, но не копировать текущую
  partial-apply семантику `ProductUpdateWorkflow`, где отдельные operation errors могут вернуться
  после частично примененных изменений.
- Сформировать один workflow operation result типа `CATEGORY_UPDATE`, как `ProductUpdateWorkflow`
  формирует `PRODUCT_UPDATE` для product-level fields.
- Запускать только scripts, нужные для переданных fields, но не превращать каждый внутренний script
  в отдельный public `operationResults` item. Script split остается implementation detail.
- Агрегировать ошибки scripts в `CATEGORY_UPDATE.errors` и в общий `userErrors`.
- Для sections, которые меняют product-index-affecting category data, после successful commit
  эмитить `productUpdated` fan-out для affected products тем же путем, что `ProductUpdateWorkflow`.
- `categoryUpdated` не является обязательным indexing contract для этого cutover; если он остается для
  category-domain consumers, эмитить его только после successful commit.
- Возвращать updated category resolver только при successful commit.
- If any requested section returns validation/business errors, roll back all category writes and the
  revision acquire, return `CATEGORY_UPDATE.applied: false`, duplicate errors into aggregate
  `userErrors`, do not emit `productUpdated`/`categoryUpdated`, and do not return a new revision for
  UI cache use.

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

interface CategoryUpdateWorkflowResult {
  category: { id: string; revision: number } | null;
  operationResults: CategoryOperationResult[];
  userErrors: UserError[];
}

interface CategoryOperationResult {
  type: "categoryUpdate";
  applied: boolean;
  errors: UserError[];
}
```

Operation result semantics:

- `operations` в GraphQL contract обязателен. Missing `operations` является GraphQL validation
  error и не доходит до resolver/workflow.
- Empty object является no-op update: после successful revision check workflow возвращает
  updated category payload с новой revision, один `CATEGORY_UPDATE` result с `applied: true`,
  `userErrors: []` и не эмитит events.
- Если `operations` передан, содержит хотя бы один requested section и прошел revision check,
  workflow возвращает ровно один `CATEGORY_UPDATE` result.
- `CATEGORY_UPDATE.applied` равен `true`, только если все requested sections применились успешно.
- Если любой internal script вернул validation/business errors, весь category update считается
  unapplied: `CATEGORY_UPDATE.applied` равен `false`, ошибки лежат в `CATEGORY_UPDATE.errors` и
  продублированы в aggregate `userErrors`; partial writes, revision bump и events запрещены.
- Если revision check не прошел, `operationResults` остается пустым, как у `ProductUpdateWorkflow`
  при early failure до выполнения операций.

Recommended script split:

- `CategoryUpdateIdentityScript`: handle и translated name.
- `CategoryUpdateContentScript`: description и excerpt.
- `CategoryUpdateSeoScript`: SEO и Open Graph.
- `CategoryUpdateStatusScript`: publish/unpublish.
- `CategoryUpdateMediaScript`: category media replacement и back-ref sync.
- `CategoryMoveScript`: parent/hierarchy move.
- `CategoryUpdateSortScript`: PLP default sort.

Hierarchy must-fix: before wiring hierarchy into unified `categoryUpdate`, fix
`CategoryRepository.move()` descendant path update SQL to target `catalog.category`, not
`inventory.category`. Unified hierarchy update must not ship while descendant path updates point at
the wrong schema.

Cutover requirement: do not leave the old monolithic `CategoryUpdateScript` as the public mutation path. It may be reused internally only if wrapped behind section-specific internal scripts and the exposed workflow behavior matches the single `CATEGORY_UPDATE` operation-result contract in the same commit.

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
  - Touch product через repository method, если текущая архитектура требует обновить `updatedAt`.
  - Не инкрементит product `revision` самостоятельно. Revision уже захватывается и инкрементится
    `ProductUpdateWorkflow` через compare-and-swap до выполнения scripts; второй bump внутри
    `ProductUpdateCategoriesScript` запрещен.
  - Эмитит product delta с category IDs и primary category ID.

Это основной API, который нужен product edit categories flow.

### Category Product Management From Category Details

Category details также требует category-centric product management.

Добавить недостающую операцию удаления:

```graphql
input CategoryRemoveProductInput {
  categoryId: ID!
  productId: ID!
}

type CategoryRemoveProductPayload {
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

Implementation notes:

- Если удаляемая category была primary для product, clear primary или deterministic fallback допустимы только если product-level contract явно этого требует. Предпочтительно вернуть validation error, если не добавлен `allowPrimaryFallback`.

## Repository Plan

### Category Connection

Заменить текущий hand-rolled `getConnection` на relay query на базе `@shopana/drizzle-query`.
Строить root category list напрямую от таблицы `catalog.category`, аналогично текущему
`ProductRepository.getConnection`. Не добавлять dedicated `category_list` view для этого cutover.

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

1. Add root query builders near the existing category product relay query. `categoryRelayQuery`
   must be built from the `category` table, matching the product repository pattern:

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
  const hasDeletedAtFilter = where && "deletedAt" in where;

  const mergedWhere: CategoryRelayInput["where"] = {
    _and: [
      { projectId: { _eq: this.storeId } },
      ...(hasDeletedAtFilter ? [] : [{ deletedAt: { _is: null } }]),
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
- `orderBy` must be converted from GraphQL enum names to drizzle-query field names available on
  `category`.

4. Implement category search with the table-based relay query:

- Search must match category `handle`.
- Search by translated category `name` can be added later only if it can be expressed without introducing
  a category list view and without duplicating category rows across translations. If that is not
  supported by the table-based query builder in this cutover, keep search limited to `handle` and
  document translated-name search as follow-up.
- `productsCount` field resolution should continue through the existing loader/repository aggregate
  path, not per-row subqueries in the list resolver. Sorting by `productsCount` is not part of this
  table-based cutover unless later implemented without a dedicated category list view.

5. `totalCount` must always use the same `mergedWhere` as the relay query:

```ts
categoryRelayQuery.count(this.connection, { where: mergedWhere });
```

Do not use the existing unfiltered `count()` method for connection `totalCount`.

6. Keep tenant constraints inside repository-level `mergedWhere` so consumers cannot omit them.
   Keep the default soft-delete constraint there too, but skip it when `where.deletedAt` is
   explicitly provided:

```ts
_and: [
  { projectId: { _eq: this.storeId } },
  ...(hasDeletedAtFilter ? [] : [{ deletedAt: { _is: null } }]),
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

### Category Product Connection

`CategoryProductEdge` остается стандартным Relay edge с `node` и `cursor`.
Metadata строки `product_category`, такая как `isPrimary` и `lexoRank`, не экспонируется на
`CategoryProductEdge`. Product-facing metadata доступна через `Product.categoryAssignments`.

Repository result для `getCategoryProductsConnection` должен оставаться compatible с текущим
connection resolver contract:

```ts
interface CategoryProductsConnectionResult {
  edges: Array<{
    cursor: string;
    nodeId: string;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}
```

## Resolver Plan

### Query Resolver

- Декодировать global IDs в `category(id)`.
- Нормализовать category filters перед передачей в repository.
- Возвращать resolver instances, а не raw records.

### Category Resolver

- Добавить `revision()`.
- Оставить `products(args)` через `CategoryProductConnectionResolver`.
- `CategoryProductEdge` не должен возвращать `isPrimary` или `rank`; эти поля доступны через
  product-facing assignment API.

### Product Resolver

- Update or remove `categories()` in the same cutover. New integrations must use `primaryCategory()` and `categoryAssignments()` for assignment metadata.
- Добавить `primaryCategory()`.
- Добавить `categoryAssignments()`.
- Использовать DataLoader для category links, чтобы избежать N+1 queries.

### Mutation Resolver

- Оставить namespace под `catalogMutation`.
- Направить `categoryUpdate` через `CategoryUpdateWorkflow`.
- Направить `productUpdate.categories` через `ProductUpdateWorkflow`.
- Добавить `categoryRemoveProduct`.
- Декодировать все global IDs на GraphQL boundary.
- Не бросать validation errors для user input. Возвращать `userErrors`.

## Event And Search Index Plan

Product category changes должны обновлять product search indexes, потому что category handles входят в product search index.

Required event behavior:

- Product category assignment через `productUpdate.categories` эмитит `productUpdated`.
- Category product add/remove/reorder эмитит `productUpdated` для каждого affected product после
  successful category/category-link write.
- Category handle/name/status/hierarchy changes эмитят `productUpdated` fan-out для продуктов в
  category, если category handles, searchable category labels, visibility или hierarchy denormalized.

Final implementation:

- Использовать тот же путь, что `ProductUpdateWorkflow`: emit `productUpdated`;
  `CatalogEventHandlers.handleProductUpdated` запускает `SyncProductIndexScript`.
- Не добавлять direct `SyncProductIndexScript` scheduling как второй финальный путь для
  category/category-link writes.
- Category scripts возвращают affected product IDs и category/product delta; resolver/workflow layer
  эмитит `productUpdated` после commit/script success.

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

Schema cutover должен менять публичный GraphQL contract в одном месте и без двусмысленности.
Изменять нужно все source schema files, которые участвуют в admin schema loading, а не только
entity-specific файлы:

- `src/api/graphql-admin/schema/base.graphql`:
  - заменить `CatalogQuery.categories(first, after, last, before)` на финальную signature с
    `where: CategoryWhereInput` и `orderBy: [CategoryOrderByInput!]`;
  - заменить `CatalogMutation.categoryUpdate(input: CategoryUpdateInput!)` на
    `categoryUpdate(categoryId: ID!, operations: CategoryUpdateInput!, expectedRevision: Int)`;
  - добавить `categoryRemoveProduct(input: CategoryRemoveProductInput!)`;
  - не оставлять `categoryUpdateV2`, deprecated aliases или compatibility wrapper вокруг старой
    формы `categoryUpdate(input: ...)`.
- `src/api/graphql-admin/schema/category.graphql`:
  - добавить `Category.revision: Int!`;
  - добавить `CategorySortBy`, `CategoryOrderByInput`, `CategoryWhereInput`;
  - заменить старый `CategoryUpdateInput` с embedded `id` на section-based input без `id`;
  - добавить `CategoryContentInput`, `CategoryMediaInput`, `CategoryHierarchyInput`,
    `CategorySortInput`, `CategoryStatus`, `CategoryUpdateOperationType`,
    `CategoryOperationResult`;
  - расширить `CategoryUpdatePayload` полем
    `operationResults: [CategoryOperationResult!]!`;
  - добавить `CategoryRemoveProductInput`, `CategoryRemoveProductPayload`;
  - оставить `CategoryProductEdge` в форме `{ node: Product!, cursor: String! }` без
    product-category metadata fields.
- `src/api/graphql-admin/schema/product.graphql`:
  - добавить `type ProductCategoryAssignment { category: Category!, isPrimary: Boolean!, rank: String! }`;
  - добавить поля `Product.primaryCategory: Category` и
    `Product.categoryAssignments: [ProductCategoryAssignment!]!`;
  - добавить `input ProductCategoriesInput { categoryIds: [ID!]!, primaryCategoryId: ID }`;
  - добавить `categories: ProductCategoriesInput` в существующий `ProductUpdateInput`;
  - принять явное решение по `Product.categories`: либо удалить поле в этом cutover, либо оставить как
    convenience display field, работающий поверх нового assignment source. Нельзя оставлять его как
    единственный product-category contract.

Schema-level acceptance criteria:

- В source schema больше нет публичного `categoryUpdate(input: CategoryUpdateInput!)`.
- `CategoryUpdateInput` больше не содержит `id`; category id передается только через
  `categoryUpdate(categoryId: ID!, ...)`.
- `CatalogQuery.categories` содержит `where` и `orderBy`, а `CategoryWhereInput.parentId` остается
  `ID`, чтобы resolver декодировал global category ID на GraphQL boundary.
- `CategoryStatus` является отдельным enum и не переиспользует `ProductStatus`.
- Все новые mutations и payloads возвращают `userErrors: [GenericUserError!]!`.
- Product-facing category assignment metadata доступна через `primaryCategory`,
  `categoryAssignments` и optional convenience `Product.categories`.
- После schema changes regenerate шаг из пункта 5 обязан удалить старые generated references:
  `CatalogMutationCategoryUpdateArgs.input`, старый `CategoryUpdateInput.id` и старый Zod schema shape.

### 2. Migration And Repository Cutover

Repository/database cutover должен привести Drizzle models, generated migration SQL и runtime
repository behavior к одному финальному состоянию. Нельзя менять schema contract без matching
database/model changes в том же commit.

Model changes:

- `src/repositories/models/categories.ts`:
  - добавить `category.revision = integer("revision").notNull().default(0)`;
  - заменить `idx_product_category_primary` на финальный partial unique index по
    `(projectId, productId) WHERE is_primary = true`;
  - не оставлять одновременно старый product-only primary index и новый tenant-scoped index.
- Не добавлять `category_list` или supporting aggregate views для category list в этом cutover.
  Category list query должна работать от таблицы `catalog.category`, как product list.
- `CategoryRepository` должен соответствовать repository KB pattern: использовать
  transaction-aware `this.connection`, всегда применять `projectId`/`storeId` scoping, и
  предпочтительно перейти на `extends BaseRepository`, чтобы не дублировать context/connection
  plumbing вручную.

Migration SQL acceptance criteria:

- Migration содержит `ALTER TABLE "catalog"."category" ADD COLUMN "revision" integer NOT NULL DEFAULT 0`.
- Migration не создает `catalog.category_list` или supporting aggregate view(s) для category list.
- Migration явно удаляет или переименовывает `idx_product_category_primary` до создания финального
  tenant-scoped index:

```sql
DROP INDEX IF EXISTS "catalog"."idx_product_category_primary";

CREATE UNIQUE INDEX "product_category_one_primary_per_product_idx"
  ON "catalog"."product_category" ("project_id", "product_id")
  WHERE is_primary = true;
```

- Generated migration snapshot/model metadata не должны продолжать описывать старый
  `idx_product_category_primary` как активный final index.
- Migration не редактируется вручную для обхода Drizzle model mismatch. Если SQL нужно поправить,
  сначала поправить Drizzle model, затем regenerate migration через project-approved migration
  command.

Category list repository cutover:

- Заменить `CategoryRelayInput` с ручным `parentId?: string | null` на
  `InferRelayInput<typeof categoryRelayQuery>`.
- Создать `categoryQuery` и `categoryRelayQuery` на базе таблицы `category`:

```ts
const categoryQuery = createQuery(category).maxLimit(100).defaultLimit(20);

export const categoryRelayQuery = createRelayQuery(
  createQuery(category).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "category", tieBreaker: "id" },
);
```

- `CategoryRepository.getConnection(args)` должен:
  - принимать `first/after/last/before`, `where`, `orderBy`;
  - merge-ить repository-owned filters:
    `{ projectId: { _eq: this.storeId } }` и default `{ deletedAt: { _is: null } }`, если caller
    явно не передал `where.deletedAt`;
  - использовать `categoryRelayQuery.execute(this.connection, executeInput)`;
  - считать `totalCount` через `categoryRelayQuery.count(this.connection, { where: mergedWhere })`;
  - возвращать только `{ edges: [{ cursor, nodeId }], pageInfo, totalCount }`, чтобы сохранить
    current `CategoryConnectionResolver` contract.
- Запрещено оставлять:
  - `Buffer.from(category.id)` cursor construction;
  - hardcoded `hasPreviousPage: false`;
  - игнорирование `after`, `last`, `before`;
  - unfiltered `this.count()` для connection `totalCount`;
  - dedicated `category_list` view для category list.
- GraphQL-to-repository mapping остается на resolver boundary:
  - `where.parentId` декодируется из global category ID до repository call;
  - `parentId: null` означает root categories через `{ parentId: { _is: null } }`;
  - `isPublished` мапится на `publishedAt`;
  - enum fields из `CategoryOrderByInput` мапятся на drizzle-query field names that exist on
    `category`.

Hierarchy repository fix:

- До подключения `hierarchy` section к unified `categoryUpdate` исправить
  `CategoryRepository.move()` descendant update SQL с `inventory.category` на `catalog.category`.
- Descendant path/depth update должен оставаться tenant-scoped:

```sql
UPDATE catalog.category
SET path = ..., depth = ..., updated_at = now()
WHERE project_id = ...
  AND path LIKE ...
```

- Acceptance check: в catalog repository code больше нет строки `inventory.category`.

Product-category link repository cutover:

- Добавить методы:

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

- Repository methods implement persistence only. Validation for duplicate IDs, missing category IDs,
  primary category membership, and primary fallback policy belongs in scripts.
- `syncProductCategories` must preserve `lexoRank` for links that remain, delete removed links,
  append new links at the end of each category, and update `isPrimary` without inventing fallback.
- `syncCategoryProducts` must preserve rank for existing products in the category, append new
  products after the current last rank, remove missing products, and not silently clear primary
  assignments unless the script contract explicitly allowed it.

Category product connection:

- `getCategoryProductsConnection` result edges stay standard Relay-style product edges:

```ts
edges: Array<{
  cursor: string;
  nodeId: string;
}>;
```

- Product-category metadata is not exposed on `CategoryProductEdge`.
- `totalCount` for category product connection must use the same merged filters as the relay query,
  not only `countProductsInCategory(categoryId)` when user `where` filters are present.

Repository cutover acceptance criteria:

- All category/product-category repository reads and writes are scoped by `projectId`.
- All repository queries use transaction-aware `this.connection`; no direct `this.db` bypass.
- `CategoryRepository.getConnection` relies on `@shopana/drizzle-query` relay output for cursors and
  pageInfo.
- `CategoryProductConnectionResolver` can keep using the base `{ cursor, node }` edge shape.
- `CategoryRepository.move()` updates descendants in `catalog.category`.
- Drizzle model, migration SQL and runtime repository fields agree on final names for
  `revision` and primary-category unique index.

### 3. Script And Workflow Cutover

Script/workflow cutover должен дать один публичный write path для unified category update и не
копировать partial-apply поведение `ProductUpdateWorkflow`. Главный invariant: category update
либо применяет все requested sections и инкрементит `revision` ровно один раз, либо не применяет
ничего и не меняет `revision`.

Files to add/update:

- `src/workflows/dto/CategoryUpdateWorkflowDto.ts`:
  - `CategoryUpdateWorkflowInput`;
  - `CategoryUpdateParams`;
  - `CategoryUpdateWorkflowResult`;
  - `CategoryOperationResult`;
  - `CategoryChanges`;
  - reuse/import shared `WorkflowContext` shape compatible with product workflow context.
- `src/workflows/CategoryUpdateWorkflow.ts`:
  - `@Workflow("categoryUpdate")`;
  - workflow name must be invoked as `catalog.categoryUpdate` from resolver;
  - exported/registered from `src/workflows/index.ts` in the same cutover.
- `src/scripts/category/`:
  - `CategoryUpdateAtomicScript` or equivalent transactional internal script that owns CAS +
    requested section writes;
  - `CategoryUpdateIdentityScript`: `handle` and translated `name`;
  - `CategoryUpdateContentScript`: `description` and `excerpt`;
  - `CategoryUpdateSeoScript`: SEO and Open Graph;
  - `CategoryUpdateStatusScript`: publish/unpublish;
  - `CategoryUpdateMediaScript`: media replacement and optional media back-reference sync;
  - `CategoryUpdateHierarchyScript` or wrapped `CategoryMoveScript`: parent/path/depth changes;
  - keep `CategoryUpdateSortScript` as sort section implementation or wrap it behind a section
    script with the unified error/result contract.
- `src/scripts/product/`:
  - add `ProductUpdateCategoriesScript` and export it from product script index.
- `src/scripts/category/`:
  - add `CategoryRemoveProductScript`;
  - export new scripts from category script index.

Unified category update workflow behavior:

- Resolver maps GraphQL input to workflow DTO only after decoding all global IDs:
  - `categoryId`;
  - `operations.hierarchy.parentId`;
  - `operations.media.fileIds`;
  - `operations.seo.ogImageId`.
- Missing `operations` is rejected by GraphQL validation because the argument is non-null.

- Empty `operations` object follows current `ProductUpdateWorkflow` no-op semantics:

```ts
{
  category: { id: input.categoryId, revision },
  operationResults: [{ type: "categoryUpdate", applied: true, errors: [] }],
  userErrors: [],
}
```

- Revision conflict is also an early failure before public operation execution:

```ts
{
  category: null,
  operationResults: [],
  userErrors: [{ code: "REVISION_CONFLICT", field: ["expectedRevision"], message: "Category was modified by another user" }],
}
```

- If `operations` contains at least one requested section and revision check passes, workflow
  returns exactly one public operation result:

```ts
{
  type: "categoryUpdate",
  applied: boolean,
  errors: UserError[],
}
```

- Resolver maps internal result type `"categoryUpdate"` to GraphQL enum `CATEGORY_UPDATE`.
- `CATEGORY_UPDATE.applied` is `true` only when every requested section succeeds.
- Any validation/business error from any requested section makes the whole category update
  unapplied: all category writes, media/SEO writes, hierarchy writes and revision bump roll back.
- Script split is internal. Do not expose one public `operationResults` item per section.

Atomic implementation requirement:

- Use one transactional boundary for all category update writes. Preferred shape:
  - `CategoryUpdateWorkflow.run()` does no database writes directly;
  - it calls one workflow step, for example `stepApplyCategoryUpdate`;
  - that step runs `CategoryUpdateAtomicScript`;
  - `CategoryUpdateAtomicScript.execute()` is `@Transactional()` and performs:
    1. load category scoped by current project;
    2. detect whether requested sections are present;
    3. perform revision compare-and-swap inside the transaction;
    4. for no-op updates, return the updated `{ id, revision }` and one successful
       `categoryUpdate` operation result without running section scripts;
    5. run requested section scripts or internal functions using transaction-aware repositories;
    6. aggregate section errors;
    7. if any section has user errors, signal rollback before commit and convert the rollback marker
       back to `userErrors` outside the transaction boundary;
    8. return `{ category: { id, revision }, changes, userErrors: [] }` only after all writes succeed.
- A plain `return { userErrors }` from a transactional function after writes is forbidden because it
  can commit partial changes. Use an explicit rollback-capable transaction helper or a typed
  rollback exception that is caught and mapped back to public `userErrors`.
- Alternative is acceptable only if CAS and all section writes are guaranteed to rollback together.
  Independent workflow steps for CAS and individual sections are forbidden because DBOS step
  boundaries cannot provide the required all-or-nothing rollback after a later section failure.
- The revision compare-and-swap must be project-scoped:

```ts
UPDATE catalog.category
SET revision = revision + 1, updated_at = now()
WHERE project_id = :projectId
  AND id = :categoryId
  AND (:expectedRevision IS NULL OR revision = :expectedRevision)
  AND deleted_at IS NULL
RETURNING id, revision;
```

- If no row is returned:
  - return `NOT_FOUND` when category does not exist in the current project or is deleted;
  - return `REVISION_CONFLICT` when it exists but expected revision did not match.
- Revision increments exactly once per successful unified category update, regardless of how many
  sections were requested.

Section script rules:

- Identity section:
  - validate duplicate handle scoped by `projectId` and excluding the current category;
  - update handle only when provided;
  - update translated name only when provided.
- Content section:
  - preserve existing translated content for omitted fields;
  - allow explicit `null` to clear nullable rich text fields.
- SEO section:
  - decode/receive UUID `ogImageId`;
  - support explicit `seo: null` only if schema keeps nullable SEO semantics for delete/clear;
  - otherwise reject unsupported clear behavior with stable `userErrors`.
- Status section:
  - `PUBLISHED` sets `publishedAt`;
  - `DRAFT` clears `publishedAt`;
  - do not reuse `ProductStatus`.
- Media section:
  - replace category media order from `fileIds`;
  - sync media back-references only if category media ownership is supported by current media
    service semantics.
- Hierarchy section:
  - validate parent exists in the same project;
  - reject self-parent and descendant-parent moves;
  - run only after `CategoryRepository.move()` descendant SQL targets `catalog.category`.
- Sort section:
  - validate `defaultSort` and `defaultSortDirection`;
  - update PLP default sort fields as part of the same transaction.

Product category assignment script:

- `ProductUpdateCategoriesScript` plugs into `ProductUpdateWorkflow.stepProductUpdate()` as the
  implementation for `ProductUpdateInput.categories`.
- It performs replace-set semantics:
  - reject duplicate category IDs;
  - reject missing categories;
  - require `primaryCategoryId` to be `null`/omitted or included in `categoryIds`;
  - insert missing links;
  - delete removed links;
  - preserve `lexoRank` for links that remain;
  - append new links at the end of each category;
  - set exactly one `isPrimary` row when `primaryCategoryId` is provided, otherwise clear all primary
    category rows for the product;
  - touch product if existing product update scripts rely on `updatedAt` for refresh semantics;
  - never increments product `revision`; `ProductUpdateWorkflow` owns revision.
- It returns changes compatible with `ProductUpdatedEvent`/product delta so search index sync can be
  triggered by existing product update handling.

Category-centric product scripts:

- `CategoryRemoveProductScript`:
  - validates category and product existence in current project;
  - validates the product is assigned to the category;
  - rejects removal when this category is primary for the product unless the public input later adds
    explicit `allowPrimaryFallback`;
  - removes the `product_category` row and therefore its rank;
  - returns affected product IDs for event/index handling.

Stable user error contract:

- Use deterministic codes and fields across scripts:
  - `NOT_FOUND`;
  - `DUPLICATE_HANDLE`;
  - `DUPLICATE_CATEGORY_ID`;
  - `DUPLICATE_PRODUCT_ID`;
  - `MISSING_CATEGORY`;
  - `MISSING_PRODUCT`;
  - `INVALID_PARENT`;
  - `CIRCULAR_REFERENCE`;
  - `REVISION_CONFLICT`;
  - `PRIMARY_CATEGORY_REQUIRED_IN_SET`;
  - `PRIMARY_CATEGORY_REMOVAL_NOT_ALLOWED`;
  - `INVALID_SORT`;
  - `INTERNAL_ERROR`.
- Field paths must point to public GraphQL input shape, for example
  `["operations", "hierarchy", "parentId"]` or `["input", "productIds", "2"]`, not internal DTO names.
- Do not throw for user/business validation. Return `userErrors`.
- Throw only for unexpected system failures.

Old path removal:

- `CatalogMutationResolver.categoryUpdate` must no longer call `CategoryUpdateScript` directly.
- The old monolithic `CategoryUpdateScript` may either be deleted or kept as a private helper only
  if it cannot be reached from public resolver paths and its behavior is wrapped by the unified
  atomic contract.
- `categoryUpdateSort` can remain only if it is part of the final public post-cutover contract.
  It must not be the only way to update category sort if unified `categoryUpdate.operations.sort`
  exists.

Workflow/script cutover acceptance criteria:

- `categoryUpdate` public resolver path is: GraphQL resolver -> `catalog.categoryUpdate` workflow ->
  one atomic category update step/script.
- Empty update returns updated category payload, increments revision after successful CAS, returns
  one successful `CATEGORY_UPDATE` operation result, and emits no events.
- Revision conflict returns no `operationResults`.
- Successful update with at least one requested section returns one `CATEGORY_UPDATE` result with
  `applied: true`.
- Section validation failure returns one `CATEGORY_UPDATE` result with `applied: false`, duplicated
  aggregate `userErrors`, no category resolver payload, no event, no revision bump and no partial
  writes.
- Successful category update emits `productUpdated` fan-out after commit when changed category fields
  affect product search/index/cache data. If `categoryUpdated` is retained for category-domain
  consumers, it is emitted after commit and is not the product index refresh path.
- Product category replace-set is implemented through `ProductUpdateWorkflow` and does not bump
  product revision independently.
- Category remove scripts return affected product IDs so event/index cutover can handle search
  refresh without extra discovery queries.

### 4. Resolver And Loader Cutover

Resolver/loader cutover должен привести GraphQL boundary к финальному contract из пунктов 1-3.
Resolvers не должны содержать business logic, не должны возвращать raw records вместо resolver
instances и не должны создавать N+1 queries для category assignment metadata.

Files to update:

- `src/resolvers/admin/QueryResolver.ts`;
- `src/resolvers/admin/MutationResolver.ts`;
- `src/resolvers/admin/CategoryResolver.ts`;
- `src/resolvers/admin/ProductResolver.ts`;
- `src/resolvers/admin/CategoryConnectionResolver.ts`;
- `src/resolvers/admin/CategoryProductConnectionResolver.ts`;
- `src/resolvers/admin/connection/BaseConnectionResolver.ts` only if a reusable metadata edge
  contract is intentionally introduced;
- `src/loaders/CategoryLoader.ts`;
- `src/loaders/Loader.ts`;
- generated imports/types in resolver files after point 5 regenerates GraphQL types and Zod schemas.

Global ID boundary rules:

- Decode all incoming GraphQL global IDs in resolvers before calling workflows/scripts/repositories:
  - `category(id)`;
  - `categories(where.parentId)`;
  - `categoryUpdate(categoryId)`;
  - `categoryUpdate.operations.hierarchy.parentId`;
  - `categoryUpdate.operations.media.fileIds`;
  - `categoryUpdate.operations.seo.ogImageId`;
  - `productUpdate(productId)`;
  - `productUpdate.operations.categories.categoryIds`;
  - `productUpdate.operations.categories.primaryCategoryId`;
  - `categoryAddProduct`, `categoryMoveProduct`, `categoryRemoveProduct`,
    `categoryRebalance`.
- Encode all entity IDs returned by resolvers at GraphQL boundary:
  - `Category.id` as `GlobalIdEntity.Category`;
  - `Product.id` as `GlobalIdEntity.Product`;
  - media `File.id` references as `GlobalIdEntity.File`, unless the existing federation File
    reference contract explicitly requires a raw UUID.
- Invalid user-provided IDs should be returned as `userErrors` for mutations with field paths that
  match public input. Query fields may return `null` for invalid `id`, matching current
  nullable root query behavior.

Query resolver cutover:

- `CatalogQueryResolver.category(id)`:
  - decode `GlobalIdEntity.Category`;
  - return `null` when decoding fails or category is not found;
  - return `new CategoryResolver(categoryId, this.$ctx)` when found.
- `CatalogQueryResolver.categories(args)`:
  - normalize GraphQL filter names before repository access;
  - decode `where.parentId` if it is a non-null ID;
  - preserve `where.parentId === null` as root category filter;
  - map `isPublished` to `publishedAt` filter;
  - map `CategoryOrderByInput` enum values to drizzle-query field names;
  - return `new CategoryConnectionResolver(normalizedArgs, this.$ctx)`.
- Do not pass GraphQL enum names, raw global IDs or presentation-only shape into repository layer.

Mutation resolver cutover:

- `CatalogMutationResolver.categoryUpdate`:
  - replace old `args: { input: CategoryUpdateInput }` resolver shape with generated
    `CatalogMutationCategoryUpdateArgs`;
  - decode `categoryId` and nested IDs;
  - map GraphQL enum `CategoryStatus` to internal `"published" | "draft"`;
  - call broker workflow `catalog.categoryUpdate`;
  - map internal operation result `"categoryUpdate"` to GraphQL enum `CATEGORY_UPDATE`;
  - return `category: new CategoryResolver(result.category.id, this.$ctx)` only when workflow
    returns a successful category payload;
  - return updated `category` resolver on empty no-op update after successful CAS;
  - return `category: null` on revision conflict or section failure.
- `CatalogMutationResolver.productUpdate`:
  - map `operations.categories` into `ProductUpdateParams.categories`;
  - decode all category IDs and optional primary category ID before workflow call;
  - do not call `ProductUpdateCategoriesScript` directly from resolver;
  - preserve existing product/variant operation mapping.
- `categoryRemoveProduct`:
  - decode all IDs before script call;
  - call `CategoryRemoveProductScript`;
  - return `category` resolver on success and `userErrors` on validation failure;
  - never throw for invalid user input IDs.
- Existing `categoryAddProduct`, `categoryMoveProduct`, `categoryRebalance` stay script-backed only
  if they remain in the final public contract and return consistent `userErrors`.
- `categoryUpdateSort` must either be removed from schema/resolver or kept as final public contract;
  if kept, it must not conflict with unified `categoryUpdate.operations.sort`.

Category resolver cutover:

- Add `revision()` field resolver that returns `category.revision`.
- Keep `products(args)` returning `CategoryProductConnectionResolver`.
- Ensure `media()` returns File references with the correct GraphQL boundary ID shape.
- Keep hierarchy fields (`parent`, `children`, `ancestors`) resolver-instance based and DataLoader
  backed.
- `CategoryProductEdge` must not expose `isPrimary` or `rank`; product-category assignment metadata
  is resolved through `Product.primaryCategory` and `Product.categoryAssignments`.

Product resolver cutover:

- Add `primaryCategory()`:
  - load product-category links through a DataLoader;
  - find `isPrimary === true`;
  - return `new CategoryResolver(primary.categoryId, this.$ctx)` or `null`.
- Add `categoryAssignments()`:
  - load product-category links through the same DataLoader;
  - return objects shaped as `{ category, isPrimary, rank }`;
  - `category` is a `CategoryResolver`;
  - `rank` is `product_category.lexo_rank`;
  - order deterministically. Preferred order: primary assignment first, then category handle/name
    order if already loaded without extra N+1, otherwise category ID.
- `Product.categories`:
  - if schema keeps it, implement it as convenience display field over the same product-category
    links DataLoader;
  - it must not be the only category assignment API;
  - it must not query `productCategoryIds` through an old ids-only loader if metadata loaders are
    available;
  - if schema removes it, remove resolver method and generated resolver references in the same
    cutover.

Loader cutover:

- Replace or supplement current ids-only `productCategoryIds` loader with metadata-aware loaders:

```ts
productCategoryLinksByProductId: DataLoader<string, ProductCategory[]>;
productCategoryLinksByProductIds(productIds: readonly string[]): Promise<ProductCategory[]>;
```

- Loader result must preserve all row metadata needed by resolvers:
  - `productId`;
  - `categoryId`;
  - `isPrimary`;
  - `lexoRank`.
- Batch function calls one repository method for all product IDs and groups results by input
  product ID.
- Register the loader in `src/loaders/Loader.ts`.
- `Product.primaryCategory`, `Product.categoryAssignments` and optional `Product.categories` must
  all use the metadata-aware loader.
- Keep existing `category`, `categoryTranslation`, `categoryMedia`, `categorySeo`,
  `categoryChildrenIds`, `categoryAncestorIds` and `categoryProductsCount` loaders unless their
  contracts are intentionally changed.

Category product connection resolver cutover:

- Keep `CategoryProductConnectionResolver` on the standard base connection edge shape:
  `{ cursor, node }`.
- Do not widen `BaseConnectionResolver.EdgeData` for product-category metadata.
- `pageInfo()` and `totalCount()` should continue to use preloaded connection data.
- `CategoryProductConnectionResolver.$preload()` must return standard repository edges from
  `getCategoryProductsConnection`.

Generated type/Zod integration:

- After point 5 codegen, resolver imports must use generated args/types for:
  - `CatalogQueryCategoriesArgs`;
  - `CatalogMutationCategoryUpdateArgs`;
  - `CatalogMutationProductUpdateArgs`;
  - `CatalogMutationCategoryRemoveProductArgs`.
- Add `@ZodResolver(...)` for new script-backed mutations after generated schemas exist.
- Do not hand-maintain stale inline TypeScript input shapes for category mutations once generated
  types are available.

Resolver/loader acceptance criteria:

- No public resolver path accepts the old `categoryUpdate(input: ...)` shape.
- All mutation IDs are decoded before workflow/script calls.
- Query resolver passes normalized repository input, not raw GraphQL category filters.
- `categoryUpdate` resolver calls workflow only; it does not call category update scripts directly.
- `productUpdate.categories` reaches `ProductUpdateWorkflow`.
- `Product.primaryCategory`, `Product.categoryAssignments` and optional `Product.categories` share
  one batched product-category links loader.
- `CategoryProductEdge` remains `{ cursor, node }` and does not expose assignment metadata.
- `Product.categories` is either removed everywhere or implemented as a convenience field over the
  new assignment source.
- Resolvers return resolver instances for entities and `userErrors` for user/business validation.

### 5. Generated Artifacts Cutover

Generated artifacts cutover должен синхронизировать source GraphQL schema, resolver TypeScript
types, generated Zod validators, exported subgraph schema, composed federation schema и все in-repo
GraphQL consumers. Нельзя оставлять state, где source schema новая, а generated files описывают
старый `categoryUpdate(input: ...)`.

Generation order:

1. После schema/model/resolver source changes запустить project-approved codegen для catalog service:

```sh
yarn shopana codegen --service catalog
```

Если локальный workflow использует npm wrapper, допустимо:

```sh
npm run codegen -- --service catalog
```

2. После service codegen запустить schema export/composition через project-approved schema command:

```sh
yarn shopana schema --action build
```

Если локальный workflow использует npm wrapper, допустимо:

```sh
npm run shopana -- schema --action build
```

3. Если in-repo admin/e2e GraphQL documents have generated client types, regenerate them through the
   existing project codegen command for that package. Do not hand-edit generated client artifacts.

Generated files that must be updated:

- `services/catalog/src/resolvers/admin/generated/types.ts`;
- `services/catalog/src/resolvers/admin/generated/schemas.ts`;
- exported catalog admin subgraph schema under the repo's generated schema output;
- composed admin supergraph/federation artifact if schema build writes it in this workspace;
- any generated GraphQL document/client files that reference catalog admin mutations/queries.

`types.ts` acceptance criteria:

- `CatalogMutationCategoryUpdateArgs` has:

```ts
categoryId: Scalars["ID"]["input"];
operations: CategoryUpdateInput;
expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
```

- `CatalogMutationCategoryUpdateArgs` no longer has `input`.
- `CategoryUpdateInput` no longer has `id`.
- `CategoryUpdatePayload` includes `operationResults`.
- `CategoryOperationResult` and `CategoryUpdateOperationType` are generated.
- `CatalogQueryCategoriesArgs` includes `where?: CategoryWhereInput` and
  `orderBy?: Array<CategoryOrderByInput>`.
- `ProductUpdateInput` includes `categories?: ProductCategoriesInput`.
- `Product` generated type/resolver map includes `primaryCategory` and `categoryAssignments`.
- `CategoryProductEdge` generated type/resolver map does not include `isPrimary` or `rank`.
- Generated mutation resolver map includes `categoryRemoveProduct`.

`schemas.ts` acceptance criteria:

- `CategoryUpdateInputSchema()` validates the new section-based input:
  - `handle`;
  - `name`;
  - `content`;
  - `seo`;
  - `status`;
  - `media`;
  - `hierarchy`;
  - `sort`;
  - no `id`.
- New schemas exist:
  - `CategoryContentInputSchema`;
  - `CategoryMediaInputSchema`;
  - `CategoryHierarchyInputSchema`;
  - `CategorySortInputSchema`;
  - `ProductCategoriesInputSchema`;
  - `CategoryRemoveProductInputSchema`.
- `ProductUpdateInputSchema()` includes `categories`.
- No generated Zod schema accepts the old `categoryUpdate(input: CategoryUpdateInput!)` shape.

Source/generated drift checks:

Use grep-style checks, not `test` or `tsc`, unless project instructions change:

```sh
rg 'categoryUpdate\\(input:' services/catalog/src services/catalog/schema schema
rg 'CatalogMutationCategoryUpdateArgs = \\{\\n\\s*input:' services/catalog/src/resolvers/admin/generated/types.ts
rg 'CategoryUpdateInput = \\{[^}]*id:' services/catalog/src/resolvers/admin/generated/types.ts
rg 'CategoryUpdateInputSchema\\(\\).*id:' services/catalog/src/resolvers/admin/generated/schemas.ts
rg 'categoryUpdateV2|@deprecated' services/catalog/src/api/graphql-admin/schema services/catalog/src/resolvers/admin
```

All checks above must return no matches for old/deprecated category update contract.

In-repo GraphQL consumer cutover:

- Search and update all checked-in GraphQL documents/scripts that call old category contracts:
  - `categoryUpdate(input: ...)`;
  - old `CategoryUpdateInput.id`;
  - `categoryUpdateSort` if it is removed from final schema;
  - product category assignment flows that read only `Product.categories` when metadata is required.
- Update documents to use:
  - `categoryUpdate(categoryId:, operations:, expectedRevision:)`;
  - `category.revision`;
  - `Product.primaryCategory`;
  - `Product.categoryAssignments`;
  - `productUpdate.operations.categories`.
- Do not update generated GraphQL client outputs by hand. Update source documents and regenerate.

Federation/schema acceptance criteria:

- Exported catalog admin subgraph schema contains:
  - `Category.revision`;
  - final `CatalogQuery.categories(where, orderBy)`;
  - final `CatalogMutation.categoryUpdate(categoryId, operations, expectedRevision)`;
  - `Product.primaryCategory`;
  - `Product.categoryAssignments`;
  - `ProductCategoriesInput`;
  - `categoryRemoveProduct`.
- Exported/composed schemas do not contain:
  - `categoryUpdate(input: CategoryUpdateInput!)`;
  - `categoryUpdateV2`;
  - deprecated compatibility aliases for category update.
- Federation composition must include new `Product` fields without ownership conflicts. Since catalog
  owns `Product`, these fields should be defined in catalog's product schema, not as extension fields
  from another service.

Generated artifacts cutover acceptance criteria:

- Source schema, generated resolver types, generated Zod schemas, exported subgraph schema and
  composed federation schema all describe the same final category/product-category API.
- Resolver code compiles against generated args/types without inline stale input shapes for changed
  category mutations.
- No generated or checked-in GraphQL source still exposes the old `categoryUpdate(input: ...)`
  contract.
- No hand-edited generated artifact is required to make the working tree consistent.

### 6. Event And Index Cutover

Event/index cutover должен гарантировать, что любые изменения category assignment или denormalized
category fields обновляют product search index. Сейчас product search index читает
`product_category` links и category handles, поэтому silent category/category-link writes создают
stale index.

Files to update:

- `packages/events/src/types.ts`;
- `services/catalog/src/workflows/ProductUpdateWorkflow.ts`;
- `services/catalog/src/workflows/CategoryUpdateWorkflow.ts`;
- `services/catalog/src/scripts/product/ProductUpdateCategoriesScript.ts`;
- `services/catalog/src/scripts/category/CategoryRemoveProductScript.ts`;
- `services/catalog/src/scripts/search-index/SyncProductIndexScript.ts` only if product/category
  index payload shape changes;
- `services/catalog/src/handlers/index.ts` only if existing `productUpdated` handler payload handling
  needs category delta support;
- repository methods for affected product discovery from category/category links.

Product category assignment event contract:

- `ProductUpdateCategoriesScript` must return category assignment changes to
  `ProductUpdateWorkflow`, for example:

```ts
categories: {
  categoryIds: string[];
  primaryCategoryId: string | null;
}
```

- Extend `ProductFieldChanges` in `packages/events/src/types.ts` with compatible category delta:

```ts
categories?: {
  categoryIds: string[];
  primaryCategoryId: string | null;
};
```

- `ProductUpdateWorkflow` emits existing `productUpdated` only after workflow update succeeds.
- `ProductUpdateCategoriesScript` must not emit events by itself.
- Existing `CatalogEventHandlers.handleProductUpdated` already runs `SyncProductIndexScript`; keep
  product category assignment on that path so search index refresh stays centralized.

Category update event contract:

- Do not add `categoryUpdated` as the product-index refresh path in this cutover.
- `CategoryUpdateWorkflow` must discover affected product IDs and emit existing `productUpdated`
  events after atomic update commit succeeds when changed fields can affect product denormalized
  search data:
  - `handle`;
  - translated `name` if product search stores searchable category labels;
  - `status` if product search or product visibility depends on category publication;
  - hierarchy if product search stores category path/breadcrumbs.
- Empty update, revision conflict and section validation failure must not emit `productUpdated`.
- For each affected product, the emitted `productUpdated` payload should include the current category
  delta under `ProductFieldChanges.categories`; `SyncProductIndexScript` reads committed
  `product_category` and category rows, so the event does not need to carry full denormalized search
  state.
- If `categoryUpdated` is kept for category-domain consumers, it is optional, emitted only after
  commit, and must not replace `productUpdated` for product search freshness.

Category-centric product management events/indexing:

- `CategoryRemoveProductScript` must return affected product IDs.
- After successful script commit, resolver/workflow layer emits `productUpdated` for each affected
  product with a category delta.
- Do not run or schedule `SyncProductIndexScript` directly from category/category-link writes;
  `CatalogEventHandlers.handleProductUpdated` owns product index refresh.
- Existing category-centric operations retained in the final API must use the same rule:
  - `categoryAddProduct`;
  - `categoryMoveProduct`;
  - `categoryRebalance` if rank/index semantics affect any indexed data;
  - `categoryRemoveProduct`.

Affected product discovery:

- Add repository methods as needed:

```ts
getProductIdsByCategoryId(categoryId: string): Promise<string[]>;
getProductIdsByCategoryIds(categoryIds: readonly string[]): Promise<Map<string, string[]>>;
```

- Discovery queries must be scoped by `projectId`.
- For category handle/name/status/hierarchy changes, compute affected products from committed
  `product_category` rows for the changed category.
- For category product add/remove/reorder, use affected IDs returned by the scripts:
  - removed product IDs;
  - added product IDs;
  - products whose rank/order changed only if rank is indexed or cache keys depend on rank.

After-commit scheduling rules:

- `productUpdated` emission happens after successful commit of the write transaction.
- If a workflow owns the write, schedule follow-up event/index work in a later workflow step after
  the atomic write step returns success.
- If a script is resolver-backed and transactional, do not emit from inside the transactional script.
  Return affected IDs to resolver/service layer and schedule follow-up work after script success.
- Follow-up index sync failures should be retryable and must not roll back the already committed
  category/category-link write. Use existing `productUpdated` handler retry behavior or a retryable
  workflow step.

Search-index acceptance criteria:

- Product category assignment through `productUpdate.operations.categories` triggers existing
  `productUpdated` handling and re-runs `SyncProductIndexScript` for the product.
- `categoryAddProduct` and `categoryRemoveProduct` refresh product search index for every affected
  product; retained reorder operations do the same when rank/order affects indexed data.
- Category `handle` changes refresh product search index for all products assigned to that category,
  because `SyncProductIndexScript` writes `categoryHandles`.
- Category translated `name`/status/hierarchy changes refresh affected products only if those fields
  are denormalized into product search, visibility, cache keys or category-aware product documents.
- No retained category-centric operation has add/move-only event behavior that ignores remove.
- No event/index side effect is emitted for failed category updates or rolled-back writes.
- Event payload type definitions, workflow emitted payloads and handlers agree on field names.
- The final implementation has one documented path for category-link index refresh:
  `productUpdated` fan-out. Direct `SyncProductIndexScript` scheduling is not part of the final
  category/category-link write path.

### 7. Verification

Не использовать `test` или `tsc` для этого проекта, если инструкции не изменятся.

Использовать build только когда нужно проверить новую версию кода.

Manual/API verification checklist:

- Query categories with pagination, search, filters и sorting.
- Query category details with hierarchy, media, SEO и products.
- Create category with parent, media, SEO и publish flag.
- Update category sections with expected revision.
- Verify empty `categoryUpdate.operations` copies product update no-op behavior: it increments
  `revision` after successful CAS, returns updated category payload, returns one successful
  `CATEGORY_UPDATE` result with empty `errors`, returns empty `userErrors`, and emits no events.
- Verify revision conflict returns `REVISION_CONFLICT`.
- Verify validation failure in one category update section does not apply any other requested section,
  does not increment `revision`, and does not emit `productUpdated`/`categoryUpdated`.
- Move category through unified hierarchy update and verify descendant `path`/`depth` updates happen
  in `catalog.category`.
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
- Category name search/sort по translations не входит в обязательный table-based cutover. Если он
  добавляется позже, реализация не должна вводить dedicated category list view и не должна ломать
  cursor pagination дублированием category rows.
