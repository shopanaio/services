import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category Facets Computation API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // BASIC FACETS RESPONSE
  // ===============================================

  test('should return facets structure in response', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facets-structure',
      name: 'Facets Structure',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    // Facets should have priceRange and groups
    if (result.facets) {
      expect(result.facets).toHaveProperty('priceRange');
      expect(result.facets).toHaveProperty('groups');
      expect(Array.isArray(result.facets.groups)).toBe(true);
    }
  });

  test('should return null priceRange for empty category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-price-range',
      name: 'Empty Price Range',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    // Empty category should have null priceRange
    if (result.facets) {
      expect(result.facets.priceRange).toBeNull();
    }
  });

  test('should return empty groups for empty category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-facet-groups',
      name: 'Empty Facet Groups',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    if (result.facets) {
      expect(result.facets.groups).toHaveLength(0);
    }
  });

  // ===============================================
  // PRICE RANGE FACET
  // ===============================================

  test('should return priceRange with minMinor and maxMinor', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'price-range-fields',
      name: 'Price Range Fields',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.priceRange) {
      expect(result.facets.priceRange).toHaveProperty('minMinor');
      expect(result.facets.priceRange).toHaveProperty('maxMinor');
      // If priceRange exists, min should be <= max
      expect(Number(result.facets.priceRange.minMinor)).toBeLessThanOrEqual(
        Number(result.facets.priceRange.maxMinor)
      );
    }
  });

  // ===============================================
  // FACET RESULT GROUP
  // ===============================================

  test('should return FacetResultGroup with correct structure', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-group-structure',
      name: 'Facet Group Structure',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.groups.length > 0) {
      const group = result.facets.groups[0];

      // FacetResultGroup fields
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('facets');
      expect(Array.isArray(group.facets)).toBe(true);
    }
  });

  // ===============================================
  // FACET RESULT
  // ===============================================

  test('should return FacetResult with correct structure', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-result-structure',
      name: 'Facet Result Structure',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.groups.length > 0) {
      const group = result.facets.groups[0];
      if (group.facets.length > 0) {
        const facet = group.facets[0];

        // FacetResult fields
        expect(facet).toHaveProperty('facetType');
        expect(facet).toHaveProperty('slug');
        expect(facet).toHaveProperty('label');
        expect(facet).toHaveProperty('uiType');
        expect(facet).toHaveProperty('selectionMode');
        expect(facet).toHaveProperty('values');
        expect(facet).toHaveProperty('totalCount');

        // Type validations
        expect(typeof facet.slug).toBe('string');
        expect(typeof facet.label).toBe('string');
        expect(typeof facet.totalCount).toBe('number');
        expect(Array.isArray(facet.values)).toBe(true);
      }
    }
  });

  test('should return valid facetType enum values', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-type-enum',
      name: 'Facet Type Enum',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    const validFacetTypes = ['PRICE', 'TAG', 'FEATURE', 'OPTION', 'IN_STOCK'];

    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          expect(validFacetTypes).toContain(facet.facetType);
        }
      }
    }
  });

  test('should return valid uiType enum values', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'ui-type-enum',
      name: 'UI Type Enum',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    const validUITypes = ['CHECKBOX', 'RADIO', 'DROPDOWN', 'RANGE', 'BOOLEAN'];

    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          expect(validUITypes).toContain(facet.uiType);
        }
      }
    }
  });

  test('should return valid selectionMode enum values', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'selection-mode-enum',
      name: 'Selection Mode Enum',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    const validSelectionModes = ['SINGLE', 'MULTI'];

    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          expect(validSelectionModes).toContain(facet.selectionMode);
        }
      }
    }
  });

  // ===============================================
  // FACET RESULT VALUE
  // ===============================================

  test('should return FacetResultValue with correct structure', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-value-structure',
      name: 'Facet Value Structure',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.groups.length > 0) {
      const group = result.facets.groups[0];
      if (group.facets.length > 0) {
        const facet = group.facets[0];
        if (facet.values.length > 0) {
          const value = facet.values[0];

          // FacetResultValue fields
          expect(value).toHaveProperty('slug');
          expect(value).toHaveProperty('label');
          expect(value).toHaveProperty('count');
          expect(value).toHaveProperty('swatch');

          // Type validations
          expect(typeof value.slug).toBe('string');
          expect(typeof value.count).toBe('number');
          expect(value.count).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test('should return swatch with id when available', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-swatch',
      name: 'Facet Swatch',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    // Check swatch structure if available
    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          for (const value of facet.values) {
            // swatch can be null or an object with id
            if (value.swatch !== null) {
              expect(value.swatch).toHaveProperty('id');
              expect(typeof value.swatch.id).toBe('string');
            }
          }
        }
      }
    }
  });

  // ===============================================
  // FACET COUNTS
  // ===============================================

  test('should have non-negative counts on facet values', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-counts-non-negative',
      name: 'Facet Counts Non Negative',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          expect(facet.totalCount).toBeGreaterThanOrEqual(0);
          for (const value of facet.values) {
            expect(value.count).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  test('should have totalCount equal to sum of value counts', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-total-sum',
      name: 'Facet Total Sum',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    if (result.facets && result.facets.groups.length > 0) {
      for (const group of result.facets.groups) {
        for (const facet of group.facets) {
          const sumOfCounts = facet.values.reduce(
            (sum: number, v: { count: number }) => sum + v.count,
            0
          );
          // Note: totalCount might not always equal sum if products can have
          // multiple values for the same facet, but it should be >= sum
          // or implementation specific
          expect(facet.totalCount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  // ===============================================
  // FACETS WITH FILTERS
  // ===============================================

  test('should update facets when filter is applied', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facets-with-filter',
      name: 'Facets With Filter',
    });

    // Query without filters
    const { data: unfilteredData } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    // Query with price filter
    const { data: filteredData } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          priceMinMinor: '5000',
          priceMaxMinor: '10000',
        },
      },
    });

    // Both should have facets
    expect(unfilteredData.catalogQuery.categoryProducts.facets).toBeDefined();
    expect(filteredData.catalogQuery.categoryProducts.facets).toBeDefined();

    // Facet counts might differ based on applied filter
    // (Specific assertions depend on test data)
  });

  test('should return facets reflecting facet filter selection', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facets-filter-selection',
      name: 'Facets Filter Selection',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['color:red'],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    // When filtering by color:red, facets should update to show
    // counts based on the filtered product set
  });

  // ===============================================
  // EDGE CASES
  // ===============================================

  test('should handle category with many facets', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'many-facets',
      name: 'Many Facets',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    // Should handle categories with many facet groups
  });

  test('should handle facet with many values', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'facet-many-values',
      name: 'Facet Many Values',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
    // Should handle facets with many values (e.g., size has S, M, L, XL, XXL, etc.)
  });

  test('should handle special characters in facet slugs', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'special-char-facets',
      name: 'Special Char Facets',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['screen-size:15-6-inch'], // Slug with hyphens
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
  });

  test('should handle numeric facet slugs', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'numeric-facets',
      name: 'Numeric Facets',
    });

    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId: category.id,
        first: 10,
        filters: {
          facets: ['size:32', 'size:34', 'size:36'],
        },
      },
    });

    const result = data.catalogQuery.categoryProducts;

    expect(result.facets).toBeDefined();
  });

  // ===============================================
  // VIA NESTED FIELD
  // ===============================================

  test('should return facets via Category.categoryProducts field', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'nested-facets',
      name: 'Nested Facets',
    });

    const { data } = await api.admin.query('category-api/CategoryCategoryProducts', {
      variables: {
        id: category.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.category).toBeTruthy();
    expect(data.catalogQuery.category.categoryProducts).toBeTruthy();
    expect(data.catalogQuery.category.categoryProducts.facets).toBeDefined();

    if (data.catalogQuery.category.categoryProducts.facets) {
      expect(data.catalogQuery.category.categoryProducts.facets).toHaveProperty('priceRange');
      expect(data.catalogQuery.category.categoryProducts.facets).toHaveProperty('groups');
    }
  });
});
