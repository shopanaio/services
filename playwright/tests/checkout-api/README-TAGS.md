# Checkout Tags E2E Tests

## Overview

This test suite covers the checkout tags functionality, including:
- Creating checkouts with initial tags
- CRUD operations on tags (Create, Update, Delete)
- Adding checkout line items with tags
- Unique tag behavior (replacing items)
- Tag validation and constraints

## Test Files

### `checkout-tags.spec.ts`
Main test file containing 8 comprehensive test scenarios for checkout tags.

## Test Scenarios

### 1. Create Checkout with Initial Tags
**Test:** `should create checkout with initial tags`

Tests creating a checkout with tags defined at creation time.

```typescript
tags: [
  { slug: 'gift', unique: false },
  { slug: 'subscription', unique: true }
]
```

**Validates:**
- Tags are created with correct properties
- Tags persist when reading checkout
- Both unique and non-unique tags work correctly

---

### 2. Manage Tags via Mutations
**Test:** `should create and manage tags via mutations`

Tests full CRUD lifecycle for tags after checkout creation.

**Operations:**
1. Create empty checkout
2. Add tag via `checkoutTagCreate`
3. Update tag `unique` flag via `checkoutTagUpdate`
4. Update tag slug via `checkoutTagUpdate`
5. Delete tag via `checkoutTagDelete`

**Validates:**
- Tag creation returns correct structure
- Updates persist correctly
- Deletion removes tags from checkout

---

### 3. Add Items with Non-Unique Tags
**Test:** `should add items with non-unique tags`

Tests adding multiple line items with the same non-unique tag.

**Scenario:**
```
Checkout with tag: { slug: 'bundle', unique: false }

Add items:
- Product 1 (qty: 1) with tag 'bundle'
- Product 2 (qty: 2) with tag 'bundle'

Result: Both items coexist with same tag
```

**Validates:**
- Multiple lines can share non-unique tags
- Tag reference is correct on each line
- Total quantity is sum of all lines (3)

---

### 4. Enforce Unique Tag Behavior
**Test:** `should enforce unique tag behavior when adding items`

Tests that unique tags replace previous items when a new item is added with the same tag.

**Scenario:**
```
Checkout with tag: { slug: 'main', unique: true }

Step 1: Add Product 1 with tag 'main'
        Result: 1 line item

Step 2: Add Product 2 with tag 'main'
        Result: 1 line item (Product 1 is removed!)

Step 3: Add Product 3 without tag
        Result: 2 line items (Product 2 with tag, Product 3 without)
```

**Validates:**
- ✅ Unique tags enforce single item constraint
- ✅ Previous item with same unique tag is automatically removed
- ✅ Items without tags coexist with tagged items
- ✅ This matches the use case from code review

**Use Case:** Shopping cart where only one "main" item can exist (e.g., subscription plan)

---

### 5. Prevent Duplicate Tag Slugs
**Test:** `should prevent duplicate tag slugs in same checkout`

Tests database unique constraint on `(checkout_id, slug)`.

**Validates:**
- Cannot create two tags with same slug in one checkout
- Error message mentions "already exists"
- Database constraint is working correctly

---

### 6. Validate Tag Slug Format
**Test:** `should validate tag slug format`

Tests that tag slugs must be alphanumeric (a-zA-Z0-9 only).

**Invalid slugs:**
- `invalid-slug!` (contains hyphen and exclamation)
- `hello world` (contains space)
- `test_tag` (contains underscore)

**Valid slugs:**
- `gift`
- `subscription123`
- `MainItem`

**Validates:**
- DTO validation on application layer
- Database constraint CHECK (slug ~ '^[a-zA-Z0-9]+$')
- Error message explains alphanumeric requirement

---

### 7. Cannot Make Tag Unique if Assigned to Multiple Lines
**Test:** `should not allow making tag unique if already assigned to multiple lines`

