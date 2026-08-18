import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API program lifecycle', () => {
  test('creates a draft program with canonical defaults and metadata', () => {
    // Create a program and verify its code, currency, default flag, revision, metadata, and DRAFT state.
  });

  test('updates mutable program fields with optimistic concurrency', () => {
    // Update name, metadata, status, and default flag using the current revision and verify the revision increment.
  });

  test('rejects a stale expected program revision without partial changes', () => {
    // Submit an update with an old revision and verify a conflict user error and unchanged persisted state.
  });

  test('keeps program codes unique within a store', () => {
    // Create duplicate codes in one store and verify the second mutation fails without creating a program.
  });

  test('allows the same program code in different stores', () => {
    // Create equal codes in isolated stores and verify each store resolves only its own program.
  });

  test('enforces a single default program per store', () => {
    // Mark a second program as default and verify the documented replacement or rejection invariant atomically.
  });

  test('transitions a program through active paused and archived states', () => {
    // Exercise valid status transitions and verify timestamps, active version exposure, and revision changes.
  });

  test('rejects invalid transitions out of an archived program', () => {
    // Attempt to reactivate or edit an archived program and verify the terminal-state invariant.
  });

  test('replays program mutations idempotently and rejects conflicting payload reuse', () => {
    // Repeat the same idempotency key with equal and different payloads and verify replay versus conflict behavior.
  });
});
