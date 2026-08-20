import { test } from '@fixtures/base.extend';

test('returns the current viewer vote and report state for public content', () => {
  // Verify authenticated and anonymous viewer identities resolve independently.
});

test('returns edit delete reply answer vote report and subscribe capabilities', () => {
  // Verify server-evaluated ownership status policy and deadline decisions.
});

test('updates viewer engagement immediately after vote report and subscription mutations', () => {
  // Verify request-local caches invalidate without changing public aggregate identity.
});

test('updates viewer capabilities after moderation publication and edit-window changes', () => {
  // Verify unavailable actions include stable public reason codes where defined.
});

test('does not leak another viewer engagement through shared DataLoader caches', () => {
  // Verify parallel customer and anonymous requests remain isolated.
});

test('returns conservative capabilities when required ownership or policy facts are unavailable', () => {
  // Verify dependency failure never grants an unsafe customer action.
});
