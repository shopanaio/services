import { test } from '@fixtures/base.extend';

test('updates a collection handle', () => {
  // Verify normalization, uniqueness, and revision increment.
});

test('rejects an invalid updated handle', () => {
  // Verify INVALID_HANDLE leaves collection state unchanged.
});

test('rejects an updated handle already used in the store', () => {
  // Verify DUPLICATE leaves both collections unchanged.
});

test('updates the localized collection name', () => {
  // Verify the request locale translation and revision are updated.
});

test('updates rich description and excerpt independently', () => {
  // Verify omitted rich content remains unchanged.
});

test('clears nullable description and excerpt content', () => {
  // Verify explicit null clears content without changing omitted fields.
});

test('replaces collection media and preserves input order', () => {
  // Verify complete replacement and contiguous media sort indexes.
});

test('clears collection media with an empty list', () => {
  // Verify all media links are removed atomically.
});

test('rejects collection media IDs with the wrong global type', () => {
  // Verify invalid file references cannot be persisted.
});

test('updates all collection SEO fields', () => {
  // Verify SEO metadata and Open Graph image replacement.
});

test('clears collection SEO', () => {
  // Verify explicit null removes the SEO record.
});

test('leaves omitted collection fields unchanged', () => {
  // Verify patch semantics across content, media, SEO, schedule, and sort.
});

test('increments revision once for a successful metadata update', () => {
  // Verify one logical mutation causes one revision increment.
});

test('does not change listingRevision for content-only updates', () => {
  // Verify Listing projection revision is reserved for listing changes.
});

test('rejects changing the immutable collection type', () => {
  // Verify the update GraphQL contract exposes no type mutation path.
});

test('returns not found for an unknown collection update', () => {
  // Verify NOT_FOUND and no cross-tenant mutation.
});

test('rejects a malformed collection ID on update', () => {
  // Verify INVALID_ID targets input.id.
});

