import { test } from '@fixtures/base.extend';

test('resolves customer and anonymous identities only from trusted storefront context', () => {
  // Verify GraphQL inputs and untrusted headers cannot impersonate another viewer.
});

test('isolates reviews questions requests votes subscriptions and reports by store', () => {
  // Verify every direct nested and federated lookup includes tenant scope.
});

test('keeps request-local Reviews loaders isolated across viewers locales and stores', () => {
  // Verify concurrent reads cannot leak ownership vote or subscription state.
});

test('allows one winner for concurrent expected-revision customer edits', () => {
  // Verify stale operations return stable retryable conflicts.
});

test('binds idempotency to viewer store operation content and payload', () => {
  // Verify reuse across another content or changed input is rejected.
});

test('emits events only for committed Storefront mutations', () => {
  // Verify validation authorization conflict and exact replay have no duplicate side effects.
});

test('returns stable code field message and retryability for business errors', () => {
  // Verify clients can distinguish validation ownership conflict policy and dependency failures.
});
