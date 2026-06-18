# Admin GraphQL Layer

## Purpose

This document defines how Admin modules design GraphQL operations, request hooks, data mappers, and folder structure. The goal is to keep API integration predictable across modules and prevent UI components from depending on raw GraphQL response shapes.

## Module Structure

Each feature module that talks to GraphQL must use the same structure:

```text
src/domains/<domain>/<module>/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-<entity-list>.ts
    use-<entity>.ts
    use-create-<entity>.ts
    use-update-<entity>.ts
    use-delete-<entity>.ts
    index.ts
  mappers/
    <entity>-api.mapper.ts
    <entity>-form.mapper.ts
    index.ts
  page/
  modals/
  components/
```

For modules that are currently using a domain-level GraphQL folder, the domain-level folder may stay as a compatibility barrel, but new module-specific operations must live in the module folder. Example: product operations live in `src/domains/inventory/products/graphql`, while `src/domains/inventory/graphql` can re-export them during migration.

## File Responsibilities

`graphql/fragments.ts`

- Contains GraphQL fragments only.
- Fragment names must match API type and purpose: `ProductBasicFields`, `ProductListItemFields`, `ProductDetailsFields`.
- Keep fragments focused on one UI use case. Do not create one large fragment for every screen.
- Shared fragments may be imported only when they represent stable shared API types, such as `UserErrorFields`, `PageInfoFields`, or `FileFields`.

`graphql/queries.ts`

- Contains read operations only.
- Operation constants use uppercase names ending with `_QUERY`, for example `PRODUCTS_QUERY`.
- GraphQL operation names use PascalCase, for example `Products`, `ProductDetails`.
- Query variables must mirror API pagination and filters instead of inventing UI-only names.

`graphql/mutations.ts`

- Contains write operations only.
- Operation constants use uppercase names ending with `_MUTATION`, for example `PRODUCT_CREATE_MUTATION`.
- Every mutation must request `userErrors { ...UserErrorFields }`.
- Mutations should return enough data to update the current UI and cache, but not full detail data unless the UI immediately needs it.

`graphql/operation-types.ts`

- Contains TypeScript types for operation responses and variables when operation codegen is not enabled.
- Types must be built from generated schema types in `@/graphql/types`.
- Components must not declare ad hoc GraphQL response types.

`hooks/`

- Contains one hook per user-facing use case.
- Hooks own Apollo `useQuery` and `useMutation` calls.
- Components call hooks and receive UI-ready data, loading state, API user errors, and unexpected runtime errors.
- Hooks must not expose raw nested GraphQL payloads like `data.inventoryMutation.productCreate`.

`mappers/`

- Converts form/view models to API inputs and API outputs to view models.
- Keeps UI-only shape differences out of hooks and components.
- No GraphQL calls are allowed in mappers.

## Hook Contracts

Query hooks return:

```ts
interface UseEntityListReturn<TItem> {
  items: TItem[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

Mutation hooks return:

```ts
interface UseEntityMutationReturn<TInput, TResult> {
  mutate: (input: TInput) => Promise<{
    data: TResult | null;
    userErrors: ApiGenericUserError[];
  }>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

Module hooks can expose domain-specific method names, such as `createProduct`, but the result shape must stay consistent.

## Error Handling

- API validation and business errors come from `userErrors` and must be returned to the component.
- Network, GraphQL transport, and unexpected runtime failures are exposed as `error`.
- Form components map `userErrors.field` to form fields through a mapper/helper, not inline repeated logic.
- Components may show notifications, but hooks decide how API errors are normalized.

## Data Mapping Rules

- Generated API types in `@/graphql/types` are the source of truth for API contracts.
- UI models must be explicit and named by use case: `ProductListItem`, `ProductDetailsView`, `CreateProductFormValues`.
- Do not keep mock-only fields in API-backed view models unless there is a documented fallback.
- API date/time scalars are strings. Convert or format them at the display boundary.
- Monetary values, stock, media, and category fields must stay aligned with where they actually live in the API. Do not flatten them onto product view models unless a mapper documents the source.

## Cache and Refetch Rules

- Cache updates belong in hooks, not components.
- A mutation hook must declare how the affected screens become fresh: `cache.modify`, `refetchQueries`, or explicit caller callback.
- Use `refetchQueries` for first integration if cache shape is not stable yet.
- Use `cache.modify` only when the relevant list query and pagination policy are settled.

## Mock Data Rules

- Mocks are allowed only as temporary UI development data or fixtures.
- Hooks that are intended to talk to API must not import from `@/mocks`.
- When replacing mocks, create a mapper from API data to the existing UI model first, then remove mock-only fields from the UI model in smaller steps.

## Product Module Target Structure

The product module should converge to:

```text
src/domains/inventory/products/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-products.ts
    use-product.ts
    use-create-product.ts
    index.ts
  mappers/
    product-create.mapper.ts
    product-errors.mapper.ts
    product-view.mapper.ts
    index.ts
  modals/create-product-modal/
    create-product-modal.tsx
    schema.ts
    types.ts
    general-section.tsx
    media-section.tsx
    variants-section.tsx
```

## Product Create Specific Rules

- `CreateProductModal` owns form state and UI behavior only.
- `useCreateProduct` owns the `productCreate` mutation, loading/error state, and cache/refetch behavior.
- `product-create.mapper.ts` converts `CreateProductFormValues` into `ApiProductCreateInput`.
- Product media must already be uploaded through the media module before `productCreate` is called. The product mutation receives `mediaFileIds`.
- Variant generation stays UI-side, but the mapper sends only enabled variants to the API.
- Product status is not sent unless the API adds it to `ProductCreateInput`; draft behavior must rely on API defaults.
