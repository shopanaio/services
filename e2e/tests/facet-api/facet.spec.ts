import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Facet API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - CREATE
  // ═══════════════════════════════════════

  test('should create facet with minimal input (TAG type)', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'brand',
          label: 'Brand',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet).toBeTruthy();
    expect(result.facet?.facetType).toBe('TAG');
    expect(result.facet?.slug).toBe('brand');
    expect(result.facet?.label).toBe('Brand');
    expect(result.facet?.uiType).toBe('CHECKBOX');
    expect(result.facet?.selectionMode).toBe('MULTI');
  });

  test('should create facet with all optional fields', async ({ api }) => {
    // Create a group first
    const { data: groupData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: { input: { name: 'Product Filters' } },
    });
    const groupId = groupData.catalogMutation.facetGroupCreate.facetGroup?.id;

    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'FEATURE',
          slug: 'color',
          label: 'Color',
          uiType: 'DROPDOWN',
          selectionMode: 'SINGLE',
          groupId,
          sortIndex: 5,
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet).toBeTruthy();
    expect(result.facet?.facetType).toBe('FEATURE');
    expect(result.facet?.slug).toBe('color');
    expect(result.facet?.label).toBe('Color');
    expect(result.facet?.uiType).toBe('DROPDOWN');
    expect(result.facet?.selectionMode).toBe('SINGLE');
    expect(result.facet?.sortIndex).toBe(5);
    expect(result.facet?.group?.id).toBe(groupId);
  });

  // ═══════════════════════════════════════
  // FACET TYPE TESTS
  // ═══════════════════════════════════════

  test('should create PRICE type facet', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'PRICE',
          slug: 'price-range',
          label: 'Price Range',
          uiType: 'RANGE',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet).toBeTruthy();
    expect(result.facet?.facetType).toBe('PRICE');
    expect(result.facet?.uiType).toBe('RANGE');
  });

  test('should create TAG type facet', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'collection-tags',
          label: 'Collections',
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.facetType).toBe('TAG');
  });

  test('should create FEATURE type facet', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'FEATURE',
          slug: 'material',
          label: 'Material',
          uiType: 'CHECKBOX',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.facetType).toBe('FEATURE');
  });

  test('should create OPTION type facet', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'OPTION',
          slug: 'size',
          label: 'Size',
          uiType: 'DROPDOWN',
          selectionMode: 'SINGLE',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.facetType).toBe('OPTION');
  });

  test('should create IN_STOCK type facet', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'IN_STOCK',
          slug: 'availability',
          label: 'In Stock',
          uiType: 'BOOLEAN',
          selectionMode: 'SINGLE',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.facetType).toBe('IN_STOCK');
    expect(result.facet?.uiType).toBe('BOOLEAN');
  });

  // ═══════════════════════════════════════
  // UI TYPE TESTS
  // ═══════════════════════════════════════

  test('should create facet with CHECKBOX uiType', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'checkbox-facet',
          label: 'Checkbox Facet',
          uiType: 'CHECKBOX',
        },
      },
    });

    expect(data.catalogMutation.facetCreate.facet?.uiType).toBe('CHECKBOX');
  });

  test('should create facet with RADIO uiType', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'radio-facet',
          label: 'Radio Facet',
          uiType: 'RADIO',
          selectionMode: 'SINGLE',
        },
      },
    });

    expect(data.catalogMutation.facetCreate.facet?.uiType).toBe('RADIO');
  });

  test('should create facet with DROPDOWN uiType', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'dropdown-facet',
          label: 'Dropdown Facet',
          uiType: 'DROPDOWN',
        },
      },
    });

    expect(data.catalogMutation.facetCreate.facet?.uiType).toBe('DROPDOWN');
  });

  test('should create facet with RANGE uiType', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'PRICE',
          slug: 'range-facet',
          label: 'Range Facet',
          uiType: 'RANGE',
        },
      },
    });

    expect(data.catalogMutation.facetCreate.facet?.uiType).toBe('RANGE');
  });

  test('should create facet with BOOLEAN uiType', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'IN_STOCK',
          slug: 'boolean-facet',
          label: 'Boolean Facet',
          uiType: 'BOOLEAN',
        },
      },
    });

    expect(data.catalogMutation.facetCreate.facet?.uiType).toBe('BOOLEAN');
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - UPDATE
  // ═══════════════════════════════════════

  test('should update facet label', async ({ api }) => {
    // Create a facet first
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'update-label-test',
          label: 'Original Label',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;
    expect(facetId).toBeTruthy();

    // Update the facet
    const { data } = await api.admin.mutation('facet-api/FacetUpdate', {
      variables: {
        input: {
          id: facetId,
          label: 'Updated Label',
        },
      },
    });

    const result = data.catalogMutation.facetUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.label).toBe('Updated Label');
  });

  test('should update facet with all updateable fields', async ({ api }) => {
    // Create a group for update
    const { data: groupData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: { input: { name: 'New Group' } },
    });
    const groupId = groupData.catalogMutation.facetGroupCreate.facetGroup?.id;

    // Create a facet first
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'update-all-test',
          label: 'Original',
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;

    // Update all fields
    const { data } = await api.admin.mutation('facet-api/FacetUpdate', {
      variables: {
        input: {
          id: facetId,
          slug: 'updated-slug',
          label: 'Updated',
          uiType: 'DROPDOWN',
          selectionMode: 'SINGLE',
          groupId,
          sortIndex: 10,
          minValues: 2,
          maxValuesVisible: 8,
          valueSort: 'ALPHA',
          indexable: false,
        },
      },
    });

    const result = data.catalogMutation.facetUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.slug).toBe('updated-slug');
    expect(result.facet?.label).toBe('Updated');
    expect(result.facet?.uiType).toBe('DROPDOWN');
    expect(result.facet?.selectionMode).toBe('SINGLE');
    expect(result.facet?.group?.id).toBe(groupId);
    expect(result.facet?.sortIndex).toBe(10);
    expect(result.facet?.minValues).toBe(2);
    expect(result.facet?.maxValuesVisible).toBe(8);
    expect(result.facet?.valueSort).toBe('ALPHA');
    expect(result.facet?.indexable).toBe(false);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - DELETE
  // ═══════════════════════════════════════

  test('should delete facet', async ({ api }) => {
    // Create a facet first
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'delete-test',
          label: 'Facet to Delete',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;
    expect(facetId).toBeTruthy();

    // Delete the facet
    const { data } = await api.admin.mutation('facet-api/FacetDelete', {
      variables: {
        input: { id: facetId },
      },
    });

    const result = data.catalogMutation.facetDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedFacetId).toBe(facetId);

    // Verify deletion
    const { data: queryData } = await api.admin.query('facet-api/Facet', {
      variables: { id: facetId },
    });

    expect(queryData.catalogQuery.facet).toBeNull();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - QUERIES
  // ═══════════════════════════════════════

  test('should list all facets', async ({ api }) => {
    // Create multiple facets
    await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'list-test-a',
          label: 'Facet A',
        },
      },
    });
    await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'FEATURE',
          slug: 'list-test-b',
          label: 'Facet B',
        },
      },
    });

    const { data } = await api.admin.query('facet-api/Facets', {});

    expect(data.catalogQuery.facets).toBeTruthy();
    expect(data.catalogQuery.facets.length).toBeGreaterThanOrEqual(2);

    const slugs = data.catalogQuery.facets.map((f: { slug: string }) => f.slug);
    expect(slugs).toContain('list-test-a');
    expect(slugs).toContain('list-test-b');
  });

  test('should get single facet by ID', async ({ api }) => {
    // Create a facet
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'OPTION',
          slug: 'query-single-test',
          label: 'Query Test Facet',
          uiType: 'DROPDOWN',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;

    // Query the facet
    const { data } = await api.admin.query('facet-api/Facet', {
      variables: { id: facetId },
    });

    expect(data.catalogQuery.facet).toBeTruthy();
    expect(data.catalogQuery.facet?.id).toBe(facetId);
    expect(data.catalogQuery.facet?.slug).toBe('query-single-test');
    expect(data.catalogQuery.facet?.label).toBe('Query Test Facet');
    expect(data.catalogQuery.facet?.facetType).toBe('OPTION');
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty slug', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetType: 'TAG',
          slug: '',
          label: 'Test',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.facet).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject empty label', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'valid-slug',
          label: '',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.facet).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject duplicate slug', async ({ api }) => {
    // Create first facet
    await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'duplicate-slug',
          label: 'First Facet',
        },
      },
    });

    // Try to create second facet with same slug
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      throwOnError: false,
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'duplicate-slug',
          label: 'Second Facet',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.facet).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject update with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'non-existent-id',
          label: 'New Label',
        },
      },
    });

    const result = data.catalogMutation.facetUpdate;

    expect(result.facet).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject delete with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetDelete', {
      throwOnError: false,
      variables: {
        input: { id: 'non-existent-id' },
      },
    });

    const result = data.catalogMutation.facetDelete;

    expect(result.deletedFacetId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle slug with dashes and underscores', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'my-test_slug-123',
          label: 'Special Slug Facet',
        },
      },
    });

    const result = data.catalogMutation.facetCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facet?.slug).toBe('my-test_slug-123');
  });

  test('should return null for non-existent facet ID in query', async ({ api }) => {
    const { data } = await api.admin.query('facet-api/Facet', {
      variables: { id: 'non-existent-id' },
    });

    expect(data.catalogQuery.facet).toBeNull();
  });

  test('should create facet with valueSort CUSTOM', async ({ api }) => {
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'custom-sort-facet',
          label: 'Custom Sort Facet',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;

    // Update to use CUSTOM sort
    const { data } = await api.admin.mutation('facet-api/FacetUpdate', {
      variables: {
        input: {
          id: facetId,
          valueSort: 'CUSTOM',
        },
      },
    });

    expect(data.catalogMutation.facetUpdate.facet?.valueSort).toBe('CUSTOM');
  });

  test('should create facet with valueSort COUNT', async ({ api }) => {
    const { data: createData } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'TAG',
          slug: 'count-sort-facet',
          label: 'Count Sort Facet',
        },
      },
    });

    const facetId = createData.catalogMutation.facetCreate.facet?.id;

    // Update to use COUNT sort
    const { data } = await api.admin.mutation('facet-api/FacetUpdate', {
      variables: {
        input: {
          id: facetId,
          valueSort: 'COUNT',
        },
      },
    });

    expect(data.catalogMutation.facetUpdate.facet?.valueSort).toBe('COUNT');
  });
});
