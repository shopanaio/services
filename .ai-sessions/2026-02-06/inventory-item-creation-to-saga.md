# Inventory Item Creation Moved to Product Create Saga

## Context

Previously, `InventoryItem` records were created via an event handler (`handleVariantCreated`) in the Inventory service. This was fire-and-forget with no compensation support and no way to pass inventory data (tracked, sku, etc.) from the product creation flow.

## What was done

Converted inventory item creation from an event handler into a saga step with compensation inside `ProductCreateSaga`, with Zod validation for input.

### Changes by file

| File | Change |
|------|--------|
| `packages/broker-types/src/actions/inventory.ts` | Added `CreateItemParams/Result`, `DeleteItemByVariantIdParams/Result` types. Both include `storeId` for context scoping. |
| `packages/broker-types/src/actions/index.ts` | Exported new types from Inventory namespace |
| `services/catalog/src/api/graphql-admin/schema/product.graphql` | Added `InventoryItemInput` GraphQL input (`tracked: Boolean!`, `sku: String`, `continueSellingWhenOutOfStock: Boolean`) and `inventoryItem` field on `ProductCreateInput` |
| `services/catalog/src/resolvers/admin/generated/*` | Regenerated via `shopana codegen -s catalog` |
| `services/catalog/src/scripts/product/dto/ProductCreateDto.ts` | Added `InventoryItemCreateInput` interface, added `inventoryItem?: InventoryItemCreateInput` to `ProductCreateParams` |
| `services/catalog/src/scripts/product/dto/index.ts` | Exported `InventoryItemCreateInput` |
| `services/catalog/src/sagas/ProductCreateSaga.ts` | Added Zod validation at saga start, `createInventoryItems` saga step (calls `inventory.createItem` per variant), and `compensateCreateInventoryItems` (calls `inventory.deleteItemByVariantId`) |
| `services/catalog/src/resolvers/admin/MutationResolver.ts` | Maps `input.inventoryItem` from GraphQL to `sagaInput.inventoryItem` |
| `services/inventory/src/InventoryBrokerActions.ts` | Added `createItem` and `deleteItemByVariantId` broker actions with `runWithStoreContext` helper that creates a `ServiceContext` for AsyncLocalStorage |
| `services/inventory/src/InventoryEventHandlers.ts` | Removed `handleVariantCreated` event handler and `VariantCreatedEvent` interface |

### Validation logic (Zod in ProductCreateSaga)

- `tracked: true` + inventory data -> creates inventory item with provided data
- `tracked: false` + `sku` or `continueSellingWhenOutOfStock` provided -> validation error ("Cannot provide inventory data when tracked is false")
- No `inventoryItem` provided at all -> creates with `trackInventory: false` (preserves previous default behavior)

### Saga step order (ProductCreateSaga.run)

1. **Validate** inventory item input (Zod, before any steps)
2. `createProduct` - DB transaction via `ProductCreateScript`
3. `emitProductCreated` - event emission via broker workflow
4. **`createInventoryItems`** (NEW) - calls `inventory.createItem` for each variant
5. `syncVariantBackRefs` - media back-ref sync (best-effort)

### Compensation

`compensateCreateInventoryItems` receives the same args as the step (`variantIds`, `inventoryItem`, `storeId`) and calls `inventory.deleteItemByVariantId` for each variant. Errors in compensation are logged but not re-thrown (best-effort pattern matching other compensations in the codebase).

### Broker action context pattern

The new broker actions in `InventoryBrokerActions` need `storeId` for the repository (which reads `this.ctx.store.id` from AsyncLocalStorage). A `runWithStoreContext` helper creates a minimal `ServiceContext` and wraps execution via `runWithContext`. This is similar to `Kernel.buildServiceContext` (which is private).

## Known issues

- `InventoryBrokerActions.ts:103` has a pre-existing type error: `getServicesForProject` does not exist on `Kernel`. This is NOT caused by these changes.
- The `variantCreated` event is no longer handled for inventory item creation. Any other flows that create variants independently (e.g., standalone `variantCreate` mutation) will need their own inventory item creation mechanism (currently the `inventoryItemByVariant` GraphQL query does lazy upsert).

## Build status

- Catalog service: builds cleanly
- Inventory service: only the pre-existing `getServicesForProject` error
