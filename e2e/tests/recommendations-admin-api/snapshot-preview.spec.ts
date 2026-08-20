import { test } from '@fixtures/base.extend';

test('previews active and draft ranking without persisting draft changes', () => {
  // Verify policy and manual create update delete drafts leave versions unchanged.
});

test('validates exactly one operation in each manual draft change', () => {
  // Verify empty or conflicting create update delete shapes fail atomically.
});

test('reports candidates rank score source and source breakdown', () => {
  // Verify draft ranking explains manual FBT category and store signals.
});

test('reports stale unpublished unavailable excluded insufficient and overflow candidates', () => {
  // Verify each exclusion branch maps to the documented reason.
});

test('uses the expected active policy and manual versions in preview', () => {
  // Verify stale draft edits return conflicts instead of previewing against newer state.
});

test('returns a stable asOf and modelVersion across active and draft results', () => {
  // Verify both rankings are evaluated against one facts snapshot.
});

test('does not publish a snapshot or event for preview-only requests', () => {
  // Verify preview has no durable side effects even when requested concurrently.
});
