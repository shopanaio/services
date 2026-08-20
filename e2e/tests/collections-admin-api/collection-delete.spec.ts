import { test } from '@fixtures/base.extend';

test('deletes an empty manual collection', () => {
  // Verify the mutation returns the original global collection ID.
});

test('deletes a populated manual collection and clears projected membership', () => {
  // Verify items are removed from the Listing projection before deletion completes.
});

test('deletes a draft rule collection', () => {
  // Verify rules and dependent records are no longer admin-readable.
});

test('deletes a published rule collection', () => {
  // Verify the published collection disappears from Listing and Admin queries.
});

test('returns not found when deleting an unknown collection', () => {
  // Verify NOT_FOUND and a null deletedCollectionId.
});

test('returns not found when deleting an already deleted collection', () => {
  // Verify repeated deletion does not resurrect or mutate state.
});

test('rejects a malformed collection ID on delete', () => {
  // Verify INVALID_ID and a null deletedCollectionId.
});

test('rejects an entity ID of the wrong type on delete', () => {
  // Verify global ID entity validation.
});

test('rejects delete with a stale expected revision', () => {
  // Verify REVISION_CONFLICT and the collection remains readable.
});

test('does not delete a collection from another store', () => {
  // Verify tenant isolation returns no mutable foreign resource.
});

