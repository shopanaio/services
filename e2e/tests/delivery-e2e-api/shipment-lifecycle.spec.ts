import { test } from '@fixtures/base.extend';

test('creates one shipment from a valid order fulfillment plan', () => {
  // Verify packages origin destination service and immutable route snapshots reach the provider.
});

test('rejects shipment creation for uncommitted mismatched or already shipped fulfillment facts', () => {
  // Verify Delivery cannot ship quantities outside the Orders fulfillment plan.
});

test('returns the same shipment for an idempotent create replay', () => {
  // Verify the provider is invoked at most once for identical content.
});

test('moves asynchronous create operations from pending to succeeded or failed', () => {
  // Verify operation completion is correlated to the trusted provider call.
});

test('cancels a cancellable shipment and updates Orders fulfillment projection', () => {
  // Verify provider cancellation and local state transition converge exactly once.
});

test('rejects cancellation after a terminal or non-cancellable provider state', () => {
  // Verify invalid transitions do not enqueue provider work or domain events.
});

test('reconciles provider truth without moving shipment state backward', () => {
  // Verify monotonic transition policy and timestamp ordering.
});

test('returns shipment state only inside the owning store scope', () => {
  // Verify shipment lookup protects provider data labels tracking and recipient details.
});
