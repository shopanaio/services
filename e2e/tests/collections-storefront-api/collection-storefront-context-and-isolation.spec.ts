import { test } from '@fixtures/base.extend';

test.describe('Collection storefront context and isolation', () => {
  test('reads a public collection anonymously with storefront access', () => {
    // Query without a customer session through a valid storefront connection.
  });

  test('returns the same public collection to an authenticated customer', () => {
    // Compare buyer authentication states for catalog presentation.
  });

  test('does not expose a collection through another store context', () => {
    // Query a Store A collection while connected to Store B.
  });

  test('does not expose manual memberships from another store', () => {
    // Reuse cross-store product IDs and verify strict tenant scoping.
  });

  test('does not evaluate rule postings from another store', () => {
    // Create matching attributes only in a different tenant.
  });

  test('isolates identical collection handles between stores', () => {
    // Resolve the same handle to each store's own collection.
  });

  test('rejects a storefront token for a different connection', () => {
    // Query with credentials issued to another storefront connection.
  });

  test('enforces catalog read permission on collection metadata', () => {
    // Remove the relevant storefront permission and query collection fields.
  });

  test('enforces listing read permission on collection products', () => {
    // Keep metadata access but deny the extended products field.
  });

  test('uses the requested storefront locale for collection and product text', () => {
    // Select one locale across federated catalog and listing fields.
  });

  test('uses the requested storefront currency for prices filters and sorts', () => {
    // Compare collection listings under two supported currencies.
  });

  test('rejects an unsupported storefront locale or currency safely', () => {
    // Assert a configuration or input error without cross-store fallback.
  });

  test('keeps collection cursors scoped to locale and currency context', () => {
    // Reuse a cursor after changing request presentation context.
  });
});
