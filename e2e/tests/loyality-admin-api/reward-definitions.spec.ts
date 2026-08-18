import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API reward definitions', () => {
  test('creates POINTS reward definitions', () => {
    // Persist points quantity, presentation copy, validity, and issuance limits.
  });

  test('creates VOUCHER FIXED_DISCOUNT and PERCENTAGE_DISCOUNT definitions', () => {
    // Verify type-specific configuration and immutable Pricing/Checkout reference data.
  });

  test('creates FREE_SHIPPING and FREE_PRODUCT definitions', () => {
    // Cover product-only and product-plus-variant rewards with quantity and catalog reference validation.
  });

  test('creates MEMBER_BENEFIT definitions', () => {
    // Persist a stable benefit code and localized presentation configuration.
  });

  test('creates CASHBACK and STORE_CREDIT monetary definitions', () => {
    // Use MONETARY_CREDIT with both wallet types, currencies, and integer minor-unit amounts.
  });

  test('validates start end and validity-day boundaries', () => {
    // Cover future starts, exclusive ends, invalid ranges, zero/negative validity, and mutually consistent fields.
  });

  test('enforces global issuance and per-account limits', () => {
    // Verify limits are non-negative decimal strings and usage cannot exceed either cap.
  });

  test('updates and clears all optional fields on draft definitions', () => {
    // Exercise name, type, configuration, dates, validity, and both limit clear flags.
  });

  test('deletes unused draft definitions and protects referenced definitions', () => {
    // Verify rule/tier references prevent unsafe deletion and published definitions are immutable.
  });

  test('keeps definition codes unique within one version', () => {
    // Check duplicate-code rejection and reuse in a separate immutable program version.
  });

  test('rejects malformed configurations and cross-store references atomically', () => {
    // Cover missing type-specific fields, invalid monetary values, and foreign product/variant IDs.
  });
});
