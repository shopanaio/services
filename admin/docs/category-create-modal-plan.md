# План: Create Category Modal UI + API Integration

## Цель

Сделать модалку создания категории по дизайну существующей модалки создания продукта.

Ключевое правило: **не проектировать новую категорийную модалку**. Нужно взять текущий паттерн `CreateProductModal` и заменить продуктовые поля на категорийные там, где это прямо необходимо.

Источник дизайна:

- `admin/src/domains/inventory/products/modals/create-product-modal/create-product-modal.tsx`
- `admin/src/domains/inventory/products/modals/create-product-modal/general-section.tsx`
- `admin/src/domains/inventory/products/modals/create-product-modal/media-section.tsx`

## Design Lock

В первой версии модалки должны быть только секции, которые соответствуют create product modal:

```text
CreateProductModal
├── General
├── Media
└── Variants

CreateCategoryModal
├── General
└── Media
```

`Variants` не переносится, потому что у категории нет вариаций. Вместо него нельзя добавлять выдуманную секцию `Category settings`.

Запрещено добавлять в create category modal:

- publish/status switch;
- подсказки про draft/publish;
- отдельную `SEO` секцию;
- отдельную `Preview` секцию;
- отдельную `Category settings` секцию;
- instructional copy, которого нет в product create modal;
- дополнительные controls только потому, что API их поддерживает.

Если поле не имеет прямого аналога в create product modal, оно не попадает в основной create UI.

## Product To Category Mapping

| Product create | Category create |
|---|---|
| `New Product` | `New Category` |
| `Title` | `Name` |
| `Handle` | `Handle` |
| `Description` | `Description` |
| `Media` | `Media` |
| `Variants` | Omitted |

## Main Wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│  ×  New Category                                      [Create]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ General ───────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  Name                          Handle (?)                  │ │
│  │  [Summer essentials_____]      [/│summer-essentials____]   │ │
│  │                                                            │ │
│  │  Description                                               │ │
│  │  [Rich text editor_____________________________________]   │ │
│  │  [_____________________________________________________]   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Media ─────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐               │ │
│  │  │              Upload images              │               │ │
│  │  │  Drag and drop images here or click.    │               │ │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

This must visually match product create:

- same `ModalLayout`;
- same `ModalHeader`;
- same body container `display: flex`, `flexDirection: column`, `gap: 16`;
- same `Paper` and `PaperHeader`;
- same two-column first row in `General`;
- same handle input with `/` addon;
- same `Editor` treatment for description;
- same `EntityMediaGallery` for media.

## General Section

Near-copy of product `GeneralSection`, with field names changed.

```text
┌─────────────────────────────────────────────────────────────────┐
│ General                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Name                            Handle (?)                      │
│ ┌────────────────────────┐      ┌────────────────────────────┐ │
│ │ Summer essentials      │      │ / │ summer-essentials      │ │
│ └────────────────────────┘      └────────────────────────────┘ │
│                                                                 │
│ Description                                                     │
│ ┌─────────────────────────────────────────────────────────┐     │
│ │ Rich text editor                                        │     │
│ └─────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

Fields:

| Field | Control | Required | Product equivalent |
|---|---|---|---|
| `name` | `Input` | Yes | `title` |
| `handle` | `Input` with `/` addon | Yes | `handle` |
| `description` | `Editor` | No | `description` |

Handle behavior mirrors product create:

```ts
const [isHandleManual, setIsHandleManual] = useState(false);
const name = watch("name");

useEffect(() => {
  if (!isHandleManual && name) {
    setValue("handle", slugify(name));
  }
}, [name, isHandleManual, setValue]);
```

Tooltip:

```text
URL-friendly identifier. Auto-generated from name if left empty.
```

## Media Section

Exact same pattern as product create media.

```tsx
<EntityMediaGallery
  value={media}
  onChange={handleChange}
  title="Media"
  showViewSwitcher
  accept="image/*"
  hasFeatured
