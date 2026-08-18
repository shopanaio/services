import { test } from '@fixtures/base.extend';

test.describe('Loyalty maintenance and expiration end to end', () => {
  test('activates versions lots and storefront values at exact boundaries', () => {
    // Run maintenance before/at/after due time and verify Admin state plus Storefront projection atomically.
  });

  test('expires points and removes them from storefront upcoming expirations', () => {
    // Expire a lot and verify debit audit, balances, history category, and expiration projection.
  });

  test('expires monetary lots reservations rewards and memberships', () => {
    // Seed every due entity type and verify terminal state plus customer-facing removal/restoration.
  });

  test('processes bounded batches without starvation gaps or duplicates', () => {
    // Seed more records than limit, run repeatedly, and verify deterministic complete progress.
  });

  test('is safe when multiple maintenance runs overlap', () => {
    // Race identical due work and verify one transition/economic event per entity.
  });

  test('rebuilds corrupted projections without changing customer-visible history', () => {
    // Rebuild point and monetary balances and verify Storefront values recover from immutable ledgers.
  });

  test('keeps maintenance idempotent after all work is complete', () => {
    // Repeat the same and new idempotency keys with no due work and verify zero counters/no new audit rows.
  });
});
