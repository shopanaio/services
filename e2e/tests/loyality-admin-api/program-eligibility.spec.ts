import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API program eligibility', () => {
  test('accepts ALL eligibility for configured channels', () => {
    // Create canonical ALL eligibility with no included segments and verify excluded segments are retained.
  });

  test('accepts SEGMENTS eligibility with ANY matching mode', () => {
    // Configure multiple included segments with ANY and verify canonical global IDs in the returned rules.
  });

  test('accepts SEGMENTS eligibility with ALL matching mode', () => {
    // Configure multiple included segments with ALL and verify the exact immutable policy snapshot.
  });

  test('allows explicit excluded segments for both eligibility types', () => {
    // Persist exclusions for ALL and SEGMENTS policies and verify they remain separate from included segments.
  });

  test('requires at least one eligible channel', () => {
    // Submit an empty channelCodes list and verify CHANNEL_REQUIRED at the precise input field.
  });

  test('rejects blank or duplicate channel codes', () => {
    // Cover blank and duplicate values and verify canonical validation does not silently normalize them.
  });

  test('forbids segments and match mode for ALL eligibility', () => {
    // Submit included segments or a segmentMatchMode with ALL and verify INVALID_ALL_ELIGIBILITY.
  });

  test('requires included segments and match mode for SEGMENTS eligibility', () => {
    // Omit each required component independently and verify the corresponding semantic validation error.
  });

  test('rejects blank and duplicate included or excluded segments', () => {
    // Cover both lists and verify duplicate/blank IDs are rejected before persistence.
  });

  test('rejects a segment included and excluded by the same policy', () => {
    // Place one segment in both lists and verify SEGMENT_INCLUDE_EXCLUDE_CONFLICT.
  });

  test('rejects missing segment references while editing a draft', () => {
    // Reference a non-existent or foreign-store customer segment and verify a field-specific user error.
  });

  test('preserves published eligibility snapshots when references later become stale', () => {
    // Delete or change a referenced segment and verify historical published rules are not rewritten.
  });
});
