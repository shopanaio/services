import { test } from '@fixtures/base.extend';

test('computes product review count average distribution and criterion summaries', () => {
  // Verify only currently eligible published reviews contribute.
});

test('computes product question answered and unanswered summaries', () => {
  // Verify accepted official and published answer state semantics.
});

test('refreshes summaries after review question answer and moderation changes', () => {
  // Verify event-driven projection applies each revision exactly once.
});

test('removes unpublished deleted and redacted content from public aggregates', () => {
  // Verify stale projection work cannot reintroduce excluded content.
});

test('returns Admin product widget data through the shared widget namespace', () => {
  // Verify review and question summaries compose for an authorized product.
});

test('isolates summary projections by store product market and configured scope', () => {
  // Verify same product references in another tenant cannot affect aggregates.
});

test('rebuilds summaries idempotently from canonical content state', () => {
  // Verify maintenance repairs drift without double counting.
});
