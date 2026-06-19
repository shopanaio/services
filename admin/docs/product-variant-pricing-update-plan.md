# Product Variant Pricing Update Integration Plan

## Goal

Wire the product details Pricing menu to the real Admin GraphQL API for product variant price updates.

The current Pricing card already exposes an `Edit Prices` menu item, but the item is not connected to a save flow. The implementation must persist edited prices for multiple variants of the same product through `catalogMutation.productUpdate`, using `ProductUpdateInput.variants[].pricing`.

## Current Baseline

- `ProductDetailsCard` renders `PricingBlock` for the product details modal.
- `PricingBlock` owns the pricing header, selected variant state, current price, price history, and KPI display.
- The Pricing header menu already contains `Edit Prices` and `View History`.
- `EditVariantsModal` already supports a pricing-only mode through `availableColumns`.
- Product variant editor rows use `price` and `compareAtPrice` in minor units, matching `VariantPricingOpInput.amountMinor` and `VariantPricingOpInput.compareAtMinor`.
- The product module already has `PRODUCT_UPDATE_MUTATION` and `useUpdateProduct` for `catalogMutation.productUpdate`.
- `ProductUpdateInput` supports variant updates through `variants: [VariantUpdateInput!]`.
- The backend `productUpdate` resolver maps `operations.variants[].pricing` into variant update workflow operations and decodes GraphQL global `Variant.id` values before running scripts.
- `EditVariantsModal` currently closes immediately after `onSave`; this must be changed so API user errors can keep the modal open.

## API Contract

Use the existing product update mutation from the Admin frontend:

```graphql
mutation ProductUpdate(
  $productId: ID!
  $operations: ProductUpdateInput
  $expectedRevision: Int
) {
  catalogMutation {
    productUpdate(
      productId: $productId
      operations: $operations
      expectedRevision: $expectedRevision
    ) {
      product {
        ...ProductMutationResultFields
      }
      operationResults {
        applied
        type
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

For one product save, send one mutation call. Each changed row maps to one `VariantUpdateInput` item:

```ts
{
  productId: product.id,
  expectedRevision: product.revision,
  operations: {
    variants: changedRows.map((row) => {
      const originalVariant = variantsById.get(row.id);

      return {
        variantId: row.id,
        pricing: {
          currency: originalVariant?.price?.currency ?? "USD",
          amountMinor: String(row.price),
          compareAtMinor:
            row.compareAtPrice == null ? null : String(row.compareAtPrice),
        },
      };
    }),
  },
}
```

Rules:

- Use `product.id` as `productId`.
- Use `product.revision` as `expectedRevision`.
- Include only rows whose `price` or `compareAtPrice` changed.
- Send changed rows together in `operations.variants`; do not call `variantUpdatePricing` once per row.
- `variantId` is the API `Variant.id` from the edited row.
- `currency` is the current `variant.price.currency`, falling back to `USD` when the variant has no current price.
- `amountMinor` is the edited `price` in minor units.
- `compareAtMinor` is the edited `compareAtPrice` in minor units, or `null` when cleared.

## Implementation Steps

1. Reuse `PRODUCT_UPDATE_MUTATION` and `useUpdateProduct`; do not add a `variantUpdatePricing` GraphQL document or hook for this flow.
2. Pass enough product context into the Pricing edit flow to build the mutation input: `product.id`, `product.revision`, current product variants, and product options.
3. Open `EditVariantsModal` from the Pricing header `Edit Prices` menu with pricing columns only:
   - `availableColumns: ["price", "compareAtPrice"]`
   - `showColumnSettings: false`
4. Update `EditVariantsModal` save handling so `onSave` may return `boolean | Promise<boolean>`:
   - return `true` to reset edits and close the modal;
   - return `false` to keep the modal open;
   - keep a saving state while an async save is in progress.
5. On save, compare edited rows with the current product variants and build `operations.variants` only for rows where `price` or `compareAtPrice` changed.
6. Call `updateProduct` once:
   - `productId: product.id`
   - `expectedRevision: product.revision`
   - `operations: { variants: changedVariantPricingInputs }`
7. Show success/error notifications at the component boundary that owns the save handler.
8. Treat both top-level `userErrors` and `operationResults[].errors` as save failures; display the first useful message and keep the modal open.
9. After a successful save, refresh product details and the Pricing widget so current price, history, and statistics reflect persisted data.
10. If the Pricing widget still reads from `./mocks`, replace that mock fetch path with the real Admin GraphQL pricing query/refetch path before relying on the refresh behavior.

## Verification

Do not run `test` or `tsc` directly. Use the Shopana CLI build command when verification is needed.

Expected manual behavior:

- `Pricing -> Edit Prices` opens the variant editor.
- The editor shows only pricing fields.
- Saving changed prices calls `catalogMutation.productUpdate` once for the product.
- The request contains all changed variant pricing rows under `operations.variants`.
- Unchanged rows are not included in the request.
- User errors are displayed and keep the modal open.
- A successful save closes the modal and refreshes Pricing card data.
