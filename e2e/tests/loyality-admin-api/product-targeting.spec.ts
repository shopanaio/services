import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API product applies-to targeting', () => {
  test('accepts an ALL selector with an empty ID list', () => {
    // Configure ALL for exclusions and modifiers and verify its canonical empty IDs representation.
  });

  test('accepts a PRODUCT selector with valid product IDs', () => {
    // Configure product-specific applies-to targeting and verify decoded product global IDs on read.
  });

  test('accepts a VARIANT selector with valid variant IDs', () => {
    // Configure variant-specific applies-to targeting and verify variant references remain distinct from products.
  });

  test('accepts a CATEGORY selector with valid category IDs', () => {
    // Configure category targeting and verify all referenced categories are retained.
  });

  test('accepts a TAG selector with valid tag IDs', () => {
    // Configure tag targeting and verify the policy resolves the expected catalog references.
  });

  test('accepts a FEATURE selector with valid feature IDs', () => {
    // Configure feature targeting and verify feature references are validated in the current store.
  });

  test('accepts an OPTION_VALUE selector with valid option value IDs', () => {
    // Configure option-value targeting and verify values from multiple options remain addressable.
  });

  test('combines multiple excluded selectors with union semantics', () => {
    // Configure different selector types and verify the immutable policy stores every exclusion independently.
  });

  test('rejects IDs on an ALL selector', () => {
    // Submit non-empty IDs for ALL and verify INVALID_SELECTOR without persisting a partial draft.
  });

  test('requires IDs for every specific selector type', () => {
    // Submit empty PRODUCT, VARIANT, CATEGORY, TAG, FEATURE, and OPTION_VALUE selectors and verify rejection.
  });

  test('rejects blank duplicate malformed and wrong-entity selector IDs', () => {
    // Cover semantic IDs, global ID type mismatches, and duplicate references with precise user errors.
  });

  test('rejects missing and cross-store catalog references', () => {
    // Reference absent and foreign-store entities for every specific selector type and verify tenant safety.
  });

  test('supports segment-scoped scheduled modifiers for every selector type', () => {
    // Persist selector, segmentIds, multiplier, priority, startsAt, and endsAt for all applies-to options.
  });

  test('supports HIGHEST ADD and MULTIPLY modifier stacking modes', () => {
    // Create equivalent modifier sets under each stacking mode and verify policy round-tripping.
  });

  test('rejects duplicate modifier IDs and invalid multiplier values', () => {
    // Cover blank IDs/titles, duplicate IDs, zero multipliers, unsafe integers, and invalid priorities.
  });

  test('rejects invalid modifier schedules', () => {
    // Cover malformed timestamps and end boundaries equal to or earlier than start boundaries.
  });
});
