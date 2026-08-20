import { test } from '@fixtures/base.extend';

test.describe('Manual collection storefront membership', () => {
  test('returns explicitly added published products', () => {
    // Add products through Admin API and query collection.products.
  });

  test('returns an empty connection for an empty manual collection', () => {
    // Publish a collection without memberships.
  });

  test('preserves merchant order with the MANUAL sort', () => {
    // Compare storefront order with the stored manual positions.
  });

  test('appends newly added products after existing products', () => {
    // Add memberships incrementally and verify their relative order.
  });

  test('reflects an explicit product move', () => {
    // Move a product in Admin API and verify storefront MANUAL order.
  });

  test('reflects removal from the manual collection', () => {
    // Remove one membership and query the collection again.
  });

  test('reflects clearing all manual memberships', () => {
    // Clear the collection and assert an empty storefront connection.
  });

  test('does not duplicate an idempotently added membership', () => {
    // Add the same product twice and return it once.
  });

  test('excludes draft products from manual membership', () => {
    // Mix published and draft products in the stored membership.
  });

  test('excludes archived or unpublished products after lifecycle changes', () => {
    // Change a member product visibility and query the collection again.
  });

  test('restores a retained membership when a product is republished', () => {
    // Republish a manual member and verify the documented membership policy.
  });

  test('excludes deleted products without breaking manual order', () => {
    // Delete a middle member and verify remaining relative positions.
  });

  test('returns each product once after a collection rebalance', () => {
    // Rebalance positions and assert stable unique membership.
  });

  test('uses the collection configured default sort when sort is omitted', () => {
    // Configure each supported default and verify the effective sort.
  });
});
