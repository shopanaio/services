import { test } from '@fixtures/base.extend';

test.describe('Collection storefront projection lifecycle', () => {
  test('publishes collection metadata and membership atomically for storefront reads', () => {
    // Wait for projection and read one coherent listing revision.
  });

  test('reflects manual membership changes after projection catches up', () => {
    // Add remove move and clear members across successive revisions.
  });

  test('reflects rule changes after projection catches up', () => {
    // Replace persisted rules and observe the new membership set.
  });

  test('reflects collection default sort changes', () => {
    // Update sort configuration and read the projected effective sort.
  });

  test('reflects publication and activity-window changes', () => {
    // Update visibility fields and query storefront entry points.
  });

  test('returns COLLECTION_INDEX_NOT_READY for a revision mismatch', () => {
    // Read products while catalog metadata is ahead of listing state.
  });

  test('does not serve stale membership during a revision mismatch', () => {
    // Assert failure instead of mixing new metadata with old products.
  });

  test('recovers automatically after the matching projection arrives', () => {
    // Retry the same query once listing revision catches up.
  });

  test('ignores an out-of-order stale collection projection', () => {
    // Deliver an older revision after a newer committed state.
  });

  test('handles duplicate collection events idempotently', () => {
    // Replay the same event sequence without changing results.
  });

  test('removes collection listing state after deletion', () => {
    // Project a tombstone and verify metadata and products disappear.
  });

  test('does not resurrect a deleted collection from a stale live event', () => {
    // Apply a late pre-delete snapshot after the tombstone.
  });

  test('keeps product lifecycle and collection membership projections coherent', () => {
    // Publish unpublish and delete a member around collection updates.
  });
});
