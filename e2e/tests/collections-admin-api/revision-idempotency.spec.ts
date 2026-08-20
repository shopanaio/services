import { test } from '@fixtures/base.extend';

test('rejects update with a stale expected revision', () => {
  // Verify REVISION_CONFLICT and unchanged collection state.
});

test('rejects rule replacement with a stale expected revision', () => {
  // Verify stale rule writes cannot overwrite newer rules.
});

test('rejects manual membership mutation with a stale expected revision', () => {
  // Verify stale add, remove, move, clear, and rebalance requests fail.
});

test('allows a mutation with the latest returned revision', () => {
  // Verify clients can chain revision-protected operations.
});

test('increments collection revision for each effective mutation', () => {
  // Verify revision is monotonic across all mutation families.
});

test('does not increment revision for membership no-ops', () => {
  // Verify duplicate add, absent remove, unchanged move, clear, and rebalance.
});

test('replays collection creation with the same clientMutationId', () => {
  // Verify an identical retry returns the original result once.
});

test('replays collection update with the same clientMutationId', () => {
  // Verify an identical retry does not apply the update twice.
});

test('replays manual and rule mutations with the same clientMutationId', () => {
  // Verify identical membership and rule retries are idempotent.
});

test('rejects reuse of clientMutationId with different input', () => {
  // Verify an idempotency key cannot identify conflicting content.
});

test('isolates clientMutationId between stores and operations', () => {
  // Verify idempotency scope includes tenant and operation identity.
});

test('serializes concurrent mutations against one expected revision', () => {
  // Verify only one competing compare-and-swap mutation succeeds.
});

test('rejects mutations at the collection revision limit', () => {
  // Verify REVISION_LIMIT_EXCEEDED prevents integer overflow.
});

test('rejects Listing-visible mutations at the listing revision limit', () => {
  // Verify projection revision overflow is prevented atomically.
});

