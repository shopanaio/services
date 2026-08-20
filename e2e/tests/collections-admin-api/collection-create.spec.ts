import { test } from '@fixtures/base.extend';

test('creates a minimal manual collection as a draft', () => {
  // Verify manual defaults, identifiers, timestamps, and the initial revision.
});

test('creates a minimal rule collection as a draft', () => {
  // Verify rule defaults and an initially empty typed rule list.
});

test('normalizes a collection handle', () => {
  // Verify the canonical store-local handle is persisted and returned.
});

test('rejects an empty collection handle', () => {
  // Verify the REQUIRED user error targets input.handle.
});

test('rejects an invalid collection handle', () => {
  // Verify the INVALID_HANDLE user error and a null collection.
});

test('rejects a duplicate collection handle in the same store', () => {
  // Verify handle uniqueness is enforced within the current store.
});

test('allows the same collection handle in another store', () => {
  // Verify handle uniqueness does not leak across stores.
});

test('rejects an empty collection name', () => {
  // Verify the REQUIRED user error targets input.name.
});

test('creates rich description and excerpt content', () => {
  // Verify text, HTML, and JSON representations round-trip.
});

test('creates collection media in input order', () => {
  // Verify file references and zero-based media sort indexes.
});

test('creates collection SEO and Open Graph metadata', () => {
  // Verify all SEO fields and the Open Graph image round-trip.
});

test('creates a manual collection with an explicit supported sort', () => {
  // Verify PRICE, NAME, and NEWEST defaults can be selected.
});

test('defaults manual collections to manual ascending sort', () => {
  // Verify MANUAL and asc are selected when sort fields are omitted.
});

test('defaults rule collections to newest descending sort', () => {
  // Verify NEWEST and desc are selected when sort fields are omitted.
});

test('rejects manual sort for a rule collection', () => {
  // Verify the INVALID sort user error and no persisted collection.
});

test('rejects a sort direction incompatible with manual or newest sort', () => {
  // Verify fixed-direction sorts cannot be created with the opposite direction.
});

test('creates a collection with a valid activity window', () => {
  // Verify normalized activeFrom and activeTo values are returned.
});

test('rejects an invalid or reversed activity window', () => {
  // Verify INVALID_EFFECTIVE_INTERVAL and atomic rollback.
});

test('publishes a manual collection during creation', () => {
  // Verify publishedAt and isPublished are set immediately.
});

test('rejects publishing a rule collection during creation', () => {
  // Verify RULES_REQUIRED because rules must be saved after creation.
});

