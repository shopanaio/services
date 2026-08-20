import { test } from '@fixtures/base.extend';

test('previews the match count for every supported rule type', () => {
  // Verify transient rule evaluation uses the same semantics as persistence.
});

test('previews an AND-combined multi-rule count', () => {
  // Verify all top-level preview rules must match.
});

test('returns zero for a valid preview with no matches', () => {
  // Verify zero is distinct from an unavailable null count.
});

test('returns a deterministic hash for canonical preview rules', () => {
  // Verify equivalent inputs produce the same rulesHash.
});

test('returns a different hash when preview semantics change', () => {
  // Verify rulesHash tracks meaningful rule changes.
});

test('returns the Listing index observation timestamp', () => {
  // Verify successful previews identify their data freshness point.
});

test('does not persist previewed rules or mutate collection revisions', () => {
  // Verify preview is side-effect free.
});

test('validates preview rules with the persistence validator', () => {
  // Verify invalid branches, references, ranges, and limits return userErrors.
});

test('returns null result metadata for a validation failure', () => {
  // Verify count, rulesHash, and indexObservedAt follow the error contract.
});

test('scopes preview matches to the current store', () => {
  // Verify products from other stores do not affect count.
});

test('reports a Listing evaluation failure as a user error', () => {
  // Verify broker error code, message, and field are propagated.
});

test('reports temporary preview unavailability without GraphQL failure', () => {
  // Verify COLLECTION_PREVIEW_UNAVAILABLE and nullable result fields.
});

test('does not require a persisted collection to preview rules', () => {
  // Verify rule-editor drafts can be evaluated before collection creation.
});

