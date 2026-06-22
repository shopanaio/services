# Category Details Modal API Integration

## Goal

Перевести `CategoryModal` и `CategoryDetailsCard` с mock data на admin GraphQL API и добавить секционные модалки редактирования категории.

Интеграция должна следовать `knowledge/vault/patterns/admin-graphql-layer.md`: компоненты получают API-shaped объекты из `@/graphql/types`, hooks владеют Apollo-запросами и мутациями, mappers конвертируют только form state в GraphQL inputs.

## Current State

- `CategoryModal` показывает `mockCategory` и `mockCategoryDetailsData`.
- `CategoryDetailsCard` принимает `ICategoryDetail`, где поля не совпадают с API (`title/slug/status/gallery` вместо `name/handle/isPublished/media`).
- `categories/graphql` уже содержит list/create операции.
- Backend API уже поддерживает detail fields и section-based update через `CategoryUpdateInput`.

## Target File Structure

```text
admin/src/domains/inventory/categories/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
  hooks/
    use-category.ts
    use-update-category.ts
    use-category-products.ts
    use-add-category-product.ts
    use-remove-category-product.ts
    use-move-category-product.ts
  mappers/
    category-content.mapper.ts
    category-identity.mapper.ts
    category-hierarchy.mapper.ts
    category-media.mapper.ts
    category-seo.mapper.ts
    category-sort.mapper.ts
    category-status.mapper.ts
    category-errors.mapper.ts
  modals/
    category-modal/
      category-modal.tsx
      API_INTEGRATION_DESIGN.md
    edit-category-identity-modal/
    edit-category-content-modal/
    edit-category-seo-modal/
    edit-category-media-modal/
    edit-category-hierarchy-modal/
    edit-category-sort-modal/
    edit-category-status-modal/
    assign-category-products-modal/
```

## GraphQL Operations

### Fragments

Add focused fragments instead of expanding the list fragment:

```graphql
fragment CategoryDetailsFields on Category {
  id
  name
  handle
  isPublished
  publishedAt
  createdAt
  updatedAt
  deletedAt
  revision
  depth
  path
  description
  excerpt
  defaultSort
  defaultSortDirection
  productsCount
  seo {
    seoTitle
    seoDescription
    ogTitle
    ogDescription
    ogImage {
      id
      url
      originalName
      mimeType
      altText
    }
  }
  parent {
    id
    name
    handle
    path
  }
  ancestors {
    id
    name
    handle
    path
  }
  children {
    id
    name
    handle
    isPublished
    productsCount
    media {
      sortIndex
      file {
        id
        url
        originalName
        mimeType
        altText
      }
    }
  }
  media {
    sortIndex
    file {
      id
      url
      originalName
      mimeType
      altText
    }
  }
}
```

Use a separate product fragment for the modal product table:

```graphql
fragment CategoryProductListItemFields on Product {
  id
  title
  handle
  isPublished
  media {
    sortIndex
    file {
      id
      url
      originalName
      mimeType
      altText
    }
  }
}
```

If the current product schema does not expose all displayed columns, the UI should hide those columns instead of creating mock-only fields.

### Queries

```graphql
query CategoryDetails($id: ID!) {
  catalogQuery {
    category(id: $id) {
      ...CategoryDetailsFields
    }
  }
}
```

```graphql
query CategoryProducts(
  $id: ID!
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: CategoryProductWhereInput
  $orderBy: [ProductOrderByInput!]
) {
  catalogQuery {
    category(id: $id) {
      id
      products(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            ...CategoryProductListItemFields
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  }
}
```

### Mutations

All edits go through one backend mutation with a section-specific input mapper:

