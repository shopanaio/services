import { test } from '@fixtures/base.extend';

test.describe('Collections Storefront API lookup and visibility', () => {
  test('returns a visible manual collection by ID', () => {
    // Publish an active manual collection and query collection(id).
  });

  test('returns a visible rule collection by ID', () => {
    // Publish an active rule collection and query collection(id).
  });

  test('returns a visible collection by handle', () => {
    // Query the published collection through its stable handle.
  });

  test('resolves a visible collection through node', () => {
    // Query node(id) and assert the Collection concrete type.
  });

  test('resolves visible collections through nodes in input order', () => {
    // Query mixed collection IDs and preserve input positions.
  });

  test('returns null for a draft collection', () => {
    // Verify unpublished collections are hidden by ID and handle.
  });

  test('returns null before the collection activity window', () => {
    // Publish a collection whose activeFrom is still in the future.
  });

  test('returns null at and after the collection activity end', () => {
    // Verify activeTo is an exclusive visibility boundary.
  });

  test('returns a collection at the inclusive activity start', () => {
    // Verify activeFrom is an inclusive visibility boundary.
  });

  test('returns a collection with an open-ended activity window', () => {
    // Cover null activeFrom and activeTo on a published collection.
  });

  test('hides a collection after it is unpublished', () => {
    // Read before and after clearing the publication timestamp.
  });

  test('hides a collection after deletion', () => {
    // Delete a visible collection and repeat every lookup entry point.
  });

  test('returns null for an unknown collection ID and handle', () => {
    // Query identifiers that do not exist in the active store.
  });

  test('returns null for a malformed or wrong-type global ID', () => {
    // Exercise safe ID decoding without leaking collection existence.
  });
});