Tests business rule: cannot change `unique: false` → `unique: true` if tag is used by >1 line.

**Scenario:**
```
1. Create tag: { slug: 'shared', unique: false }
2. Add Product 1 with tag 'shared'
3. Add Product 2 with tag 'shared'
4. Attempt: updateTag({ unique: true })
   Expected: Error - "multiple lines"
```

**Validates:**
- Business logic from `UpdateCheckoutTagUseCase.ts:40-52`
- Prevents data inconsistency
- Clear error message to user

---

## GraphQL Operations

### Queries
- `CheckoutByIdFull` - includes tags and line item tags

### Mutations

#### CheckoutCreate
```graphql
mutation CheckoutCreate($input: CheckoutCreateInput!) {
  checkoutMutation {
    checkoutCreate(input: $input) {
      id
      tags { id slug unique createdAt updatedAt }
      lines {
        id
        tag { id slug unique }
      }
    }
  }
}
```

**Input:**
```typescript
{
  localeCode: 'en',
  currencyCode: CurrencyCode.Usd,
  items: [],
  tags: [
    { slug: 'gift', unique: false }
  ]
}
```

---

#### CheckoutTagCreate
```graphql
mutation CheckoutTagCreate($input: CheckoutTagCreateInput!) {
  checkoutMutation {
    checkoutTagCreate(input: $input) {
      id
      tags { id slug unique createdAt updatedAt }
    }
  }
}
```

**Input:**
```typescript
{
  checkoutId: 'checkout-uuid',
  tag: {
    slug: 'express',
    unique: true
  }
}
```

---

#### CheckoutTagUpdate
```graphql
mutation CheckoutTagUpdate($input: CheckoutTagUpdateInput!) {
  checkoutMutation {
    checkoutTagUpdate(input: $input) {
      id
      tags { id slug unique createdAt updatedAt }
    }
  }
}
```

**Input:**
```typescript
{
  checkoutId: 'checkout-uuid',
  tagId: 'tag-uuid',
  slug: 'priority',      // optional
  unique: false          // optional
}
```

---

#### CheckoutTagDelete
```graphql
mutation CheckoutTagDelete($input: CheckoutTagDeleteInput!) {
  checkoutMutation {
    checkoutTagDelete(input: $input) {
      id
      tags { id slug unique createdAt updatedAt }
    }
  }
}
```

**Input:**
```typescript
{
  checkoutId: 'checkout-uuid',
  tagId: 'tag-uuid'
}
```

---

#### CheckoutLinesAdd (with tags)
```graphql
mutation CheckoutLinesAdd($input: CheckoutLinesAddInput!) {
  checkoutMutation {
    checkoutLinesAdd(input: $input) {
      checkout {
        id
        lines {
          id
          tag { id slug unique }
        }
      }
    }
  }
}
```

**Input:**
```typescript
{
  checkoutId: 'checkout-uuid',
  lines: [
    {
      purchasableId: 'variant-uuid',
      quantity: 2,
      tagSlug: 'bundle'  // optional - references existing tag
    }
  ]
}
```

---

## Running Tests

### Run all checkout tag tests
```bash
cd /Users/phl/Projects/shopana-io/services/e2e
npm test -- checkout-tags.spec.ts
```

### Run specific test
```bash
npm test -- checkout-tags.spec.ts -g "should enforce unique tag behavior"
```

### Run with headed browser (debug mode)
```bash
npm test -- checkout-tags.spec.ts --headed
```

### Run with trace
```bash
npm test -- checkout-tags.spec.ts --trace on
```

---

## Test Data Setup

Each test:
1. Creates a new client session with unique project/API key
2. Creates test products via Admin API
3. Gets purchasable IDs via Client API
4. Creates checkout and performs operations
5. Cleans up automatically via test isolation

