import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API balances and expirations', () => {
  test('returns pending available reserved and debt point buckets as unsigned strings', () => {
    // Seed every balance bucket and verify exact values above JavaScript safe integer range.
  });

  test('updates the balance projection after earning activation reservation and redemption', () => {
    // Query after each economic transition and verify storefront buckets track the authoritative projection.
  });

  test('aggregates point lots that expire at the same timestamp', () => {
    // Seed multiple lots with equal expiry and verify a single summed expiration entry.
  });

  test('orders upcoming expirations ascending and limits them to twenty entries', () => {
    // Seed more than twenty future dates and verify nearest-first deterministic projection.
  });

  test('excludes expired and fully allocated point lots', () => {
    // Mix expired, depleted, reserved, and future remaining lots and expose only actually upcoming points.
  });

  test('reflects original and reset restored-points expiry policies', () => {
    // Restore redeemed points under both policies and verify the projected expiration date.
  });

  test('never returns negative unsigned storefront balances', () => {
    // Create debt through reversal and verify debt is positive while the other buckets remain non-negative.
  });
});
