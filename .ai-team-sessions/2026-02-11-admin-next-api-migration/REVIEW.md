# Plan Review: Admin-Next API Migration

**Final Status**: APPROVED
**Iterations**: 2 (initial review + 1 revision)

---

## Review Summary

| Iteration | Status | Issues Found |
|-----------|--------|--------------|
| 1 | NEEDS REVISION | 8 issues (3 critical, 4 major, 1 minor) |
| 2 | APPROVED | All issues addressed |

---

## Initial Review Issues

### Critical Issues (3)

1. **API Schema Mismatch**
   - Problem: `catalogQuery.products(...)` missing from composed supergraph
   - Resolution: Added prerequisite step to recompose supergraph

2. **Fragment Field Mismatch - ProductListFragment**
   - Problem: `pricing`, `inventory`, `thumbnailUrl` don't exist
   - Resolution: Changed to `price`, `inventoryItem`, `url`

3. **Fragment Field Mismatch - ProductDetailFragment**
   - Problem: `optionValues`, wrong inventory structure
   - Resolution: Changed to `selectedOptions`, correct `inventoryItem` structure

### Major Issues (4)

4. **Type Policies Configuration**
   - Problem: `keyArgs: ['where', 'orderBy']` wrong - products() only has pagination args
   - Resolution: Changed to `keyArgs: false`

5. **Schema Path Error**
   - Problem: Wrong path `../services/apollo/supergraph.graphql`
   - Resolution: Corrected to `../services/infra/federation/supergraph-admin.graphql`

6. **Scalar Mapping Incompleteness**
   - Problem: Missing Upload, Timestamp, Email
   - Resolution: Added all missing scalar mappings

7. **Authentication Implementation**
   - Problem: localStorage doesn't work with SSR
   - Resolution: Changed to cookie-based auth

### Minor Issues (1)

8. *(None identified as blocking)*

---

## Verification Checklist (Final Review)

| Aspect | Status |
|--------|--------|
| Prerequisite schema recompose | ADDED |
| Schema path in codegen | FIXED |
| ProductListFragment fields | FIXED |
| ProductDetailFragment fields | FIXED |
| Type policies | FIXED |
| Scalar mappings | FIXED |
| Authentication | FIXED |

---

## Field Mapping Verification

All field mappings verified against actual schema:

| Plan Field | Schema Field | Status |
|------------|--------------|--------|
| `price.currency` | `VariantPrice.currency` | CORRECT |
| `price.amountMinor` | `VariantPrice.amountMinor` | CORRECT |
| `inventoryItem.sku` | `InventoryItem.sku` | CORRECT |
| `inventoryItem.totalAvailable` | `InventoryItem.totalAvailable` | CORRECT |
| `inventoryItem.stock[].quantityOnHand` | `WarehouseStock.quantityOnHand` | CORRECT |
| `selectedOptions` | `Variant.selectedOptions` | CORRECT |
| `media[].file.url` | `File.url` | CORRECT |
| `dimensions.widthMm` | `InventoryItemDimensions.widthMm` | CORRECT |
| `weight.weightGrams` | `InventoryItemWeight.weightGrams` | CORRECT |

---

## Minor Notes (Non-blocking)

1. **SelectedOption Display Names**: `SelectedOption` only has IDs. UI needs to look up names from `product.options` - this is correctly handled in the fragment.

2. **BigInt Handling**: `amountMinor` is `BigInt` mapped to string. Plan includes `parseInt()` conversion in display code.

3. **Warehouse Names**: Plan includes `warehouse { id, name }` in stock query for display.

---

## Approval

**Reviewer**: Plan Review Agent
**Date**: 2026-02-11
**Verdict**: APPROVED - Ready for implementation
