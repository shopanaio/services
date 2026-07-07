import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

type FacetType = 'TAG' | 'FEATURE' | 'OPTION' | 'PRICE' | 'IN_STOCK';

test.describe('FacetValue API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
    await seedFacetSources(api);
  });

  // Helper to create a facet for testing
  async function createFacet(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    facetType: FacetType,
    slug: string,
    source?: { handle: string; name: string }
  ) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType,
          slug,
          label: `${slug} Label`,
          sources: [source ?? facetSource(facetType)],
        },
      },
    });
    const result = data.listingMutation.facetCreate;
    expect(result.userErrors).toHaveLength(0);
    return result.facet?.id;
  }

  async function createSourceValue(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    facetId: string,
    handle: string,
    label = handle
  ) {
    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'SOURCE',
          handle,
          label,
        },
      },
    });

    expect(data.listingMutation.facetValueCreate.userErrors).toHaveLength(0);
    return data.listingMutation.facetValueCreate.facetValue?.id;
  }

  // ═══════════════════════════════════════
  // HAPPY PATH - CREATE (TAG/FEATURE/OPTION types)
  // ═══════════════════════════════════════

  test('should create facet value with minimal input for TAG facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'tag-value-test');
    const sourceValueId = await createSourceValue(api, facetId, 'electronics', 'Electronics');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'value-one',
          label: 'Value One',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.handle).toBe('value-one');
    expect(result.facetValue?.label).toBe('Value One');
    expect(result.facetValue?.sourceValues.map((v: { handle: string }) => v.handle)).toContain('electronics');
    expect(result.facetValue?.enabled).toBe(true);
    expect(result.facetValue?.facet.id).toBe(facetId);
  });

  test('should create facet value with all optional fields', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'feature-value-test');
    const cottonSourceId = await createSourceValue(api, facetId, 'material:cotton', 'Cotton');
    const organicCottonSourceId = await createSourceValue(
      api,
      facetId,
      'material:organic-cotton',
      'Organic Cotton'
    );

    // Create a swatch first
    const { data: swatchData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FF0000',
        },
      },
    });
    const swatchId = swatchData.listingMutation.facetSwatchCreate.facetSwatch?.id;

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'full-value',
          label: 'Full Value',
          sourceValueIds: [cottonSourceId, organicCottonSourceId],
          swatchId,
          sortIndex: 5,
          enabled: false,
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.handle).toBe('full-value');
    expect(result.facetValue?.label).toBe('Full Value');
    expect(result.facetValue?.sourceValues).toHaveLength(2);
    expect(result.facetValue?.sourceValues.map((v: { handle: string }) => v.handle)).toContain('material:cotton');
    expect(result.facetValue?.sourceValues.map((v: { handle: string }) => v.handle)).toContain(
      'material:organic-cotton'
    );
    expect(result.facetValue?.sortIndex).toBe(5);
    expect(result.facetValue?.enabled).toBe(false);
    expect(result.facetValue?.swatch?.id).toBe(swatchId);
  });

  test('should create facet value for OPTION type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'option-value-test', facetSource('OPTION', 'size', 'Size'));
    const sourceValueId = await createSourceValue(api, facetId, 'size:l', 'Large');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'size-large',
          label: 'Large',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue).toBeTruthy();
    expect(result.facetValue?.sourceValues.map((v: { handle: string }) => v.handle)).toContain('size:l');
  });

  // ═══════════════════════════════════════
  // sourceValueIds VALIDATION TESTS
  // ═══════════════════════════════════════

  test('should require sourceValueIds for TAG type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'tag-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'no-handles',
          label: 'No Handles',
          // sourceValueIds omitted - should fail
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should require sourceValueIds for FEATURE type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'feature-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'no-handles',
          label: 'No Handles',
          // sourceValueIds omitted - should fail
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should require sourceValueIds for OPTION type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'option-require-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'no-handles',
          label: 'No Handles',
          // sourceValueIds omitted - should fail
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should forbid sourceValueIds for PRICE type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'PRICE', 'price-forbid-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'price-value',
          label: '$0-$50',
          sourceValueIds: ['should:not:be:here'], // Should fail for PRICE
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should forbid sourceValueIds for IN_STOCK type facet', async ({ api }) => {
    const facetId = await createFacet(api, 'IN_STOCK', 'stock-forbid-handles');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'in-stock-value',
          label: 'Available',
          sourceValueIds: ['should:not:be:here'], // Should fail for IN_STOCK
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

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
          kind: 'DISPLAY',
          handle: 'price-range-1',
          label: '$0 - $50',
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

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
          kind: 'DISPLAY',
          handle: 'available',
          label: 'In Stock',
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    // IN_STOCK facet values are computed dynamically, not created manually
    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - UPDATE
  // ═══════════════════════════════════════

  test('should update facet value label', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'update-label-test');
    const sourceValueId = await createSourceValue(api, facetId, 'test', 'Test');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'update-me',
          label: 'Original Label',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;

    // Update the value
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          label: 'Updated Label',
        },
      },
    });

    const result = data.listingMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.label).toBe('Updated Label');
  });

  test('should update facet value handle', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'update-handle-test');
    const sourceValueId = await createSourceValue(api, facetId, 'material:original', 'Original');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'handle-update',
          label: 'Handle Update',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;

    // Update handle
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          handle: 'handle-updated',
        },
      },
    });

    const result = data.listingMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.handle).toBe('handle-updated');
  });

  test('should update facet value enabled status', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'update-enabled-test');
    const sourceValueId = await createSourceValue(api, facetId, 'toggle', 'Toggle');

    // Create a value (enabled by default)
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'toggle-enabled',
          label: 'Toggle Enabled',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;
    expect(createData.listingMutation.facetValueCreate.facetValue?.enabled).toBe(true);

    // Disable the value
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          enabled: false,
        },
      },
    });

    const result = data.listingMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.enabled).toBe(false);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - DELETE
  // ═══════════════════════════════════════

  test('should delete facet value', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'delete-value-test');

    // Create a disabled display value without source children so it can be deleted directly.
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'delete-me',
          label: 'Delete Me',
          enabled: false,
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;

    // Delete the value
    const { data } = await api.admin.mutation('facet-api/FacetValueDelete', {
      variables: {
        input: { id: valueId },
      },
    });

    const result = data.listingMutation.facetValueDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedFacetValueId).toBe(valueId);

    // Verify deletion
    const { data: queryData } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: valueId },
    });

    expect(queryData.listingQuery.facetValue).toBeNull();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - QUERIES
  // ═══════════════════════════════════════

  test('should list all values for a facet', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'list-values-test');
    const sourceValueAId = await createSourceValue(api, facetId, 'a', 'A');
    const sourceValueBId = await createSourceValue(api, facetId, 'b', 'B');

    // Create multiple values
    await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'value-a',
          label: 'Value A',
          sourceValueIds: [sourceValueAId],
          sortIndex: 1,
        },
      },
    });
    await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'value-b',
          label: 'Value B',
          sourceValueIds: [sourceValueBId],
          sortIndex: 2,
        },
      },
    });

    const { data } = await api.admin.query('facet-api/FacetValues', {
      variables: { facetId },
    });

    expect(data.listingQuery.facetValues).toBeTruthy();
    expect(data.listingQuery.facetValues.length).toBeGreaterThanOrEqual(2);

    const handles = data.listingQuery.facetValues.map((v: { handle: string }) => v.handle);
    expect(handles).toContain('value-a');
    expect(handles).toContain('value-b');
  });

  test('should get single facet value by ID', async ({ api }) => {
    const facetId = await createFacet(api, 'FEATURE', 'query-single-value');
    const sourceValueId = await createSourceValue(api, facetId, 'material:query-test', 'Query Test');

    // Create a value
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'query-test-value',
          label: 'Query Test Value',
          sourceValueIds: [sourceValueId],
          sortIndex: 3,
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;

    // Query the value
    const { data } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: valueId },
    });

    expect(data.listingQuery.facetValue).toBeTruthy();
    expect(data.listingQuery.facetValue?.id).toBe(valueId);
    expect(data.listingQuery.facetValue?.handle).toBe('query-test-value');
    expect(data.listingQuery.facetValue?.label).toBe('Query Test Value');
    expect(data.listingQuery.facetValue?.sortIndex).toBe(3);
    expect(data.listingQuery.facetValue?.facet.id).toBe(facetId);
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty handle', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-handle-test');
    const sourceValueId = await createSourceValue(api, facetId, 'test', 'Test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: '',
          label: 'Test',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject empty label', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-label-test');
    const sourceValueId = await createSourceValue(api, facetId, 'test', 'Test');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'valid-handle',
          label: '',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject non-existent facetId', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId: 'non-existent-facet-id',
          kind: 'DISPLAY',
          handle: 'orphan-value',
          label: 'Orphan Value',
          sourceValueIds: ['non-existent-source-value-id'],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

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

    const result = data.listingMutation.facetValueUpdate;

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

    const result = data.listingMutation.facetValueDelete;

    expect(result.deletedFacetValueId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle empty sourceValueIds array for TAG (should fail)', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'empty-handles-array');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'empty-handles',
          label: 'Empty Handles',
          sourceValueIds: [], // Empty array - should fail for enabled display values
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.facetValue).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should handle multiple sourceValueIds', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'multiple-handles');
    const electronicsSourceId = await createSourceValue(api, facetId, 'electronics', 'Electronics');
    const gadgetsSourceId = await createSourceValue(api, facetId, 'gadgets', 'Gadgets');
    const techSourceId = await createSourceValue(api, facetId, 'tech', 'Tech');
    const computersSourceId = await createSourceValue(api, facetId, 'computers', 'Computers');

    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'multi-handle',
          label: 'Multi Handle',
          sourceValueIds: [
            electronicsSourceId,
            gadgetsSourceId,
            techSourceId,
            computersSourceId,
          ],
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.sourceValues).toHaveLength(4);
  });

  test('should return null for non-existent value ID in query', async ({ api }) => {
    const { data } = await api.admin.query('facet-api/FacetValue', {
      variables: { id: 'non-existent-id' },
    });

    expect(data.listingQuery.facetValue).toBeNull();
  });

  test('should handle value with swatch attachment', async ({ api }) => {
    const facetId = await createFacet(api, 'OPTION', 'swatch-value-test', facetSource('OPTION', 'color', 'Color'));
    const sourceValueId = await createSourceValue(api, facetId, 'color:black', 'Black');

    // Create a color swatch
    const { data: swatchData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#0000FF',
        },
      },
    });
    const swatchId = swatchData.listingMutation.facetSwatchCreate.facetSwatch?.id;

    // Create value with swatch
    const { data } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'blue',
          label: 'Blue',
          sourceValueIds: [sourceValueId],
          swatchId,
        },
      },
    });

    const result = data.listingMutation.facetValueCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.swatch).toBeTruthy();
    expect(result.facetValue?.swatch?.id).toBe(swatchId);
    expect(result.facetValue?.swatch?.swatchType).toBe('COLOR');
    expect(result.facetValue?.swatch?.colorOne).toBe('#0000FF');
  });

  test('should update value to attach swatch', async ({ api }) => {
    const facetId = await createFacet(api, 'TAG', 'attach-swatch-test');
    const sourceValueId = await createSourceValue(api, facetId, 'test', 'Test');

    // Create value without swatch
    const { data: createData } = await api.admin.mutation('facet-api/FacetValueCreate', {
      variables: {
        input: {
          facetId,
          kind: 'DISPLAY',
          handle: 'no-swatch-yet',
          label: 'No Swatch Yet',
          sourceValueIds: [sourceValueId],
        },
      },
    });

    const valueId = createData.listingMutation.facetValueCreate.facetValue?.id;
    expect(createData.listingMutation.facetValueCreate.facetValue?.swatch).toBeNull();

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
    const swatchId = swatchData.listingMutation.facetSwatchCreate.facetSwatch?.id;

    // Update value to attach swatch
    const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
      variables: {
        input: {
          id: valueId,
          swatchId,
        },
      },
    });

    const result = data.listingMutation.facetValueUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetValue?.swatch).toBeTruthy();
    expect(result.facetValue?.swatch?.swatchType).toBe('GRADIENT');
  });
});

