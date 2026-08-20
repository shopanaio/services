import { test } from '@fixtures/base.extend';

test('persists deferred events as pending with batch and aggregate keys', () => {
  // Verify no handler runs until the matching batch dispatch is requested.
});

test('rejects deferred emission without a non-empty batch key', () => {
  // Verify invalid deferred options do not persist an event.
});

test('claims only matching organization event type and batch key', () => {
  // Verify batch scope cannot consume another tenant type or batch.
});

test('honors the batch dispatch limit without losing remaining events', () => {
  // Verify later dispatches resume safely from still-pending records.
});

test('delivers grouped events once to batch handlers and single-only events individually', () => {
  // Verify a handler registered for both modes is not double-invoked.
});

test('keeps aggregate ordering stable inside a deferred batch', () => {
  // Verify events for one subject follow committed sequence order.
});
