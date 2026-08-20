import { test } from '@fixtures/base.extend';

test('lists the authenticated customer reviews through the Customer federation field', () => {
  // Verify current-store ownership filters sorting pagination and public content visibility.
});

test('lists the authenticated customer product questions', () => {
  // Verify owned pending and published presentation follows the customer contract.
});

test('lists the authenticated customer review requests', () => {
  // Verify active completed expired and cancelled request filtering and ordering.
});

test('paginates every customer Reviews connection forward and backward', () => {
  // Verify edges nodes pageInfo totalCount and stable cursor ownership.
});

test('rejects access to Customer Reviews fields for another customer identity', () => {
  // Verify federation representation cannot override trusted viewer ownership.
});

test('isolates Customer Reviews connections by active storefront store', () => {
  // Verify content from the same customer in another store is excluded.
});
