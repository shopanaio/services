import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('FacetValue API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // Helper to create a facet for testing
  async function createFacet(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    facetType: 'TAG' | 'FEATURE' | 'OPTION' | 'PRICE' | 'IN_STOCK',
    slug: string
  ) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType,
          slug,
          label: `${slug} Label`,
        },
      },
    });
    return data.catalogMutation.facetCreate.facet?.id;
  }

  // ═══════════════════════════════════════
  // HAPPY PATH - CREATE (TAG/FEATURE/OPTION types)
  // ═══════════════════════════════════════

  test('should create facet value with minimal input for TAG facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'tag-value-test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'value-one',
          label: 'Value One',
          sourceHandles: ['tag:electronics'],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.slug).toBe('value-one');
    expect(result.facetValue?.label).toBe('Value One');
    expect(result.facetValue?.sourceHandles).toContain('tag:electronics');
    expect(result.facetValue?.enabled).toBe(true);
    expect(result.facetValue?.facet.id).toBe(facetId);
  });

  test('should create facet value with all optional fields', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'feature-value-test');

    // Create a swatch first
    const { data: swatchData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FF0000',
        },
      },
    });
    const swatchId = swatchData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'full-value',
          label: 'Full Value',
          sourceHandles: ['feature:cotton', 'feature:organic-cotton'],
          swatchId,
          sortIndex: 5,
          enabled: false,
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.slug).toBe('full-value');
    expect(result.facetValue?.label).toBe('Full Value');
    expect(result.facetValue?.sourceHandles).toHaveLength(2);
    expect(result.facetValue?.sourceHandles).toContain('feature:cotton');
    expect(result.facetValue?.sourceHandles).toContain('feature:organic-cotton');
    expect(result.facetValue?.sortIndex).toBe(5);
    expect(result.facetValue?.enabled).toBe(false);
    expect(result.facetValue?.swatch?.id).toBe(swatchId);
  });

  test('should create facet value for OPTION type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'option-value-test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'size-large',
          label: 'Large',
          sourceHandles: ['option:size:large'],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.sourceHandles).toContain('option:size:large');
  });

  // ═══════════════════════════════════════
  // sourceHandles VALIDATION TESTS
  // ═══════════════════════════════════════

  test('should require sourceHandles for TAG type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'tag-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'no-handles',
          label: 'No Handles',
          // sourceHandles omitted - should fail
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should require sourceHandles for FEATURE type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'feature-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'no-handles',
          label: 'No Handles',
          // sourceHandles omitted - should fail
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should require sourceHandles for OPTION type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'option-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'no-handles',
          label: 'No Handles',
          // sourceHandles omitted - should fail
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should forbid sourceHandles for PRICE type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'PRICE', 'price-forbid-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'price-value',
          label: '$0-$50',
          sourceHandles: ['should:not:be:here'], // Should fail for PRICE
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should forbid sourceHandles for IN_STOCK type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'IN_STOCK', 'stock-forbid-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'in-stock-value',
          label: 'Available',
          sourceHandles: ['should:not:be:here'], // Should fail for IN_STOCK
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject PRICE facet value (computed dynamically)', async ({ api }) => {
    const facetId = await createFacet(api, 'PRICE', 'price-no-values');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'price-range-1',
          label: '$0 - $50',
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    // PRICE facet values are computed dynamically, not created manually
    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject IN_STOCK facet value (computed dynamically)', async ({ api }) => {
    const facetId = await createFacet(api, 'IN_STOCK', 'stock-no-values');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'available',
          label: 'In Stock',
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    // IN_STOCK facet values are computed dynamically, not created manually
    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - UPDATE
  // ═══════════════════════════════════════

  test('should update facet value label', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'update-label-test');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'update-me',
          label: 'Original Label',
          sourceHandles: ['tag:test'],
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;

    // Update the value
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          label: 'Updated Label',
        },
      },
    });

    const result = data.catalogMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.label).toBe('Updated Label');
  });

  test('should update facet value sourceHandles', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'update-handles-test');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'handles-update',
          label: 'Handles Update',
          sourceHandles: ['feature:original'],
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;

    // Update sourceHandles
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          sourceHandles: ['feature:updated-1', 'feature:updated-2'],
        },
      },
    });

    const result = data.catalogMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.sourceHandles).toHaveLength(2);
    expect(result.facetValue?.sourceHandles).toContain('feature:updated-1');
    expect(result.facetValue?.sourceHandles).toContain('feature:updated-2');
  });

  test('should update facet value enabled status', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'update-enabled-test');

    // Create a value (enabled by default)
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'toggle-enabled',
          label: 'Toggle Enabled',
          sourceHandles: ['tag:toggle'],
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;
    expect(createData.catalogMutation.facetValueCreate.facetValue?.enabled).toBe(true);

    // Disable the value
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          enabled: false,
        },
      },
    });

    const result = data.catalogMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.enabled).toBe(false);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - DELETE
  // ═══════════════════════════════════════

  test('should delete facet value', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'delete-value-test');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'delete-me',
          label: 'Delete Me',
          sourceHandles: ['tag:delete'],
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;

    // Delete the value
    const { data } = await api.admin.mutation('facet-api/FacetValueDelete', {
      variables: {
        input: { id: valueId },
      },
    });

    const result = data.catalogMutation.facetValueDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedFacetValueId).toBe(valueId);

    // Verify deletion
    const { data: queryData } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: valueId },
    });

    expect(queryData.catalogQuery.facetValue).toBeNull();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - QUERIES
  // ═══════════════════════════════════════

  test('should list all values for a facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'list-values-test');

    // Create multiple values
    await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'value-a',
          label: 'Value A',
          sourceHandles: ['tag:a'],
          sortIndex: 1,
        },
      },
    });
    await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'value-b',
          label: 'Value B',
          sourceHandles: ['tag:b'],
          sortIndex: 2,
        },
      },
    });

    const { data } = await api.admin.query('facet-api/FacetValues', {
      variables: { facetId },
    });

    expect(data.catalogQuery.facetValues).toBeTruthy();
    expect(data.catalogQuery.facetValues.length).toBeGreaterThanOrEqual(2);

    const slugs = data.catalogQuery.facetValues.map((v: { slug: string }) => v.slug);
    expect(slugs).toContain('value-a');
    expect(slugs).toContain('value-b');
  });

  test('should get single facet value by ID', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'query-single-value');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'query-test-value',
          label: 'Query Test Value',
          sourceHandles: ['feature:query-test'],
          sortIndex: 3,
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;

    // Query the value
    const { data } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: valueId },
    });

    expect(data.catalogQuery.facetValue).toBeTruthy();
    expect(data.catalogQuery.facetValue?.id).toBe(valueId);
    expect(data.catalogQuery.facetValue?.slug).toBe('query-test-value');
    expect(data.catalogQuery.facetValue?.label).toBe('Query Test Value');
    expect(data.catalogQuery.facetValue?.sortIndex).toBe(3);
    expect(data.catalogQuery.facetValue?.facet.id).toBe(facetId);
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty slug', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-slug-test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: '',
          label: 'Test',
          sourceHandles: ['tag:test'],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject empty label', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-label-test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'valid-slug',
          label: '',
          sourceHandles: ['tag:test'],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject non-existent facetId', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId: 'non-existent-facet-id',
          slug: 'orphan-value',
          label: 'Orphan Value',
          sourceHandles: ['tag:orphan'],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject update with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'non-existent-id',
          label: 'New Label',
        },
      },
    });

    const result = data.catalogMutation.facetValueUpdate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject delete with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetValueDelete', {
      throwOnError: false,
      variables: {
        input: { id: 'non-existent-id' },
      },
    });

    const result = data.catalogMutation.facetValueDelete;

    expect(result.deletedFacetValueId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle empty sourceHandles array for TAG (should fail)', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-handles-array');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          slug: 'empty-handles',
          label: 'Empty Handles',
          sourceHandles: [], // Empty array - should fail for TAG
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should handle multiple sourceHandles', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'multiple-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'multi-handle',
          label: 'Multi Handle',
          sourceHandles: [
            'tag:electronics',
            'tag:gadgets',
            'tag:tech',
            'tag:computers',
          ],
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.sourceHandles).toHaveLength(4);
  });

  test('should return null for non-existent value ID in query', async ({ api }) => {
    const { data } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: 'non-existent-id' },
    });

    expect(data.catalogQuery.facetValue).toBeNull();
  });

  test('should handle value with swatch attachment', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'swatch-value-test');

    // Create a color swatch
    const { data: swatchData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#0000FF',
        },
      },
    });
    const swatchId = swatchData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Create value with swatch
    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'blue',
          label: 'Blue',
          sourceHandles: ['option:color:blue'],
          swatchId,
        },
      },
    });

    const result = data.catalogMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.swatch).toBeTruthy();
    expect(result.facetValue?.swatch?.id).toBe(swatchId);
    expect(result.facetValue?.swatch?.swatchType).toBe('COLOR');
    expect(result.facetValue?.swatch?.colorOne).toBe('#0000FF');
  });

  test('should update value to attach swatch', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'attach-swatch-test');

    // Create value without swatch
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          slug: 'no-swatch-yet',
          label: 'No Swatch Yet',
          sourceHandles: ['tag:test'],
        },
      },
    });

    const valueId = createData.catalogMutation.facetValueCreate.facetValue?.id;
    expect(createData.catalogMutation.facetValueCreate.facetValue?.swatch).toBeNull();

    // Create a swatch
    const { data: swatchData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#FF0000',
          colorTwo: '#00FF00',
        },
      },
    });
    const swatchId = swatchData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Update value to attach swatch
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          swatchId,
        },
      },
    });

    const result = data.catalogMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.swatch).toBeTruthy();
    expect(result.facetValue?.swatch?.swatchType).toBe('GRADIENT');
  });
});
