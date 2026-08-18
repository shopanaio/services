import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API customer account', () => {
  test('returns the authenticated customer active loyalty account', () => {
    // Query Customer.loyaltyAccount and verify customer-safe identity, status, balances, tier, and projections.
  });

  test('returns null when the store has no active loyalty program', () => {
    // Query an enrolled customer before publication and after program pause/archive without exposing drafts.
  });

  test('returns null when the customer has no account in the active program', () => {
    // Authenticate a customer without enrollment and verify the nullable account contract.
  });

  test('does not expose a merged account', () => {
    // Resolve a merged source customer and verify only the surviving account can become visible.
  });

  test('does not expose another customer account through a federation reference', () => {
    // Submit another customer ID while authenticated and verify federation identity is not an authorization grant.
  });

  test('isolates loyalty accounts by storefront store', () => {
    // Use the same customer across stores and verify each storefront resolves only its store-scoped account.
  });

  test('handles suspended closed and blocked customer states safely', () => {
    // Verify documented status visibility while disallowing opportunities and usable economic actions.
  });

  test('requires storefront loyalty read permission', () => {
    // Remove LOYALTY_READ from the storefront credential and verify the field is denied without data leakage.
  });
});
