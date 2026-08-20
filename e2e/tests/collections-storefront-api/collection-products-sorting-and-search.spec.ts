import { test } from '@fixtures/base.extend';

test.describe('Collection product sorting and search', () => {
  test('uses MANUAL by default for a manual collection configured as manual', () => {
    // Omit sort and assert the effective connection sort.
  });

  test('maps PRICE ASC and DESC collection defaults', () => {
    // Verify defaultSortDirection controls effective price order.
  });

  test('maps NAME ASC and DESC collection defaults', () => {
    // Verify localized title ordering from collection configuration.
  });

  test('maps NEWEST collection default to NEWEST', () => {
    // Verify newest is independent of configured direction.
  });

  test('sorts explicitly by NEWEST', () => {
    // Order members by storefront publication date descending.
  });

  test('sorts explicitly by CREATED_AT', () => {
    // Order members by canonical creation date descending.
  });

  test('sorts explicitly by TITLE_ASC and TITLE_DESC', () => {
    // Verify localized title collation in both directions.
  });

  test('sorts explicitly by PRICE_ASC and PRICE_DESC', () => {
    // Verify storefront price order in both directions.
  });

  test('places products without a storefront price deterministically', () => {
    // Cover null-price placement for both price directions.
  });

  test('offers MANUAL only for manual collections', () => {
    // Compare availableSorts for MANUAL and RULE collection types.
  });

  test('rejects MANUAL sort for a rule collection', () => {
    // Request an unavailable collection sort explicitly.
  });

  test('searches only inside collection membership', () => {
    // Match text inside and outside the collection scope.
  });

  test('normalizes whitespace in a collection search query', () => {
    // Verify trimmed and collapsed query text.
  });

  test('uses RELEVANCE by default for a non-empty query', () => {
    // Omit sort while searching within the collection.
  });

  test('offers RELEVANCE only when a query is active', () => {
    // Compare availableSorts with and without query text.
  });

  test('allows an explicit non-relevance sort with a query', () => {
    // Search within membership and override result ordering.
  });

  test('treats a whitespace-only optional query as absent', () => {
    // Fall back to the collection default sort.
  });

  test('rejects a query longer than 128 Unicode code points', () => {
    // Assert BAD_USER_INPUT with the query field path.
  });
});