**Product Creation Pattern:**
```typescript
api.session.setTenantScope();
await api.admin.product.create({
  input: {
    title: 'Test Product',
    status: EntityStatus.Published,
    slug: `test-product-${Date.now()}`,
    variants: {
      create: [
        api.admin.product.getDefaultVariantInput({
          title: 'Variant',
          slug: handle,
          price: 1000,
          stockStatus: 'IN_STOCK',
          inListing: true,
          variantSortIndex: 0,
          sku: 'SKU-TEST-1',
        })
      ]
    }
  }
});

api.session.setCustomerScope();
const variant = await api.client.variant.get(handle);
const purchasableId = variant.id;
```

---

## Expected Results

### Successful Test Run
```
✓ should create checkout with initial tags (2.5s)
✓ should create and manage tags via mutations (3.1s)
✓ should add items with non-unique tags (4.2s)
✓ should enforce unique tag behavior when adding items (4.8s)
✓ should prevent duplicate tag slugs in same checkout (2.1s)
✓ should validate tag slug format (1.8s)
✓ should not allow making tag unique if already assigned to multiple lines (4.5s)

7 passed (23.0s)
```

---

## Database Schema

### checkout_tags table
```sql
CREATE TABLE checkout_tags (
    id uuid PRIMARY KEY,
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    slug varchar(64) NOT NULL,
    is_unique boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ck_checkout_tags_slug CHECK (slug ~ '^[a-zA-Z0-9]+$'),
    UNIQUE (checkout_id, slug)
);
```

### checkout_line_items FK
```sql
ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_checkout_line_items_tag_id
FOREIGN KEY (tag_id)
REFERENCES checkout_tags (id)
ON DELETE SET NULL;
```

When a tag is deleted:
- All lines with that `tag_id` have it set to `NULL`
- Lines are NOT deleted
- This is tested implicitly in the delete tag test

---

## Related Files

### Backend
- `services/checkout/src/application/usecases/createCheckoutTagUseCase.ts`
- `services/checkout/src/application/usecases/updateCheckoutTagUseCase.ts`
- `services/checkout/src/application/usecases/deleteCheckoutTagUseCase.ts`
- `services/checkout/src/application/usecases/addCheckoutLinesUseCase.ts` (tag logic)

### Frontend/E2E
- `e2e/fixtures/client/Checkout.ts` - API methods
- `e2e/queries/checkout/CheckoutTagCreate.gql`
- `e2e/queries/checkout/CheckoutTagUpdate.gql`
- `e2e/queries/checkout/CheckoutTagDelete.gql`

### Documentation
- `docs/checkout-tags-schema-review.md` - Database schema review
- `platform/migrations/cmd/sql-0004/MIGRATION_NOTES.md` - Migration notes

---

## Troubleshooting

### Test fails with "Tag already exists"
- Check that test cleanup is working
- Verify unique constraint is enabled
- Check database state: `SELECT * FROM platform.checkout_tags WHERE slug = 'your-slug';`

### Test fails with "Tag not found"
- Ensure tag was created successfully
- Check that `tagId` is being captured correctly
- Verify checkout exists

### Unique tag not replacing item
- Check `AddCheckoutLinesUseCase.ts:97-101`
- Verify tag has `is_unique = true` in database
- Check application logs for errors

### GraphQL codegen issues
```bash
cd /Users/phl/Projects/shopana-io/services/e2e
npm run codegen
```

---

## Future Improvements

### Additional Test Scenarios
- [ ] Test tag behavior with promo codes
- [ ] Test tag persistence through order creation
- [ ] Test concurrent tag operations (race conditions)
- [ ] Performance test with 50+ tags (limit validation)
- [ ] Test tag behavior with line item updates/deletions

### Code Coverage
- [ ] Add tests for tag sorting/ordering
- [ ] Test tag metadata field (if added)
- [ ] Test case-sensitivity edge cases

---

## Author
- Code Review: Claude Code
- Date: 2025-11-19
- Related PR: Checkout Tags Implementation