function facetSource(type: FacetType, handle?: string, name?: string) {
  const defaults: Record<FacetType, { handle: string; name: string }> = {
    PRICE: { handle: 'price', name: 'Price' },
    TAG: { handle: 'tags', name: 'Tags' },
    FEATURE: { handle: 'material', name: 'Material' },
    OPTION: { handle: 'color', name: 'Color' },
    IN_STOCK: { handle: 'availability', name: 'Availability' },
  };

  return {
    handle: handle ?? defaults[type].handle,
    name: name ?? defaults[type].name,
  };
}

async function seedFacetSources(api: any) {
  const { data: productData } = await api.admin.mutation('inventory-api/ProductCreate', {
    variables: {
      input: {
        title: 'Facet Value Source Seed',
        handle: `facet-value-source-seed-${crypto.randomUUID().slice(0, 8)}`,
        options: [
          {
            name: 'Color',
            slug: 'color',
            displayType: 'BUTTONS',
            sortIndex: 0,
            values: [
              { name: 'Black', slug: 'black', sortIndex: 0 },
              { name: 'White', slug: 'white', sortIndex: 1 },
            ],
          },
          {
            name: 'Size',
            slug: 'size',
            displayType: 'BUTTONS',
            sortIndex: 1,
            values: [
              { name: 'Small', slug: 's', sortIndex: 0 },
              { name: 'Large', slug: 'l', sortIndex: 1 },
            ],
          },
        ],
        variants: [
          { handle: 'black-s' },
          { handle: 'black-l' },
          { handle: 'white-s' },
          { handle: 'white-l' },
        ],
      },
    },
  });

  const productResult = productData.catalogMutation.productCreate;
  expect(productResult.userErrors).toHaveLength(0);
  expect(productResult.product?.id).toBeTruthy();

  const { data: featuresData } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
    variables: {
      input: {
        productId: productResult.product!.id,
        features: [
          {
            index: [0],
            isGroup: false,
            name: 'Material',
            slug: 'material',
            values: [
              {
                index: 0,
                name: 'Cotton',
                slug: 'cotton',
              },
              {
                index: 1,
                name: 'Organic Cotton',
                slug: 'organic-cotton',
              },
            ],
          },
        ],
      },
    },
  });

  expect(featuresData.catalogMutation.productFeaturesSync.userErrors).toHaveLength(0);
}