/>
```

Mapping:

- Form stores uploaded `ApiFile[]`.
- Submit sends `mediaFileIds: media.map((file) => file.id)`.
- Empty media omits `mediaFileIds`.
- First media item is featured by ordering only. The create category API has no separate featured image field.

## Out Of UI But Supported By Submit Context

`CategoryCreateInput.parentId` is useful for "create subcategory", but showing a parent selector would add UI that does not exist in product create.

First implementation rule:

- Categories page create button opens modal without `parentId`; category is created at root/API default.
- Future "add subcategory" action may open the same modal with `payload.parentId`.
- The modal can submit `parentId` from payload, but does not render a parent selector.

This keeps the UI identical to product create while preserving API compatibility for subcategory entry points.

## Fields Intentionally Omitted

`CategoryCreateInput` supports optional fields that are not part of the first modal UI:

| API field | Reason omitted |
|---|---|
| `parentId` | Not visible in root create UI; may come from modal payload for subcategory flow. |
| `excerpt` | Product create modal has no excerpt field. |
| `seo` | Product create modal has no SEO section. |
| `publish` | Product create modal has no publish/status switch. |

Do not add these fields to the UI unless the product create modal gains equivalent create-time controls or the task explicitly changes the design requirement.

## Form State

```ts
interface CreateCategoryFormValues {
  name: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
}
```

Default values:

```ts
const DEFAULT_VALUES: CreateCategoryFormValues = {
  name: "",
  handle: "",
  description: null,
  media: [],
};
```

Modal payload:

```ts
interface ICreateCategoryModalPayload extends IModalStackPayload {
  parentId?: string | null;
  onCreated?: (category: ApiCategory) => void;
}
```

## API Mapping

Target mutation:

```graphql
mutation CategoryCreate($input: CategoryCreateInput!) {
  catalogMutation {
    categoryCreate(input: $input) {
      category {
        id
        name
        handle
        isPublished
        publishedAt
        productsCount
        depth
        path
        createdAt
        updatedAt
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
        parent {
          id
          name
          handle
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Mapping table:

| Source | API field | Rule |
|---|---|---|
| `values.name` | `name` | Trim and send. |
| `values.handle` | `handle` | Slugify on input, send slug. |
| `values.description` | `description` | Convert EditorJS through `renderContent`; omit when empty. |
| `values.media` | `mediaFileIds` | Send uploaded file IDs in gallery order; omit when empty. |
| `payload.parentId` | `parentId` | Send only when modal was opened with parent context. |

Example root category:

```ts
{
  name: "Summer essentials",
  handle: "summer-essentials",
  description: {
    text: "Products for warm weather.",
    html: "<p>Products for warm weather.</p>",
    json: { blocks: [...] }
  },
  mediaFileIds: ["file_1", "file_2"]
}
```

Example subcategory from payload:

```ts
{
  name: "Headphones",
  handle: "headphones",
  parentId: "gid://shopana/Category/..."
}
```

## Target File Structure

```text
admin/src/domains/inventory/categories/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-categories.ts
    use-create-category.ts
    index.ts
  mappers/
    category-create.mapper.ts
    category-errors.mapper.ts
    index.ts
  modals/
    create-category-modal/
      create-category-modal.tsx
      general-section.tsx
      media-section.tsx
      schema.ts
      types.ts
      index.ts
    category-modal/
      ...
  modals.ts
  page/
    page.tsx
```

## GraphQL Layer

### Fragments

Add a mutation result fragment compatible with the categories table.

```ts
export const CATEGORY_MUTATION_RESULT_FRAGMENT = gql`
  fragment CategoryMutationResultFields on Category {
    id
    name
    handle
    isPublished
    publishedAt
    productsCount
    depth
    path
    createdAt
    updatedAt
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
    parent {
      id
      name
      handle
    }
  }
`;
```

### Mutation

Add `admin/src/domains/inventory/categories/graphql/mutations.ts`.

```ts
export const CATEGORY_CREATE_MUTATION = gql`
  mutation CategoryCreate($input: CategoryCreateInput!) {
    catalogMutation {
      categoryCreate(input: $input) {
        category {
          ...CategoryMutationResultFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${CATEGORY_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
```

Do not import product module GraphQL internals from categories. If `UserErrorFields` is not shared, duplicate the small fragment locally or move it to a shared GraphQL location in a separate cleanup.

### Operation Types

Extend `admin/src/domains/inventory/categories/graphql/operation-types.ts`.

```ts
import type {
  ApiCatalogMutation,
  ApiCategoryCreateInput,
  ApiCategoryCreatePayload,
} from "@/graphql/types";

export interface CategoryCreateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryCreate"> & {
    categoryCreate: ApiCategoryCreatePayload;
  };
}

export interface CategoryCreateMutationVariables {
  input: ApiCategoryCreateInput;
}
```

Export mutations from `graphql/index.ts`.

## Mapper

Create `admin/src/domains/inventory/categories/mappers/category-create.mapper.ts`.

```ts
interface CreateCategoryInput {
  name: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
  parentId?: string | null;
}
```

Mapper responsibilities:

- `prepareRichText(value)` converts EditorJS data to `ApiRichTextInput` with `renderContent`.
- `prepareMediaFileIds(media)` returns `string[] | undefined`.
- `prepareCategoryPayload(input)` returns `ApiCategoryCreateInput`.
- Do not include `excerpt`, `seo`, or `publish`.

## Error Mapping

Create `admin/src/domains/inventory/categories/mappers/category-errors.mapper.ts`.

Fields:

```ts
type CategoryFormErrorField =
  | "name"
  | "handle"
  | "description"
  | "media";
```

Aliases:

```ts
const FIELD_ALIASES: Record<string, CategoryFormErrorField> = {
  name: "name",
  handle: "handle",
  description: "description",
  media: "media",
  mediaFileIds: "media",
};
```

Behavior should mirror `mapProductUserErrorsToFormErrors`.

## Hook Contract

Create `admin/src/domains/inventory/categories/hooks/use-create-category.ts`.

```ts
interface CreateCategoryResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateCategoryReturn {
  createCategory: (
    input: CreateCategoryInput,
  ) => Promise<CreateCategoryResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

Rules:

- The hook owns `useMutation(CATEGORY_CREATE_MUTATION)`.
- It calls `prepareCategoryPayload(input)`.
- It unwraps `data.catalogMutation.categoryCreate`.
- It returns `{ category, userErrors }`.
- Runtime errors become `[{ code: "UNEXPECTED_ERROR", message }]`, matching product create.
- For list freshness, prefer caller-driven refresh: pass `onCreated` from `CategoriesPage` and call `refetch()` after success.

## Modal Submit Flow

```text
User clicks Create
  ↓
react-hook-form + Zod validation
  ↓
createCategory({
  ...formValues,
  parentId: payload.parentId ?? null
})
  ↓
prepareCategoryPayload(input)
  ↓
catalogMutation.categoryCreate(input)
  ↓
if userErrors:
  map field errors with category-errors.mapper
  message.error(first user error)
  keep modal open
else:
  message.success("Category created successfully")
  payload.onCreated?.(category)
  pop()
```

Submit button:

- uses `ModalHeader.submitButtonProps`;
- shows `loading: isSubmitting`;
- closes only on successful `category` with no `userErrors`.

## Validation

Create `schema.ts` close to product create schema style.

Rules:

- `name`: required, max 255.
- `handle`: required, max 255, product slug regex.
- `description`: `OutputData | null`.
- `media`: `ApiFile[]`.

Duplicate handle validation should come from API `userErrors`, not from client-only checks.

## Modal Registration And Page Integration

Add a create modal type:

```ts
export const CATEGORY_CREATE_MODAL_TYPE = "category-create";
```

Add payload typing:

```ts
export interface ICreateCategoryModalPayload extends IModalStackPayload {
  parentId?: string | null;
  onCreated?: (category: ApiCategory) => void;
}
```

Add hook:

```ts
export const useCreateCategoryModal =
  createModalStackHook(CATEGORY_CREATE_MODAL_TYPE);
```

Register in `admin/src/domains/modals.tsx`:

```text
type: "category-create"
component: "@/domains/inventory/categories/modals/create-category-modal"
```

Replace disabled Categories page action:

```text
Create button
└── openCreateCategoryModal({
      onCreated: () => refetch()
    })
```

Future subcategory action:

```text
openCreateCategoryModal({
  parentId: currentCategory.id,
  onCreated: refreshCategoryDetails
})
```

## Implementation Phases

1. Add GraphQL mutation, mutation fragment, operation types, and exports.
2. Add category create mapper and category error mapper.
3. Add `useCreateCategory`.
4. Build modal files:
   - `create-category-modal.tsx`;
   - `general-section.tsx`;
   - `media-section.tsx`;
   - `schema.ts`;
   - `types.ts`.
5. Register `category-create` modal and typed hook.
6. Enable the Categories page `Create` button and refresh the list after success.

## Manual Verification

Do not run tests or `tsc` per project instructions.

Manual checks:

- Open Categories page.
- Click Create.
- Confirm modal visually matches product create:
  - same header shape;
  - same body width/spacing;
  - same `Paper` sections;
  - same handle input style;
  - same media gallery behavior;
  - no category-only settings section;
  - no publish/status control;
  - no category-specific instructional text.
- Create category with only `name` and `handle`.
- Upload/reorder media and confirm `mediaFileIds` are sent in order.
- Submit duplicate handle and confirm API error maps to `handle`.
- Confirm categories table refetches after success.

Use `npm run build` only if a fresh compiled version is needed.

## Acceptance Criteria

- `CreateCategoryModal` uses the same visual composition as `CreateProductModal`.
- Main body sections are only `General` and `Media`.
- `General` mirrors product `GeneralSection` layout and behavior.
- `Media` reuses `EntityMediaGallery` like product create.
- There is no `Category settings` section.
- There is no publish/status switch.
- There is no draft/publish explanatory copy.
- There are no standalone SEO or Preview sections.
- Submit calls `catalogMutation.categoryCreate` through module-local category GraphQL/hook files.
- Form data maps to `ApiCategoryCreateInput` through a category mapper.
- API `userErrors` map to form fields through a category error mapper.
- Categories list refreshes after successful creation.
- No product module internals are imported by category GraphQL/hooks/mappers.
