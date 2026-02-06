# Inventory to Catalog Rename - Session Summary

## What was done

### 1. Server-side fixes (catalog service)

**Broker call renames** in `services/catalog/src/resolvers/admin/MutationResolver.ts`:
- `"inventory.productCreate"` -> `"catalog.productCreate"`
- `"inventory.productUpdate"` -> `"catalog.productUpdate"`
- `"inventory.productBulkEdit"` -> `"catalog.productBulkEdit"`

**Workflow call rename** in `services/catalog/src/workflows/ProductBulkEditWorkflow.ts`:
- `"inventory.productUpdate"` -> `"catalog.productUpdate"`

**InventoryItem default** in `services/inventory/src/InventoryEventHandlers.ts`:
- `handleVariantCreated` now creates InventoryItem with `trackInventory: false` (was `true` via empty `{}`)

### 2. E2E GraphQL queries updated (`e2e/queries/inventory-api/`)

**Namespace renames** (12 files):
- `inventoryMutation` -> `catalogMutation` in: ProductBulkUpdate, ProductCreate, ProductCreateSimple, ProductFeaturesSync, ProductOptionsSync, ProductUpdate, VariantCreate, VariantSetMedia, VariantSetPricing
- `inventoryQuery` -> `catalogQuery` in: ProductBulkUpdateJob, ProductFindMany, ProductFindOne

**Variant field migration** (`sku`/`stock`/`weight`/`cost`/`dimensions` moved to `inventoryItem {...}`):
- ProductUpdate.gql - full replacement of variant inventory fields with `inventoryItem { sku, trackInventory, totalAvailable, stock {...}, weight {...}, unitCost {...}, dimensions {...} }`
- ProductCreate.gql, ProductCreateSimple.gql, ProductFindOne.gql, VariantCreate.gql, VariantSetMedia.gql - `sku` -> `inventoryItem { sku }`

**Not touched** (stay on `inventoryMutation`/`inventoryQuery`):
- Warehouse*.gql files - warehouses remain in Inventory service
- Widget*.gql files - use `widgetQuery` (unchanged)
- VariantSetCost.gql, VariantSetStock.gql, VariantSetWeight.gql, VariantSetDimensions.gql - **NEED REWRITE** (use deleted mutations)

### 3. E2E test specs updated (`e2e/tests/inventory-api/`)

**All `data.inventoryMutation.productCreate`** -> `data.catalogMutation.productCreate` across ALL spec files (including stock.spec.ts, physical.spec.ts, warehouse-stock-pagination.spec.ts that are otherwise "inventory" files).

**`inventoryMutation` -> `catalogMutation`** for catalog operations:
- `.productUpdate`, `.productBulkUpdate`, `.productOptionsSync`, `.productFeaturesSync`
- `.variantUpdateMedia`, `.variantUpdatePricing`, `.variantCreate`

**`inventoryQuery` -> `catalogQuery`** for catalog queries:
- `.product`, `.products`, `.productBulkUpdateJob`

**Left unchanged** (correctly still on `inventoryMutation`/`inventoryQuery`):
- `.warehouseCreate`, `.warehouseUpdate`, `.warehouseDelete`
- `.warehouse`, `.warehouses`
- `.variantUpdateInventory`, `.variantUpdateDimensions` (these are broken - see below)

### 4. Codegen regenerated

- Ran `npm run codegen` in e2e/ to regenerate `codegen/admin-gql.ts`
- `codegen/client-gql.ts` had no changes

## Test results after changes

| Test file | Pass | Fail | Notes |
|-----------|------|------|-------|
| product-create | 5/5 | 0 | Clean |
| product-query | 4/4 | 0 | Clean |
| features-sync | 13/13 | 0 | Clean |
| options-sync | 17/21 | 4 | Swatch bug (pre-existing) |
| media | 6/6 | 0 | Clean |
| product-update | 38/50 | 7 | Variant inventory fields (breaking) |
| product-bulk-edit | 32/34 | 2 | Warehouse + ordering (breaking/pre-existing) |
| pricing | 4/9 | 5 | variantUpdateInventory removed (breaking) |
| warehouse + pagination | 53/53 | 0 | Clean |

## Still TODO - Breaking changes requiring rewrite

### GQL files to rewrite (use deleted mutations)

These 4 files use `inventoryMutation.variantUpdateInventory` or `inventoryMutation.variantUpdateDimensions` which no longer exist. They need to be rewritten to use `inventoryMutation.inventoryItemUpdate`:

- `VariantSetCost.gql` - cost is now `inventoryItemUpdate(input: { id, unitCost: { amountMinor, currency } })`
- `VariantSetStock.gql` - stock is now `inventoryItemUpdate(input: { id, stock: { onHand, warehouseId } })`
- `VariantSetWeight.gql` - weight is now `inventoryItemUpdate(input: { id, weight: { weightGrams } })`
- `VariantSetDimensions.gql` - dimensions are now `inventoryItemUpdate(input: { id, dimensions: { heightMm, widthMm, lengthMm } })`

### Test specs to update (use old variant fields)

These tests access variant fields that moved to `inventoryItem`:
- `stock.spec.ts` - entire file uses `variantUpdateInventory`
- `physical.spec.ts` - uses `variantUpdateDimensions` + `variantUpdateInventory`
- `pricing.spec.ts` - 5 tests use `variantUpdateInventory` for cost
- `product-update.spec.ts` - 7 tests access `variant.sku`, `variant.stock`, `variant.weight`, `variant.cost`, `variant.dimensions`
- `product-bulk-edit.spec.ts` - 1 test with warehouse inventory
- `widget.inventory.spec.ts` - uses `variantUpdateInventory` for setup
- `widget-pricing.spec.ts` - uses `variantUpdateInventory` for cost setup
- `warehouse-stock-pagination.spec.ts` - uses `variantUpdateInventory` for stock setup

### Key schema changes reference

**Variant type** lost: `sku`, `stock`, `weight`, `cost`, `dimensions`
**Variant type** gained: `inventoryItem?: InventoryItem`

**InventoryItem** fields: `id`, `sku`, `trackInventory`, `continueSellingWhenOutOfStock`, `totalAvailable`, `stock: [WarehouseStock]`, `dimensions`, `weight`, `unitCost`, `variantId`

**InventoryMutation** now only has: `inventoryItemUpdate`, `warehouseCreate`, `warehouseUpdate`, `warehouseDelete`

**New CatalogMutation/CatalogQuery** namespace added alongside existing InventoryMutation/InventoryQuery.