```graphql
mutation CategoryUpdate(
  $categoryId: ID!
  $expectedRevision: Int
  $operations: CategoryUpdateInput
) {
  catalogMutation {
    categoryUpdate(
      categoryId: $categoryId
      expectedRevision: $expectedRevision
      operations: $operations
    ) {
      category {
        ...CategoryDetailsFields
      }
      operationResults {
        type
        applied
        errors {
          ...UserErrorFields
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Product assignment and ordering use dedicated mutations:

```graphql
mutation CategoryAddProduct($input: CategoryAddProductInput!) {
  catalogMutation {
    categoryAddProduct(input: $input) {
      category {
        id
        productsCount
        updatedAt
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Equivalent operations are needed for `categoryRemoveProduct`, `categoryMoveProduct`, and `categoryRebalance`.

## Hook Contracts

`useCategory(id)`:

```ts
{
  category: ApiCategory | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

`useUpdateCategory()`:

```ts
{
  updateCategory: (
    categoryId: string,
    operations: ApiCategoryUpdateInput,
    expectedRevision?: number,
  ) => Promise<{
    category: ApiCategory | null;
    userErrors: ApiGenericUserError[];
  }>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

`useCategoryProducts(categoryId, pagination)` returns the product connection separately from category details, so the details modal can load fast and the products tab/table can paginate independently.

## Component Data Contract

`CategoryDetailsCard` should accept API data directly:

```ts
interface CategoryDetailsCardProps {
  category: ApiCategory;
  onRefetch?: () => Promise<unknown>;
}
```

Sections derive display values from API fields at render boundaries:

- status badge: `category.isPublished ? "Published" : "Draft"`;
- slug/path display: `category.handle` and `category.path`;
- hero image/gallery: sorted `category.media`;
- SEO: `category.seo?.seoTitle`, `category.seo?.seoDescription`;
- hierarchy: `category.ancestors`, `category.parent`, `category.children`;
- products count: `category.productsCount`.

No `ICategoryDetail` API-output view model should remain.

## Modal Flow

```text
Category row click
  -> useCategoryModal().push({ categoryId })
  -> CategoryModal
      -> useCategory(categoryId)
      -> loading skeleton
      -> CategoryDetailsCard(category)
          -> edit section button
          -> edit modal
              -> local form state
              -> mapper builds CategoryUpdateInput
              -> useUpdateCategory
              -> close on success
              -> details query refresh or cache update
```

Use `refetchQueries` for first implementation:

- `CategoryDetails`
- `Categories` list if identity/status/media/hierarchy changed
- `CategoryProducts` when product assignment/order changed

Move to `cache.modify` only after pagination cache policy is stable.

## Edit Modals

### 1. Identity

Edits `name` and `handle`.

Mapper output:

```ts
{
  name: values.name.trim(),
  handle: values.handle.trim()
}
```

Wireframe:

```text
┌─ Edit category identity ───────────────────────────┐
│ Name                                                │
│ [ Audio Equipment                                ]  │
│                                                     │
│ Handle                                              │
│ [ audio-equipment                               ]   │
│ /categories/audio-equipment                         │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 2. Content

Edits `description` and `excerpt`.

Mapper output:

```ts
{
  content: {
    description: toRichTextInput(values.description),
    excerpt: toRichTextInput(values.excerpt)
  }
}
```

Wireframe:

```text
┌─ Edit category content ────────────────────────────┐
│ [Description] [Excerpt]                            │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Rich text editor                                │ │
│ │                                                 │ │
│ │ Browse our collection of premium audio...       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 3. SEO

Edits `seo.seoTitle` and `seo.seoDescription`.

Mapper output:

```ts
{
  seo: {
    seoTitle: emptyToNull(values.title),
    seoDescription: emptyToNull(values.description)
  }
}
```

Wireframe:

```text
┌─ Edit SEO ─────────────────────────────────────────┐
│ SEO title                                           │
│ [ Audio Equipment - Store                       ]   │
│ 23 / 70                                             │
│                                                     │
│ SEO description                                     │
│ [ Browse premium headphones, speakers...        ]   │
│ 44 / 160                                            │
│                                                     │
│ Preview                                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Audio Equipment - Store                         │ │
│ │ shopana.store/categories/audio-equipment        │ │
│ │ Browse premium headphones, speakers...          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 4. Media

Replaces category media with ordered file IDs.

Mapper output:

```ts
{
  media: {
    fileIds: values.files.map((file) => file.id)
  }
}
```

Wireframe:

```text
┌─ Edit category media ──────────────────────────────┐
│ ┌──────────────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ Featured     │ │  2   │ │  3   │ │  +   │       │
│ │ image        │ │      │ │      │ │ Add  │       │
│ └──────────────┘ └──────┘ └──────┘ └──────┘       │
│ Drag to reorder. First image is used as featured.  │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 5. Hierarchy

Moves category under a new parent or to root. The picker must exclude the current category and descendants to avoid cycles.

Mapper output:

```ts
{
  hierarchy: {
    parentId: values.parentId
  }
}
```

Wireframe:

```text
┌─ Move category ────────────────────────────────────┐
│ Current path                                        │
│ Home / Electronics / Audio                          │
│                                                     │
│ New parent                                          │
│ [ Search categories...                         ]    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○ Root                                          │ │
│ │ ○ Electronics                                  │ │
│ │   ○ Computers                                  │ │
│ │   ○ Cameras                                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                         [Cancel] [Move category]    │
└─────────────────────────────────────────────────────┘
```

### 6. Sort Preferences

Edits default PLP sorting.

Mapper output:

```ts
{
  sort: {
    defaultSort: values.defaultSort,
    defaultSortDirection: values.defaultSortDirection
  }
}
```

Wireframe:

```text
┌─ Edit product sort ────────────────────────────────┐
│ Default sort                                        │
│ [ Created at                                  v ]   │
│                                                     │
│ Direction                                           │
│ [ Ascending ] [ Descending ]                        │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 7. Status

Publishes or unpublishes the category.

Mapper output:

```ts
{
  status: values.isPublished ? CategoryStatus.Published : CategoryStatus.Draft
}
```

Wireframe:

```text
┌─ Change category status ───────────────────────────┐
│ Status                                              │
│ [ Draft ] [ Published ]                             │
│                                                     │
│ Published categories are visible to storefront      │
│ navigation and category pages.                      │
│                                                     │
│                         [Cancel] [Save changes]     │
└─────────────────────────────────────────────────────┘
```

### 8. Assign Products

Uses product picker plus category product mutations. Product ordering remains in the products section, not in the category detail query.

Wireframe:

```text
┌─ Assign products ──────────────────────────────────┐
│ [ Search products...                          ]     │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ [img] Sony WH-1000XM5        Active          │ │
│ │ ✓ [img] AirPods Pro            Active          │ │
│ │ ○ [img] Bose QC45              Draft           │ │
│ │ ○ [img] JBL Flip 6             Active          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Selected: 2                                         │
│                         [Cancel] [Apply changes]    │
└─────────────────────────────────────────────────────┘
```

## Category Details Modal Wireframe

```text
┌─ Category ───────────────────────────────────────────────────────────────┐
│                                                                          │
│ ┌─ Header ─────────────────────────────────────────────────────────────┐ │
│ │ [Published]  Updated Jun 22, 2026               [Copy] [View] [More] │ │
│ │ Audio Equipment                                                       │ │
│ │ /electronics/audio-equipment      ID: cat_...      Revision: 12       │ │
│ │ [Edit identity]                                      [Change status]  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Content ────────────────────────────────────────────────────────────┐ │
│ │ [Description] [Excerpt]                                      [Edit]  │ │
│ │ Browse our collection of premium audio equipment...                  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Hierarchy ──────────────────────────────────────────────────────────┐ │
│ │ Home / Electronics / Audio                                  [Move]   │ │
│ │ Parent: Electronics                                                 │ │
│ │ Children (4): Headphones, Speakers, Amplifiers, Cables              │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Media ──────────────────────────────────────────────────────────────┐ │
│ │ [featured image] [2] [3] [4]                                [Edit]  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Products ───────────────────────────────────────────────────────────┐ │
│ │ Products (128)              [Search] [Sort]       [Assign products] │ │
│ │ Product                 Handle                    Status            │ │
│ │ [img] Sony WH-1000XM5   sony-wh-1000xm5          Active            │ │
│ │ [img] AirPods Pro       airpods-pro              Active            │ │
│ │ Showing 1-10 of 128                         [Prev] [Next]           │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ SEO ────────────────────────────────────────────────────────────────┐ │
│ │ Title: Audio Equipment - Store                               [Edit]  │ │
│ │ Description: Browse premium headphones, speakers...                  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Implementation Order

1. Add `CategoryDetailsFields`, `CATEGORY_DETAILS_QUERY`, `CATEGORY_PRODUCTS_QUERY`, `CATEGORY_UPDATE_MUTATION`, and product assignment mutations.
2. Add operation types derived from `@/graphql/types`; do not re-export generated types.
3. Add `useCategory`, `useUpdateCategory`, and category product hooks.
4. Replace `CategoryModal` mock loading with `useCategory(categoryId)`.
5. Change `CategoryDetailsCard` and sections to accept `ApiCategory`.
6. Add section mappers and edit modals one by one: identity, status, content, SEO, media, hierarchy, sort, products.
7. Remove category detail mocks after all sections read API fields directly.

## Edge Cases

- Show not-found state when `category(id)` returns null.
- Preserve unsaved form state only inside the active edit modal.
- Disable submit while mutation is loading.
- Map `userErrors.field` through `category-errors.mapper.ts`.
- Refetch details after successful hierarchy/media/status updates.
- Exclude current category and descendants from hierarchy parent picker.
- If a section fails to save, keep the modal open and render field-level errors.
- If product assignment partially fails, show `userErrors` and refetch `CategoryProducts` before closing.
