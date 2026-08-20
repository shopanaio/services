import { test } from '@fixtures/base.extend';

test('lists collections for the current store', () => {
  // Verify connection edges contain only store-owned collections.
});

test('includes drafts scheduled and inactive collections in admin list', () => {
  // Verify admin listing is not filtered by storefront eligibility.
});

test('returns an empty connection when the store has no collections', () => {
  // Verify empty edges, totalCount, and terminal pageInfo.
});

test('paginates collections forward', () => {
  // Verify first and after produce stable non-overlapping pages.
});

test('paginates collections backward', () => {
  // Verify last and before produce stable non-overlapping pages.
});

test('returns correct collection connection cursors and page info', () => {
  // Verify cursor opacity and both page-direction flags.
});

test('returns totalCount independent of page size', () => {
  // Verify totalCount represents the full scoped result.
});

test('keeps pagination stable when collections share timestamps', () => {
  // Verify the keyset tie-breaker prevents gaps or duplicates.
});

test('rejects malformed collection pagination cursors', () => {
  // Verify invalid cursors fail with the standard GraphQL input contract.
});

test('rejects invalid collection pagination argument combinations', () => {
  // Verify unsupported first/last and cursor combinations are rejected.
});

test('does not list soft-deleted collections', () => {
  // Verify deletion removes a collection from admin connections.
});

test('does not leak collections from another organization or store', () => {
  // Verify tenant boundaries for connection rows and totalCount.
});

