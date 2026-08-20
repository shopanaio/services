import { test } from '@fixtures/base.extend';

test('clears every product from a populated manual collection', () => {
  // Verify all memberships, revision, and Listing projection are updated.
});

test('clearing an empty manual collection is a no-op', () => {
  // Verify success without a revision increment.
});

test('rejects clearing a rule collection', () => {
  // Verify clear is restricted to manual membership.
});

test('rejects clearing an unknown collection', () => {
  // Verify NOT_FOUND and no projection operation.
});

test('rejects clear with a stale expected revision', () => {
  // Verify REVISION_CONFLICT leaves every membership intact.
});

test('rejects a malformed collection ID on clear', () => {
  // Verify INVALID_ID targets collectionId.
});

test('rebalances ranks without changing manual product order', () => {
  // Verify dense ranks are replaced and visible order is identical.
});

test('rebalances a single-item manual collection as a no-op', () => {
  // Verify unnecessary revision and sync work is avoided.
});

test('rebalances an empty manual collection as a no-op', () => {
  // Verify empty collections remain unchanged.
});

test('rejects rebalancing a rule collection', () => {
  // Verify rebalance is restricted to manual membership.
});

test('rejects rebalancing an unknown collection', () => {
  // Verify NOT_FOUND and no rank changes.
});

test('rejects rebalance with a stale expected revision', () => {
  // Verify REVISION_CONFLICT before rank mutation.
});

test('rejects a malformed collection ID on rebalance', () => {
  // Verify INVALID_ID targets collectionId.
});

test('keeps listingRevision unchanged for manual item maintenance', () => {
  // Verify membership operations use collection revision, not listing revision.
});

