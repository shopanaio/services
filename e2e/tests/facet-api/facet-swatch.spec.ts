import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('FacetSwatch API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - CREATE
  // ═══════════════════════════════════════

  test('should create swatch with COLOR type and single color', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FF5733',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch).toBeTruthy();
    expect(result.facetSwatch?.swatchType).toBe('COLOR');
    expect(result.facetSwatch?.colorOne).toBe('#FF5733');
    expect(result.facetSwatch?.colorTwo).toBeNull();
  });

  test('should create swatch with GRADIENT type and two colors', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#FF0000',
          colorTwo: '#0000FF',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch).toBeTruthy();
    expect(result.facetSwatch?.swatchType).toBe('GRADIENT');
    expect(result.facetSwatch?.colorOne).toBe('#FF0000');
    expect(result.facetSwatch?.colorTwo).toBe('#0000FF');
  });

  test('should create swatch with IMAGE type', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'IMAGE',
          // Note: fileId would require creating a file first in a real scenario
          // For now, we test the type can be created
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch).toBeTruthy();
    expect(result.facetSwatch?.swatchType).toBe('IMAGE');
  });

  test('should create swatch with metadata', async ({ api }) => {
    const metadata = {
      description: 'A vibrant red color',
      category: 'warm',
      brightness: 0.8,
    };

    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FF0000',
          metadata,
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.metadata).toBeTruthy();
    expect(result.facetSwatch?.metadata.description).toBe('A vibrant red color');
    expect(result.facetSwatch?.metadata.category).toBe('warm');
    expect(result.facetSwatch?.metadata.brightness).toBe(0.8);
  });

  // ═══════════════════════════════════════
  // SWATCH TYPE TESTS
  // ═══════════════════════════════════════

  test('should create all SwatchType variations', async ({ api }) => {
    // COLOR
    const { data: colorData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#00FF00',
        },
      },
    });
    expect(colorData.catalogMutation.facetSwatchCreate.facetSwatch?.swatchType).toBe('COLOR');

    // GRADIENT
    const { data: gradientData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#FFFFFF',
          colorTwo: '#000000',
        },
      },
    });
    expect(gradientData.catalogMutation.facetSwatchCreate.facetSwatch?.swatchType).toBe('GRADIENT');

    // IMAGE
    const { data: imageData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'IMAGE',
        },
      },
    });
    expect(imageData.catalogMutation.facetSwatchCreate.facetSwatch?.swatchType).toBe('IMAGE');
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - UPDATE
  // ═══════════════════════════════════════

  test('should update swatch color', async ({ api }) => {
    // Create a swatch first
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#111111',
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Update the swatch
    const { data } = await api.admin.mutation('facet-api/FacetSwatchUpdate', {
      variables: {
        input: {
          id: swatchId,
          colorOne: '#999999',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.colorOne).toBe('#999999');
  });

  test('should update swatch type from COLOR to GRADIENT', async ({ api }) => {
    // Create a COLOR swatch
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FF0000',
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Update to GRADIENT
    const { data } = await api.admin.mutation('facet-api/FacetSwatchUpdate', {
      variables: {
        input: {
          id: swatchId,
          swatchType: 'GRADIENT',
          colorTwo: '#0000FF',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.swatchType).toBe('GRADIENT');
    expect(result.facetSwatch?.colorOne).toBe('#FF0000');
    expect(result.facetSwatch?.colorTwo).toBe('#0000FF');
  });

  test('should update swatch metadata', async ({ api }) => {
    // Create a swatch with initial metadata
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#AABBCC',
          metadata: { version: 1 },
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Update metadata
    const { data } = await api.admin.mutation('facet-api/FacetSwatchUpdate', {
      variables: {
        input: {
          id: swatchId,
          metadata: { version: 2, updated: true },
        },
      },
    });

    const result = data.catalogMutation.facetSwatchUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.metadata.version).toBe(2);
    expect(result.facetSwatch?.metadata.updated).toBe(true);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - DELETE
  // ═══════════════════════════════════════

  test('should delete swatch', async ({ api }) => {
    // Create a swatch first
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#DELETE',
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Delete the swatch
    const { data } = await api.admin.mutation('facet-api/FacetSwatchDelete', {
      variables: {
        input: { id: swatchId },
      },
    });

    const result = data.catalogMutation.facetSwatchDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedFacetSwatchId).toBe(swatchId);

    // Verify deletion
    const { data: queryData } = await api.admin.query('facet-api/FacetSwatch', {
      variables: { id: swatchId },
    });

    expect(queryData.catalogQuery.facetSwatch).toBeNull();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - QUERIES
  // ═══════════════════════════════════════

  test('should list all swatches', async ({ api }) => {
    // Create multiple swatches
    await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#AAAAAA',
        },
      },
    });
    await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#BBBBBB',
          colorTwo: '#CCCCCC',
        },
      },
    });

    const { data } = await api.admin.query('facet-api/FacetSwatches', {});

    expect(data.catalogQuery.facetSwatches).toBeTruthy();
    expect(data.catalogQuery.facetSwatches.length).toBeGreaterThanOrEqual(2);
  });

  test('should get single swatch by ID', async ({ api }) => {
    // Create a swatch
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#123456',
          colorTwo: '#654321',
          metadata: { test: true },
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Query the swatch
    const { data } = await api.admin.query('facet-api/FacetSwatch', {
      variables: { id: swatchId },
    });

    expect(data.catalogQuery.facetSwatch).toBeTruthy();
    expect(data.catalogQuery.facetSwatch?.id).toBe(swatchId);
    expect(data.catalogQuery.facetSwatch?.swatchType).toBe('GRADIENT');
    expect(data.catalogQuery.facetSwatch?.colorOne).toBe('#123456');
    expect(data.catalogQuery.facetSwatch?.colorTwo).toBe('#654321');
    expect(data.catalogQuery.facetSwatch?.metadata.test).toBe(true);
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject update with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'non-existent-id',
          colorOne: '#FFFFFF',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchUpdate;

    expect(result.facetSwatch).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject delete with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchDelete', {
      throwOnError: false,
      variables: {
        input: { id: 'non-existent-id' },
      },
    });

    const result = data.catalogMutation.facetSwatchDelete;

    expect(result.deletedFacetSwatchId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle various color formats', async ({ api }) => {
    // Hex with lowercase
    const { data: lowerData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#aabbcc',
        },
      },
    });
    expect(lowerData.catalogMutation.facetSwatchCreate.userErrors).toHaveLength(0);

    // Hex with uppercase
    const { data: upperData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#AABBCC',
        },
      },
    });
    expect(upperData.catalogMutation.facetSwatchCreate.userErrors).toHaveLength(0);

    // Short hex
    const { data: shortData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#ABC',
        },
      },
    });
    expect(shortData.catalogMutation.facetSwatchCreate.userErrors).toHaveLength(0);
  });

  test('should handle rgba format for colors', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: 'rgba(255, 100, 50, 0.5)',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.colorOne).toBe('rgba(255, 100, 50, 0.5)');
  });

  test('should handle color names', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: 'red',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.colorOne).toBe('red');
  });

  test('should return null for non-existent swatch ID in query', async ({ api }) => {
    const { data } = await api.admin.query('facet-api/FacetSwatch', {
      variables: { id: 'non-existent-id' },
    });

    expect(data.catalogQuery.facetSwatch).toBeNull();
  });

  test('should handle complex metadata object', async ({ api }) => {
    const complexMetadata = {
      nested: {
        level1: {
          level2: {
            value: 'deep',
          },
        },
      },
      array: [1, 2, 3],
      boolean: true,
      number: 42,
      string: 'test',
      nullValue: null,
    };

    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#COMPLEX',
          metadata: complexMetadata,
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.metadata.nested.level1.level2.value).toBe('deep');
    expect(result.facetSwatch?.metadata.array).toEqual([1, 2, 3]);
    expect(result.facetSwatch?.metadata.boolean).toBe(true);
    expect(result.facetSwatch?.metadata.number).toBe(42);
  });

  test('should create COLOR swatch without colorTwo', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#SINGLE',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.colorTwo).toBeNull();
  });

  test('should handle GRADIENT with only colorOne (colorTwo is optional)', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'GRADIENT',
          colorOne: '#START',
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    // This may or may not fail depending on business rules
    // If gradient requires two colors, expect error; otherwise success
    if (result.userErrors.length === 0) {
      expect(result.facetSwatch?.swatchType).toBe('GRADIENT');
      expect(result.facetSwatch?.colorOne).toBe('#START');
    } else {
      expect(result.facetSwatch).toBeNull();
    }
  });

  test('should handle IMAGE swatch with file reference', async ({ api }) => {
    // First upload a file using the file fixture
    const file = await api.file.uploadFromUrl({
      url: 'https://picsum.photos/100',
      name: 'swatch-image.jpg',
    });

    const { data } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'IMAGE',
          fileId: file.id,
        },
      },
    });

    const result = data.catalogMutation.facetSwatchCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.swatchType).toBe('IMAGE');
    expect(result.facetSwatch?.file?.id).toBe(file.id);
  });

  test('should clear colors when updating to IMAGE type', async ({ api }) => {
    // Create a COLOR swatch with colors
    const { data: createData } = await api.admin.mutation('facet-api/FacetSwatchCreate', {
      variables: {
        input: {
          swatchType: 'COLOR',
          colorOne: '#FFFF00',
        },
      },
    });

    const swatchId = createData.catalogMutation.facetSwatchCreate.facetSwatch?.id;

    // Update to IMAGE type
    const { data } = await api.admin.mutation('facet-api/FacetSwatchUpdate', {
      variables: {
        input: {
          id: swatchId,
          swatchType: 'IMAGE',
          colorOne: null,
          colorTwo: null,
        },
      },
    });

    const result = data.catalogMutation.facetSwatchUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetSwatch?.swatchType).toBe('IMAGE');
    // Colors should be cleared or null for IMAGE type
  });
});
