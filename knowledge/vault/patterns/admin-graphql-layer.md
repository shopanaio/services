# Admin GraphQL Layer

## Purpose

This document defines how Admin modules design GraphQL operations, request hooks, input mappers, and folder structure. The goal is to keep API integration predictable across modules while letting UI components consume generated GraphQL API types directly. Components should use API-shaped objects from `@/graphql/types` instead of API-output view models.

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
    <entity>-input.mapper.ts
    <entity>-errors.mapper.ts
    <entity>-form.mapper.ts
    index.ts
  page/
  modals/
  components/
```

For modules that are currently using a domain-level GraphQL folder, the domain-level folder may stay as a compatibility barrel for GraphQL operation documents only, but new module-specific operations must live in the module folder. Example: product operations live in `src/domains/inventory/products/graphql`, while `src/domains/inventory/graphql` can re-export them during migration.

Generated GraphQL API types must not be re-exported through module barrels, component barrels, `graphql/index.ts`, `operation-types.ts`, or feature-local `types.ts` files. Import generated API types directly from `@/graphql/types` at the usage site. This keeps the generated schema contract visible, avoids stale type aliases, and prevents feature modules from becoming secondary type sources.

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
- Must not re-export generated schema types. Consumers import generated API types directly from `@/graphql/types`.
- Components must not declare ad hoc GraphQL response types.
- Component props should use generated API entity types directly, for example `ApiProduct`, `ApiVariant`, and `ApiProductConnection`.

`hooks/`

- Contains one hook per user-facing use case.
- Hooks own Apollo `useQuery` and `useMutation` calls.
- Components call hooks and receive unwrapped generated API data, loading state, API user errors, and unexpected runtime errors.
- Hooks may unwrap root operation nesting into stable return fields, but must not map API outputs into separate UI view models.
- Hooks must not expose raw nested GraphQL operation payload paths like `data.inventoryMutation.productCreate`.

`mappers/`

- Converts UI form/editor state to API inputs and maps API user errors to form fields.
- Does not convert API outputs to view models.
- Does not create mock-to-API or API-to-UI adapter objects for component props.
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

`TItem` should be a generated API type from `@/graphql/types`, or a type derived directly from generated operation data. It must not be a separate API-output view model.

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
- Components should accept generated API types directly for API-backed data.
- UI-local models are allowed only for state that is not an API response object, such as form values, editor rows, draft state, or modal-specific input state. Name those models by their UI purpose, for example `CreateProductFormValues` or `VariantEditorRow`.
- Do not introduce API-output view models such as `ProductListItem` or `ProductDetailsView` for GraphQL-backed screens.
- Do not keep mock-only fields in API-backed component contracts.
- API date/time scalars are strings. Convert or format them at the display boundary.
- Monetary values, stock, media, and category fields must stay aligned with where they actually live in the API. Do not flatten them onto new component prop objects.
- Display helpers may return primitives or API nested values, but must not create new objects that become component prop contracts.

## Cache and Refetch Rules

- Cache updates belong in hooks, not components.
- A mutation hook must declare how the affected screens become fresh: `cache.modify`, `refetchQueries`, or explicit caller callback.
- Use `refetchQueries` for first integration if cache shape is not stable yet.
- Use `cache.modify` only when the relevant list query and pagination policy are settled.

## Mock Data Rules

- Mocks are allowed only as temporary UI development data or fixtures.
- Hooks that are intended to talk to API must not import from `@/mocks`.
- API-backed mocks must use generated API shapes from `@/graphql/types`.
- When replacing mocks, reshape mock data to generated API contracts first, then update components to read API fields directly.
- Do not add output mappers from API data to legacy mock/UI models.

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
