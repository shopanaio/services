import { test } from '@fixtures/base.extend';

test.describe('Storefront checkout customer and context', () => {
  test('updates customer identity and refreshes buyer eligibility', () => {
    // TODO: Verify identity and eligibility-dependent totals.
  });

  test('clears optional customer identity fields', () => {
    // TODO: Verify null fields are removed from the snapshot.
  });

  test('uses authenticated customer ownership instead of caller-supplied customer IDs', () => {
    // TODO: Verify identity spoofing is impossible.
  });

  test('adds, updates, and clears a customer note without recalculation', () => {
    // TODO: Verify note persistence and unchanged revision policy.
  });

  test('updates locale and reruns the complete checkout pipeline', () => {
    // TODO: Verify localized messages and new result revision.
  });

  test('updates currency and reruns the complete checkout pipeline', () => {
    // TODO: Verify all money uses the requested store currency.
  });

  test('rejects a currency unsupported by the store or checkout context', () => {
    // TODO: Verify no partial snapshot is committed.
  });

  test('preserves billing address independently from delivery destinations', () => {
    // TODO: Verify payment billing projection.
  });

  test('updates and clears the billing address', () => {
    // TODO: Verify null clears the normalized address.
  });

  test('does not leak customer PII through issues, provider data, or logs', () => {
    // TODO: Assert only storefront-safe error fields are returned.
  });
});
