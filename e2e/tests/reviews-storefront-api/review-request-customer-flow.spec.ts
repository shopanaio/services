import { test } from '@fixtures/base.extend';

test('reads a review request only for its authenticated owning customer', () => {
  // Verify product order status expiry channel and safe call-to-action fields.
});

test('hides another customer expired revoked or cross-store review request', () => {
  // Verify request tokens and identity are not disclosed.
});

test('uses an eligible request to prefill and verify one review submission', () => {
  // Verify product order line customer and store binding.
});

test('rejects request use after completion cancellation expiry or prior consumption', () => {
  // Verify no duplicate verified review or incentive is created.
});

test('marks request opened and completed through monotonic lifecycle events', () => {
  // Verify repeated reads or submission replays do not duplicate events.
});

test('keeps delivery provider metadata and secret request token private', () => {
  // Verify only customer-facing request data reaches Storefront GraphQL.
});
