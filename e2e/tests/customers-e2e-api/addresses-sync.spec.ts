import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — address synchronization', () => {
  test('admin-created addresses and defaults are visible through storefront', () => {
    // Create shipping and billing addresses through Admin API, assign independent defaults, and
    // verify their normalized public representation and default flags through Storefront API.
  });

  test('storefront-created address is visible through admin', () => {
    // Create a complete address through Storefront API and verify through Admin API that the same
    // global ID, normalized fields, validation metadata, owner, and revision were persisted.
  });

  test('admin address update is reflected in storefront without leaking admin-only data', () => {
    // Update an enrolled customer's address through Admin API and verify that Storefront API sees
    // the new public fields while retaining the storefront-safe address contract.
  });

  test('storefront default change is reflected in admin aggregate', () => {
    // Change shipping and billing defaults through Storefront API and verify through Admin API that
    // the previous defaults were cleared atomically and the customer revision advanced once.
  });

  test('deleting an address through either API clears shared defaults consistently', () => {
    // Delete a default address through one API, read the customer through the other API, and verify
    // that the address disappeared and every affected default reference was cleared.
  });

  test('admin and storefront cannot mutate each other with stale address revisions', () => {
    // Update the address aggregate through one API, retry a write through the other with the old
    // customer revision, and verify a conflict with no partial address or default changes.
  });
});
