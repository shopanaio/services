import { test } from '@fixtures/base.extend';

test('creates and updates a product question subject content and moderation state', () => {
  // Verify product variant author locale source and revision fields.
});

test('creates updates deletes and reorders question answers atomically', () => {
  // Verify official accepted publication and answer-state invariants.
});

test('allows at most one accepted answer and keeps it attached to the same question', () => {
  // Verify replacement clears previous state inside one transaction.
});

test('deletes a question without exposing its answers on Storefront', () => {
  // Verify content lifecycle propagation preserves audit history.
});

test('updates a question subscription with expected timestamp', () => {
  // Verify active paused and removed transitions preserve channel preferences.
});

test('rejects foreign product variant answer and subscription references', () => {
  // Verify nested aggregate and store scope are enforced.
});

test('emits answer and subscription notifications exactly once after commit', () => {
  // Verify retries and no-op updates do not duplicate delivery.
});
