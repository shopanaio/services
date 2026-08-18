import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API program versions', () => {
  test('creates a complete draft version with earning and redemption policies', () => {
    // Verify every conversion, limit, rounding, refund, debt, expiry, and effective-date field is persisted.
  });

  test('updates and clears every optional draft version field', () => {
    // Exercise effectiveTo, pointsExpiryDays, and maximumRedeemPointsPerOrder value and clear semantics.
  });

  test('publishes a version immediately and activates its program', () => {
    // Publish at the current effective time and verify immutable publication metadata and activeVersion linkage.
  });

  test('publishes a future version as scheduled', () => {
    // Publish with a future effectiveFrom and verify SCHEDULED state until maintenance activates it.
  });

  test('retires the previous version when a successor becomes effective', () => {
    // Activate a successor and verify exactly one effective version and preserved historical versions.
  });

  test('rejects overlapping effective version ranges', () => {
    // Publish intersecting schedules and verify a user error without changing either version.
  });

  test('rejects an effectiveTo that is not later than effectiveFrom', () => {
    // Check equal and reversed boundaries and verify field-specific validation errors.
  });

  test('rejects invalid earning and redemption conversion ratios', () => {
    // Cover zero, negative, malformed BigInt, and internally inconsistent conversion operands.
  });

  test('validates redemption minimum maximum and percentage boundaries', () => {
    // Cover minimum greater than maximum and percentage basis points outside the supported range.
  });

  test('supports every rounding refund debt and restored-expiry policy', () => {
    // Persist each enum option and verify the selected policy is returned unchanged.
  });

  test('keeps published versions immutable', () => {
    // Attempt update and delete mutations after publication and verify no historical policy is modified.
  });

  test('deletes only an unpublished draft version', () => {
    // Delete a draft, verify its node no longer resolves, and preserve the parent program revision invariant.
  });

  test('rejects publishing with stale cross-service references', () => {
    // Make a referenced segment or catalog entity stale after draft editing and verify publication revalidates it.
  });

  test('replays create update publish and delete idempotently', () => {
    // Verify stable results for identical retries and conflicts for reused keys with changed requests.
  });
});
