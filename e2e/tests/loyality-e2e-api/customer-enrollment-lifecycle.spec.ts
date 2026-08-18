import { test } from '@fixtures/base.extend';

test.describe('Loyalty customer lifecycle across Admin and Storefront', () => {
  test('opens a loyalty account from the first eligible customer event', () => {
    // Publish a program, emit an eligible event, verify Admin account creation and Storefront account visibility.
  });

  test('does not open an account for an ineligible channel or audience', () => {
    // Exercise channel, missing segment, and excluded segment decisions and verify no customer account projection.
  });

  test('suspends and reactivates an account consistently across both APIs', () => {
    // Change status through Admin and verify storefront status/opportunities plus economic-operation restrictions.
  });

  test('closes an account while retaining immutable admin audit history', () => {
    // Close through Admin, verify storefront behavior, and preserve balances, transactions, and timestamps.
  });

  test('merges customer accounts without rewriting source ledgers', () => {
    // Merge customers, transfer economic control, hide the source storefront account, and verify Admin links/history.
  });

  test('handles customer deletion by removing access but retaining non-PII audit data', () => {
    // Delete a customer and verify storefront denial, stable economic rows, and cleared customer linkage semantics.
  });

  test('closes all store loyalty state through the durable store deletion workflow', () => {
    // Delete a store, verify account/wallet closure and no remaining storefront access with replay-safe progress.
  });

  test('processes duplicate lifecycle events exactly once', () => {
    // Redeliver open/merge/delete events and verify stable account identity, balances, and event history.
  });
});
