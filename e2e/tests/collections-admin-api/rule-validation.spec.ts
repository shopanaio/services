import { test } from '@fixtures/base.extend';

test('rejects a rule input with no typed branch', () => {
  // Verify INVALID_RULE identifies the rule array index.
});

test('rejects a rule input with multiple typed branches', () => {
  // Verify exactly one typed rule field is required.
});

test('rejects malformed category tag and vendor global IDs', () => {
  // Verify INVALID_ID is reported without persisting any rules.
});

test('rejects global IDs with the wrong entity type in reference rules', () => {
  // Verify each reference branch enforces its expected entity type.
});

test('rejects missing category references', () => {
  // Verify REFERENCE_NOT_FOUND and atomic rule replacement.
});

test('rejects missing tag references', () => {
  // Verify REFERENCE_NOT_FOUND and atomic rule replacement.
});

test('rejects missing vendor references', () => {
  // Verify REFERENCE_NOT_FOUND and atomic rule replacement.
});

test('rejects empty values for category tag vendor feature and option rules', () => {
  // Verify canonical set rules require at least one value.
});

test('deduplicates canonical values inside set rules', () => {
  // Verify repeated IDs and handle pairs are persisted once.
});

test('normalizes feature and option source and value handles', () => {
  // Verify canonical handle pairs are stored and returned.
});

test('rejects invalid feature and option handles', () => {
  // Verify INVALID_RULE includes the failing value path.
});

test('rejects a price range whose minimum exceeds its maximum', () => {
  // Verify INVALID_RULE and no partial rule replacement.
});

test('accepts equal bounds in an inclusive price range', () => {
  // Verify a single-price range is canonical and valid.
});

test('rejects a negative price amount', () => {
  // Verify minor-unit domain constraints.
});

test('rejects an unsupported or malformed currency code', () => {
  // Verify GraphQL and canonical currency validation.
});

test('rejects a created-at range whose from value is after to', () => {
  // Verify INVALID_RULE identifies the invalid date range.
});

test('accepts equal instants in an inclusive created-at range', () => {
  // Verify a single-instant range is canonical and valid.
});

test('normalizes created-at instants to the canonical representation', () => {
  // Verify equivalent offsets produce stable rule values and hashes.
});

test('rejects invalid created-at instants', () => {
  // Verify invalid DateTime input cannot reach persistence.
});

test('rejects more than thirty-two rules', () => {
  // Verify the maximum rule count is enforced atomically.
});

test('rejects more than one hundred feature or option values in one rule', () => {
  // Verify the per-rule value limit.
});

test('rejects more than two hundred fifty-six set values across rules', () => {
  // Verify the aggregate set-value limit.
});

test('rejects a canonical rule payload larger than sixty-four KiB', () => {
  // Verify serialized rule-size protection.
});

test('reports the exact nested field path for invalid rules', () => {
  // Verify clients can map validation failures to the rule editor.
});

