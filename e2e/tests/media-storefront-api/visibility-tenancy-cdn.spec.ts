import { test } from '@fixtures/base.extend';

test('resolves only media referenced by the active storefront store', () => {
  // Verify an ID from another store cannot be used to disclose media metadata or URLs.
});

test('stops resolving media after deletion reaches its non-public state', () => {
  // Verify soft-delete, scheduled purge, and completed purge states are not storefront-visible.
});

test('switches new reads to the active CDN route after configuration rotation', () => {
  // Verify route revisions change public URLs without changing media IDs.
});

test('keeps previously issued immutable asset URLs cache safe during CDN rotation', () => {
  // Verify immutable objects remain addressable for the configured overlap window.
});

test('never exposes bucket credentials object keys or origin diagnostics', () => {
  // Verify GraphQL errors and URL fields contain no storage secrets or internal endpoints.
});
