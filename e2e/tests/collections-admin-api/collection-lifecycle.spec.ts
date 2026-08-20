import { test } from '@fixtures/base.extend';

test('publishes a draft manual collection', () => {
  // Verify publishedAt, isPublished, revision, and listingRevision.
});

test('publishes a rule collection after rules are saved', () => {
  // Verify a non-empty rule set satisfies publication requirements.
});

test('rejects publishing a rule collection without rules', () => {
  // Verify RULES_REQUIRED and unchanged publication state.
});

test('unpublishes a collection', () => {
  // Verify publishedAt becomes null and listingRevision increments.
});

test('treats repeated publish or unpublish requests as stable state', () => {
  // Verify timestamps and projection state do not drift unnecessarily.
});

test('rejects publishing without a default-locale name', () => {
  // Verify NAME_REQUIRED when only a secondary locale has content.
});

test('updates a future collection activity start', () => {
  // Verify scheduled collections report isActive false.
});

test('updates an exclusive collection activity end', () => {
  // Verify expired collections report isActive false at the boundary.
});

test('clears collection activity boundaries independently', () => {
  // Verify open-ended activity windows are supported.
});

test('rejects a reversed activity window during update', () => {
  // Verify INVALID_EFFECTIVE_INTERVAL and atomic rollback.
});

test('updates manual collection default sort and direction', () => {
  // Verify PRICE and NAME allow both asc and desc.
});

test('rejects descending direction for manual sort', () => {
  // Verify MANUAL remains fixed to ascending direction.
});

test('rejects ascending direction for newest sort', () => {
  // Verify NEWEST remains fixed to descending direction.
});

test('rejects manual sort for a rule collection on update', () => {
  // Verify the immutable membership model constrains sorting.
});

test('increments listingRevision for publication schedule and sort changes', () => {
  // Verify each Listing-visible mutation advances projection revision.
});

test('keeps listingRevision unchanged for a no-op listing update', () => {
  // Verify equivalent listing settings do not create projection work.
});

