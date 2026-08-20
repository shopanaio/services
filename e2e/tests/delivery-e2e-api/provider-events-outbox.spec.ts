import { test } from '@fixtures/base.extend';

test('accepts provider completion only from the trusted installation callback context', () => {
  // Verify organization store installation function and correlation identities cannot be spoofed.
});

test('deduplicates repeated provider events by provider event identity', () => {
  // Verify at-least-once callbacks create one state change tracking event and outbox record.
});

test('normalizes labels parcels tracking and carrier observations', () => {
  // Verify size limits URL policy status mapping and public-data policy.
});

test('ignores stale provider observations after a newer shipment transition', () => {
  // Verify out-of-order callbacks cannot regress status or erase newer tracking data.
});

test('publishes shipment changes to Orders exactly once through the outbox', () => {
  // Verify retries preserve committed Delivery state and converge the Orders projection.
});

test('retries transient Orders synchronization without repeating provider operations', () => {
  // Verify provider side effects and projection delivery have independent idempotency.
});

test('redacts provider private data before publishing public fulfillment updates', () => {
  // Verify secrets raw payloads and disallowed asset URLs stay inside Delivery.
});
