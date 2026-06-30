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
- Admin generated GraphQL types currently map the `BigInt` scalar to `number` for both input and output values.
- The product module already has `PRODUCT_UPDATE_MUTATION` and `useUpdateProduct` for `catalogMutation.productUpdate`.
- `ProductUpdateInput` supports variant updates through `variants: [VariantUpdateInput!]`.
- The backend `productUpdate` resolver maps `operations.variants[].pricing` into variant update workflow operations and decodes GraphQL global `Variant.id` values before running scripts.
- `EditVariantsModal` currently closes immediately after `onSave`; this must be changed so API user errors can keep the modal open.
- `usePricingWidget` currently imports `./mocks`; the pricing widget must be moved to the real GraphQL API before refresh behavior can be relied on.
- `ProductModal` currently fetches a paginated product variant connection. The pricing edit flow must explicitly decide whether it has all variants or must load the remaining pages before opening the editor.

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

For one product save, send one mutation call. Each changed row maps to one `VariantUpdateInput` item. Because the current Admin codegen maps `BigInt` inputs to `number`, build the typed `ApiProductUpdateInput` with numeric minor-unit values. Do not cast these values to strings unless the codegen scalar mapping is intentionally changed first.

```ts
import { CurrencyCode, type ApiProductUpdateInput } from "@/graphql/types";

const operations: ApiProductUpdateInput = {
  variants: changedRows.map((row) => {
    const originalVariant = variantsById.get(row.id);

    return {
      variantId: row.id,
      pricing: {
        currency: originalVariant?.price?.currency ?? CurrencyCode.Usd,
        amountMinor: row.price,
        compareAtMinor: row.compareAtPrice,
      },
    };
  }),
};

{
  productId: product.id,
  expectedRevision: product.revision,
  operations,
}
```

Rules:

- Use `product.id` as `productId`.
- Use `product.revision` as `expectedRevision`.
- Include only rows whose `price` or `compareAtPrice` changed.
- Send changed rows together in `operations.variants`; do not call `variantUpdatePricing` once per row.
- `variantId` is the API `Variant.id` from the edited row.
- `currency` is the current `variant.price.currency`, falling back to `CurrencyCode.Usd` when the variant has no current price.
- `amountMinor` is the edited `price` in minor units.
- `compareAtMinor` is the edited `compareAtPrice` in minor units, or `null` when cleared.

## Variant Source And Pagination

The pricing edit flow must use API-backed product variants, not `usePricingWidget` mock variants.

The product details query already returns `product.revision`, `product.options`, and a paginated `product.variants` connection. For the pricing editor, use one of these approaches and make the choice explicit in implementation:

1. Preferred first implementation: before opening `EditVariantsModal`, ensure every variant for the product is available by loading nested `product.variants(first, after)` pages until `pageInfo.hasNextPage` is false. Use a focused product variants query if the current product details query page size is not enough.
2. If the UI intentionally edits only the currently loaded page, label and scope the flow accordingly. Do not describe the save as "multiple variants of the same product" without clarifying the page boundary.

For this plan, use the preferred first implementation. The editor should receive all current product variants so unchanged rows can be excluded reliably and users do not silently miss variants beyond the first product details page.

## Pricing Widget Query

Replace the `./mocks` path with a real query against the current Admin schema:

```graphql
query ProductPricingWidget($input: PricingWidgetInput!) {
  widgetQuery {
    pricing(input: $input) {
      currentPrice {
        id
        amountMinor
        compareAtMinor
        currency
        effectiveFrom
        effectiveTo
        isCurrent
        recordedAt
      }
      currentCostPrice {
        id
        unitCostMinor
        currency
        effectiveFrom
        effectiveTo
        isCurrent
        recordedAt
      }
      history {
        edges {
          cursor
          node {
            id
            amountMinor
            compareAtMinor
            currency
            effectiveFrom
            effectiveTo
            isCurrent
            recordedAt
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
      statistics {
        minPriceMinor
        maxPriceMinor
        avgPriceMinor
        currency
      }
    }
  }
}
```

Rules:

- Use `widgetQuery.pricing(input:)`.
- Derive `input.variantId` from the selected API variant ID.
- Derive `input.currency` from the selected variant price currency, falling back to `CurrencyCode.Usd`.
- Convert the selected period into `from` and `to` `DateTime` strings at the hook boundary.
- Return a `refetch` function from the pricing widget hook so the save handler can refresh the widget after mutation success.

## Implementation Steps

1. Reuse `PRODUCT_UPDATE_MUTATION` and `useUpdateProduct`; do not add a `variantUpdatePricing` GraphQL document or hook for this flow.
2. Replace `usePricingWidget` mock fetching with the real `ProductPricingWidget` GraphQL query and return a widget `refetch` function.
3. Pass enough product context into the Pricing edit flow to build the mutation input: `product.id`, `product.revision`, current product variants, product options, and a product details refresh callback.
4. Ensure the Pricing edit flow has all product variants before opening `EditVariantsModal`. Add a focused product variants loader if the current product details variant page is incomplete.
5. Open `EditVariantsModal` from the Pricing header `Edit Prices` menu with pricing columns only:
   - `availableColumns: ["price", "compareAtPrice"]`
   - `showColumnSettings: false`
6. Update `IEditVariantsModalPayload["onSave"]` and `EditVariantsModal` save handling so `onSave` may return `boolean | void | Promise<boolean | void>`:
   - any result except `false` resets edits and closes the modal;
   - return `false` to keep the modal open;
   - keep a local `submitting` state while an async save is in progress, matching the existing edit title/media/SEO modal pattern.
7. On save, compare edited rows with the current product variants and build `operations.variants` only for rows where `price` or `compareAtPrice` changed.
8. If no rows changed, show a neutral notification and close the modal without calling `updateProduct`.
9. Call `updateProduct` once:
   - `productId: product.id`
   - `expectedRevision: product.revision`
   - `operations: { variants: changedVariantPricingInputs }`
10. Add a small product update error normalizer used by the pricing save handler:
    - include top-level `userErrors`;
    - include all `operationResults[].errors`;
    - treat any `operationResults[]` item with `applied === false` as a failure even if the errors array is empty.
11. Show success/error notifications at the component boundary that owns the save handler. Display the first useful normalized error message and keep the modal open on failure.
12. After a successful save, refresh product details and the Pricing widget so current price, variant row prices, history, and statistics reflect persisted data.

## Verification

Do not run `test` or `tsc` directly. Use the Shopana CLI build command when verification is needed.

Expected manual behavior:

- `Pricing -> Edit Prices` opens the variant editor.
- The editor shows only pricing fields.
- Products with more variants than the product details page size either load all variants into the pricing editor or clearly scope the editor to the loaded page. For this implementation, all variants should be loaded.
- Saving changed prices calls `catalogMutation.productUpdate` once for the product.
- The request contains all changed variant pricing rows under `operations.variants`.
- The request uses numeric `amountMinor` and `compareAtMinor` values unless the Admin `BigInt` scalar mapping has been changed.
- Unchanged rows are not included in the request.
- No mutation is sent when there are no changed pricing rows.
- Top-level user errors, operation result errors, and unapplied operation results are displayed and keep the modal open.
- A successful save closes the modal, refreshes product details, and refreshes Pricing card data from `widgetQuery.pricing`.
