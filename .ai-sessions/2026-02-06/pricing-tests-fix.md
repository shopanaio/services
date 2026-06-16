# Fix pricing.spec.ts E2E Tests

## Session Prompt
User asked to run the next E2E test file after product-create and product-update were completed. Identified `product-query.spec.ts` as next, then `pricing.spec.ts`.

## Work Done
- Ran `product-query.spec.ts` — all 4 tests passed immediately, no fixes needed
- Ran `pricing.spec.ts` — 5/9 passed, 4 failed with `Failed to resolve field "inventoryItemUpdate" on InventoryMutationResolver`
- Diagnosed root cause: `MutationResolver.inventoryItemUpdate()` called `decodeGlobalIdByType(input.id, GlobalIdEntity.InventoryItem)` expecting base64-encoded Global IDs, but all resolvers in the project return raw UUIDs as `id()`
- Fixed by removing `decodeGlobalIdByType` calls for both `inventoryItemId` and `warehouseId` in `inventoryItemUpdate` method
- Removed unused import of `decodeGlobalIdByType` and `GlobalIdEntity`
- All 9 pricing tests pass after fix

## Mistakes & Lessons Learned

- **What happened**: Spent significant time trying to see the server-side error. Tried manual curl/fetch calls, struggled with auth flow and field names.
- **Root cause**: The test framework throws GraphQL errors but doesn't include the underlying cause stacktrace. Server logs go to the dev server process, not test output.
- **Lesson**: The fastest way to debug executor `ResolverError` is to temporarily wrap the resolver method with try/catch that returns the error as a `userErrors` entry. This surfaces the real error in the test output immediately. Pattern:
  ```typescript
  async methodName(args) {
    try { return await this._methodNameImpl(args); } catch (e: any) {
      return { result: null, userErrors: [{ message: `DEBUG: ${e.message}\n${e.stack}`, code: "DEBUG_ERROR" }] };
    }
  }
  ```

- **What happened**: Tried multiple approaches to reproduce the error (curl, node scripts) before finding the debug pattern above.
- **Root cause**: The admin gateway has different field names than expected (`authMutation` vs `iamMutation`, `storeMutation` vs `projectMutation`), and store creation requires many fields.
- **Lesson**: Don't try to manually reproduce the full auth+store+product+mutation flow. Use the e2e test framework which handles all of that. Focus on surfacing the error through the test itself.

## Best Practices Used
- Systematic approach: run tests first, categorize failures, then investigate
- Traced the error through the full execution path (ApolloMutation decorator -> executor.load -> resolveField -> method call)
- Reverted all debug changes before committing the fix

## Key Decisions
- **Removed `decodeGlobalIdByType` instead of encoding IDs in resolvers**: All resolvers across both catalog and inventory services return raw UUIDs as `id()`. The `inventoryItemUpdate` was the outlier expecting encoded Global IDs. Consistent with the project pattern to use raw UUIDs.

## Files Changed

| File | Change |
|------|--------|
| `services/inventory/src/resolvers/admin/MutationResolver.ts` | Removed `decodeGlobalIdByType` calls for inventory item ID and warehouse ID in `inventoryItemUpdate`; removed unused import |
| `packages/type-resolver/src/executor.ts` | Temporary debug logging added and reverted |
| `e2e/fixtures/api/gqlRequest.ts` | Temporary console.log uncommented and reverted |

## Open Items
- Next test file to run: `stock.spec.ts`
- Remaining test files: stock, physical, warehouse, warehouse-pagination, warehouse-stock-pagination, widget.inventory, widget-pricing, pricing-history-pagination, media, features-sync, options-sync, product-bulk-edit
- Progress so far: product-create (10/10), product-update (45/45), product-query (4/4), pricing (9/9)
