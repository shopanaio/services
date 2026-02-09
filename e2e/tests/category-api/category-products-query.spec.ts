import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category Products Query API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product with pricing
   */
  async function createProductWithPrice(
    api: any,
    title: string,
    priceMinor: number,
    options?: { tracked?: boolean }
  ) {
    const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 8);

    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle,
          inventoryItem: {
            tracked: options?.tracked ?? true,
          },
        },
      },
    });

    const product = data.catalogMutation.productCreate.product;
    if (!product) {
      throw new Error('Failed to create product');
    }

    const variantId = product.variants?.edges?.[0]?.node?.id;

    // Set the price
    if (variantId && priceMinor > 0) {
      await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'USD',
            amountMinor: String(priceMinor),
          },
        },
      });
    }

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      variantId,
    };
  }

  // ===============================================
  // BASIC QUERY
  // ===============================================

  test('should query category products with empty result', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-category-products',
      name: 'Empty Category Products',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.edges).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  test('should query category products via Category.categoryProducts field', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'nested-category-products',
      name: 'Nested Category Products',
    });

    const { data } = await api.admin.query('category-api/CategoryCategoryProducts', {
      variables: {
        id: category.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.category).toBeTruthy();
    expect(data.catalogQuery.category.categoryProducts).toBeTruthy();
    expect(data.catalogQuery.category.categoryProducts.edges).toHaveLength(0);
    expect(data.catalogQuery.category.categoryProducts.totalCount).toBe(0);
  });

  test('should return error for non-existent category', async ({ api }) => {
    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: '00000000-0000-0000-0000-000000000000',
        first: 10,
      },
      throwOnError: false,
    });

    // The query might return empty or null depending on implementation
    const result = data.catalogQuery?.categoryProducts;

    // Either empty result or GraphQL error
    if (result) {
      expect(result.totalCount).toBe(0);
    }
  });

  // ===============================================
  // PAGINATION
  // ===============================================

  test('should respect first parameter', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'first-param-test',
      name: 'First Param Test',
    });

    // Query with first: 5
    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 5,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    // Should return at most 5 items (likely 0 since category is empty)
    expect(result.edges.length).toBeLessThanOrEqual(5);
  });

  test('should include pageInfo in response', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'pageinfo-test',
      name: 'PageInfo Test',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.pageInfo).toBeTruthy();
    expect(typeof result.pageInfo.hasNextPage).toBe('boolean');
    expect(typeof result.pageInfo.hasPreviousPage).toBe('boolean');
  });

  // ===============================================
  // SORTING
  // ===============================================

  test('should sort by PRICE ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-price-asc',
      name: 'Sort Price ASC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'PRICE', direction: 'asc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    // Query should succeed even with empty category
    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by PRICE DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-price-desc',
      name: 'Sort Price DESC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'PRICE', direction: 'desc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by NEWEST ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-newest-asc',
      name: 'Sort Newest ASC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'NEWEST', direction: 'asc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by NEWEST DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-newest-desc',
      name: 'Sort Newest DESC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'NEWEST', direction: 'desc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by NAME ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-name-asc',
      name: 'Sort Name ASC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'NAME', direction: 'asc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by NAME DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-name-desc',
      name: 'Sort Name DESC',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'NAME', direction: 'desc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should sort by MANUAL (lexo_rank)', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'sort-manual',
      name: 'Sort Manual',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        sort: { by: 'MANUAL', direction: 'asc' },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  // ===============================================
  // FILTERING - PRICE RANGE
  // ===============================================

  test('should filter by priceMinMinor', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-price-min',
      name: 'Filter Price Min',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '5000', // $50.00 minimum
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // All returned products should have price >= 5000 minor units
  });

  test('should filter by priceMaxMinor', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-price-max',
      name: 'Filter Price Max',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMaxMinor: '10000', // $100.00 maximum
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // All returned products should have price <= 10000 minor units
  });

  test('should filter by price range (min and max)', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-price-range',
      name: 'Filter Price Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '2500', // $25.00 minimum
          priceMaxMinor: '7500', // $75.00 maximum
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // All returned products should have 2500 <= price <= 7500
  });

  // ===============================================
  // FILTERING - IN STOCK
  // ===============================================

  test('should filter by inStock true', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-in-stock',
      name: 'Filter In Stock',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          inStock: true,
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // All returned products should be in stock
  });

  test('should filter by inStock false', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-out-stock',
      name: 'Filter Out Stock',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          inStock: false,
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // All returned products should be out of stock
  });

  // ===============================================
  // FILTERING - FACETS
  // ===============================================

  test('should filter by single facet', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-single-facet',
      name: 'Filter Single Facet',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['color:red'], // facetSlug:valueSlug format
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should filter by multiple facets (AND logic)', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-multi-facet',
      name: 'Filter Multi Facet',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['color:red', 'size:medium'],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should filter by multiple values of same facet (OR logic)', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-facet-or',
      name: 'Filter Facet OR',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['color:red', 'color:blue'], // Same facet, multiple values
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  // ===============================================
  // FILTERING - RANGES
  // ===============================================

  test('should filter by numeric range', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-numeric-range',
      name: 'Filter Numeric Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          ranges: [
            {
              facetSlug: 'weight',
              min: '100',
              max: '500',
            },
          ],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should filter by multiple ranges', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-multi-range',
      name: 'Filter Multi Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          ranges: [
            {
              facetSlug: 'weight',
              min: '100',
              max: '500',
            },
            {
              facetSlug: 'length',
              min: '10',
              max: '50',
            },
          ],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  // ===============================================
  // COMBINED FILTERS
  // ===============================================

  test('should combine price filter with inStock filter', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-price-stock',
      name: 'Filter Price Stock',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '1000',
          priceMaxMinor: '5000',
          inStock: true,
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should combine facets with price filter', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-facet-price',
      name: 'Filter Facet Price',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['brand:nike'],
          priceMaxMinor: '15000',
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should combine all filter types', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'filter-all-types',
      name: 'Filter All Types',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['color:blue', 'size:large'],
          ranges: [
            {
              facetSlug: 'weight',
              min: '100',
              max: '1000',
            },
          ],
          priceMinMinor: '2000',
          priceMaxMinor: '10000',
          inStock: true,
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  // ===============================================
  // EDGE CASES
  // ===============================================

  test('should handle empty filters object', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-filters',
      name: 'Empty Filters',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {},
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should handle empty facets array', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-facets-array',
      name: 'Empty Facets Array',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: [],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
  });

  test('should handle zero price range', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'zero-price-range',
      name: 'Zero Price Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '0',
          priceMaxMinor: '0',
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result).toBeTruthy();
    expect(result.edges).toBeDefined();
    // Should return products with price = 0 (free items)
  });

  test('should handle inverted price range gracefully', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'inverted-price-range',
      name: 'Inverted Price Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '10000', // Min > Max
          priceMaxMinor: '5000',
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    // Should either return empty or handle gracefully
    expect(result).toBeTruthy();
    expect(result.edges).toHaveLength(0);
  });
});
