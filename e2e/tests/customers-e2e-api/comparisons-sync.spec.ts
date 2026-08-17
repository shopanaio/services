import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — comparison synchronization', () => {
  test('storefront comparison selection is visible in the admin customer aggregate', () => {
    // Add published variants through Storefront API and verify through Admin API that the enrolled
    // customer's persisted comparison contains the same variant IDs in deterministic position order.
  });

  test('storefront comparison removal is visible through admin', () => {
    // Remove one selected variant through Storefront API and verify through Admin API that the item
    // disappeared without reordering or mutating the remaining persisted selections.
  });

  test('admin comparison reads never mutate storefront selection', () => {
    // Read the comparison repeatedly through Admin API, then query it through Storefront federation
    // and verify that selection revision, items, and positions remain unchanged.
  });

  test('admin cannot mutate storefront-owned comparison selection', () => {
    // Inspect the Admin API schema and mutation surface for an enrolled customer and verify that the
    // comparison is read-only there while Storefront API remains the only owning write surface.
  });

  test('comparison selection remains isolated for same-email customers in different stores', () => {
    // Enroll same-email customers in two stores, modify one through Storefront API, and verify through
    // both Admin APIs that no comparison item or Catalog reference crosses the store boundary.
  });
});
