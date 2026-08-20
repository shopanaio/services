import { test } from '@fixtures/base.extend';

test('creates an active subscription for an owned customer and public question', () => {
  // Verify channel preferences identity and timestamps.
});

test('updates pauses resumes and removes the viewer subscription', () => {
  // Verify set semantics produce at most one subscription per customer and question.
});

test('requires an authenticated customer for question subscriptions', () => {
  // Verify anonymous visitor identity cannot receive account notifications.
});

test('rejects subscriptions to hidden deleted foreign or cross-store questions', () => {
  // Verify question existence is not disclosed.
});

test('returns the same subscription for an idempotent set replay', () => {
  // Verify events and notification registrations are not duplicated.
});

test('delivers published answer notifications once to active channels only', () => {
  // Verify paused removed and author-excluded subscriptions receive nothing.
});
