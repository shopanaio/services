import { test } from '@fixtures/base.extend';

test('reads a collection by global ID', () => {
  // Verify every admin collection field is returned from the current store.
});

test('returns null for a missing collection ID', () => {
  // Verify a well-formed but unknown ID does not raise a GraphQL error.
});

test('returns null for a malformed collection ID', () => {
  // Verify invalid global IDs are handled safely by the query.
});

test('returns null for a global ID of another entity type', () => {
  // Verify global ID type isolation on collection lookup.
});

test('does not read a collection owned by another store', () => {
  // Verify store scoping for ID lookup.
});

test('reads a collection by normalized handle', () => {
  // Verify handle lookup returns the same collection as ID lookup.
});

test('returns null for an unknown collection handle', () => {
  // Verify missing handles return null without user errors.
});

test('does not read a collection handle from another store', () => {
  // Verify handle lookup is scoped to the current store.
});

test('reads draft scheduled and inactive collections in admin API', () => {
  // Verify admin visibility is independent of storefront eligibility.
});

test('returns manual collections with an empty rules list', () => {
  // Verify manual membership never exposes persisted rule data.
});

test('returns rule implementations with typed fields', () => {
  // Verify field discriminators, typenames, values, and sort indexes.
});

test('reports valid references for live category tag and vendor rules', () => {
  // Verify referenced entities produce VALID referenceStatus.
});

test('reports stale references after a referenced entity is deleted', () => {
  // Verify persisted rules remain readable with STALE referenceStatus.
});

test('reports not applicable references for scalar and handle rules', () => {
  // Verify non-entity rules produce NOT_APPLICABLE referenceStatus.
});

test('returns isActive at inclusive start and exclusive end boundaries', () => {
  // Verify activity-window boundary semantics.
});

test('returns isPublished only when publishedAt is not in the future', () => {
  // Verify publication status is derived from its timestamp.
});

