import { test } from '@fixtures/base.extend';

test('starts immediate dispatch after event persistence commits', () => {
  // Verify handlers can always reload the durable event by returned event ID.
});

test('routes an event to exact and catch-all single-event handlers', () => {
  // Verify registered services receive the canonical event and delivery metadata.
});

test('does not invoke batch-only handlers for immediate events', () => {
  // Verify immediate delivery uses only single handler contracts.
});

test('marks an event dispatched when all applicable handlers succeed', () => {
  // Verify dispatch result and persisted status counts converge.
});

test('marks an event dispatched when no handlers are registered', () => {
  // Verify an unconsumed event does not remain permanently dispatching.
});

test('replays an immediate dispatch without invoking a completed handler twice', () => {
  // Verify handler jobs are deterministic and durable.
});
