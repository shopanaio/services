import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API customer transaction history', () => {
  test('maps earned redeemed expired refunded and adjusted transactions', () => {
    // Seed each customer-visible ledger kind and verify stable type, direction, points, and timestamps.
  });

  test('hides activation reservation release merge and debt-recovery internals', () => {
    // Seed internal bucket transfers and verify they never appear or affect totalCount.
  });

  test('orders transactions newest first with a stable tie-breaker', () => {
    // Use equal occurredAt timestamps and verify deterministic ordering across repeated queries.
  });

  test('paginates transaction history without gaps or duplicates', () => {
    // Traverse first/after pages and verify cursors, pageInfo, totalCount, and end behavior.
  });

  test('returns absolute point amounts and correct credit or debit direction', () => {
    // Verify metadata and ledger-entry fallback paths both produce unsigned customer-visible amounts.
  });

  test('returns descriptions and expiry dates only when customer safe', () => {
    // Verify optional copy and expiry mapping without exposing reason codes, actor IDs, or internal metadata.
  });

  test('cannot resolve another customer transaction by an opaque node reference', () => {
    // Use a foreign entitlement/transaction reference path and verify not-found authorization semantics.
  });

  test('rejects invalid pagination arguments and cursors', () => {
    // Cover zero/negative/oversized first and malformed or foreign-connection cursors.
  });
});
