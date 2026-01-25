import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Product Features Sync API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get its ID
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function createProduct(api: any, title = 'Test Product') {
    const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    return data.inventoryMutation.productCreate.product;
  }

  /**
   * Helper to sync features
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function syncFeatures(api: any, productId: string, features: unknown[], throwOnError = true) {
    const { data } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
      variables: { input: { productId, features } },
      throwOnError,
    });

    return data.inventoryMutation.productFeaturesSync;
  }

  test.describe('Create Features', () => {
    test('should create simple attributes without groups', async ({ api }) => {
      const product = await createProduct(api, 'Product With Features');

      const result = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Material',
          values: [
            { index: 0, name: 'Cotton' },
            { index: 1, name: 'Polyester' },
          ],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Country',
          values: [
            { index: 0, name: 'Ukraine' },
            { index: 1, name: 'Poland' },
          ],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.features).toHaveLength(2);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const material = result.features.find((f: any) => f.name === 'Material');
      expect(material).toBeTruthy();
      expect(material.isGroup).toBe(false);
      expect(material.index).toEqual([0]);
      expect(material.values).toHaveLength(2);
      expect(material.values[0].name).toBe('Cotton');
      expect(material.values[1].name).toBe('Polyester');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const country = result.features.find((f: any) => f.name === 'Country');
      expect(country).toBeTruthy();
      expect(country.index).toEqual([1]);
      expect(country.values).toHaveLength(2);
    });

    test('should create features with groups (hierarchy)', async ({ api }) => {
      const product = await createProduct(api, 'Product With Groups');

      const result = await syncFeatures(api, product.id, [
        // Group: Technical Specs
        {
          index: [0],
          isGroup: true,
          name: 'Technical Specs',
        },
        // Attribute under group
        {
          index: [0, 0],
          isGroup: false,
          name: 'Weight',
          values: [
            { index: 0, name: '100g' },
            { index: 1, name: '200g' },
          ],
        },
        {
          index: [0, 1],
          isGroup: false,
          name: 'Dimensions',
          values: [
            { index: 0, name: '10x10cm' },
            { index: 1, name: '20x20cm' },
          ],
        },
        // Standalone attribute (no group)
        {
          index: [1],
          isGroup: false,
          name: 'Brand',
          values: [{ index: 0, name: 'Shopana' }],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.features).toHaveLength(4);

      // Verify group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const group = result.features.find((f: any) => f.name === 'Technical Specs');
      expect(group).toBeTruthy();
      expect(group.isGroup).toBe(true);
      expect(group.index).toEqual([0]);
      expect(group.values).toHaveLength(0); // Groups don't have values

      // Verify children have parent reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weight = result.features.find((f: any) => f.name === 'Weight');
      expect(weight).toBeTruthy();
      expect(weight.index).toEqual([0, 0]);
      expect(weight.parent?.id).toBe(group.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dimensions = result.features.find((f: any) => f.name === 'Dimensions');
      expect(dimensions).toBeTruthy();
      expect(dimensions.index).toEqual([0, 1]);
      expect(dimensions.parent?.id).toBe(group.id);

      // Standalone should not have parent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brand = result.features.find((f: any) => f.name === 'Brand');
      expect(brand).toBeTruthy();
      expect(brand.parent).toBeNull();
    });
  });

  test.describe('Update Features', () => {
    test('should update existing feature name', async ({ api }) => {
      const product = await createProduct(api, 'Product For Update');

      // Create initial features
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Material',
          values: [{ index: 0, name: 'Cotton' }],
        },
      ]);

      const createdFeature = createResult.features[0];
      const createdValueId = createdFeature.values[0].id;

      // Update feature name and value name
      const updateResult = await syncFeatures(api, product.id, [
        {
          id: createdFeature.id,
          index: [0],
          isGroup: false,
          name: 'Fabric Type', // Changed name
          values: [
            { id: createdValueId, index: 0, name: 'Organic Cotton' }, // Changed value name
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.features).toHaveLength(1);

      const updated = updateResult.features[0];
      expect(updated.id).toBe(createdFeature.id); // Same ID
      expect(updated.name).toBe('Fabric Type'); // Updated name
      expect(updated.values[0].id).toBe(createdValueId); // Same value ID
      expect(updated.values[0].name).toBe('Organic Cotton'); // Updated value name
    });

    test('should add new values to existing feature', async ({ api }) => {
      const product = await createProduct(api, 'Product Add Values');

      // Create initial feature with one value
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Size',
          values: [{ index: 0, name: 'S' }],
        },
      ]);

      const createdFeature = createResult.features[0];
      const existingValueId = createdFeature.values[0].id;

      // Add more values
      const updateResult = await syncFeatures(api, product.id, [
        {
          id: createdFeature.id,
          index: [0],
          isGroup: false,
          name: 'Size',
          values: [
            { id: existingValueId, index: 0, name: 'S' },
            { index: 1, name: 'M' }, // New value
            { index: 2, name: 'L' }, // New value
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.features[0].values).toHaveLength(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(updateResult.features[0].values.map((v: any) => v.name)).toEqual(['S', 'M', 'L']);
    });

    test('should reorder features by changing index', async ({ api }) => {
      const product = await createProduct(api, 'Product Reorder');

      // Create features in order: A, B
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Feature A',
          values: [{ index: 0, name: 'Value A' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Feature B',
          values: [{ index: 0, name: 'Value B' }],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const featureA = createResult.features.find((f: any) => f.name === 'Feature A');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const featureB = createResult.features.find((f: any) => f.name === 'Feature B');

      expect(featureA).toBeTruthy();
      expect(featureB).toBeTruthy();

      // Reorder: B, A
      const updateResult = await syncFeatures(api, product.id, [
        {
          id: featureB.id,
          index: [0], // B is now first
          isGroup: false,
          name: 'Feature B',
          values: [{ id: featureB.values[0].id, index: 0, name: 'Value B' }],
        },
        {
          id: featureA.id,
          index: [1], // A is now second
          isGroup: false,
          name: 'Feature A',
          values: [{ id: featureA.values[0].id, index: 0, name: 'Value A' }],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedB = updateResult.features.find((f: any) => f.name === 'Feature B');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedA = updateResult.features.find((f: any) => f.name === 'Feature A');

      expect(updatedB).toBeTruthy();
      expect(updatedA).toBeTruthy();
      expect(updatedB.index).toEqual([0]);
      expect(updatedA.index).toEqual([1]);
    });
  });

  test.describe('Delete Features', () => {
    test('should delete features by omitting from sync', async ({ api }) => {
      const product = await createProduct(api, 'Product Delete Features');

      // Create two features
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'To Keep',
          values: [{ index: 0, name: 'Keep Value' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'To Delete',
          values: [{ index: 0, name: 'Delete Value' }],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const featureToKeep = createResult.features.find((f: any) => f.name === 'To Keep');
      expect(featureToKeep).toBeTruthy();

      // Sync with only one feature (omit "To Delete")
      const syncResult = await syncFeatures(api, product.id, [
        {
          id: featureToKeep.id,
          index: [0],
          isGroup: false,
          name: 'To Keep',
          values: [{ id: featureToKeep.values[0].id, index: 0, name: 'Keep Value' }],
        },
      ]);

      expect(syncResult.userErrors).toHaveLength(0);
      expect(syncResult.features).toHaveLength(1);
      expect(syncResult.features[0].name).toBe('To Keep');
    });

    test('should delete all features when syncing empty array', async ({ api }) => {
      const product = await createProduct(api, 'Product Clear Features');

      // Create features
      await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Feature 1',
          values: [{ index: 0, name: 'Value 1' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Feature 2',
          values: [{ index: 0, name: 'Value 2' }],
        },
      ]);

      // Sync with empty array
      const clearResult = await syncFeatures(api, product.id, []);

      expect(clearResult.userErrors).toHaveLength(0);
      expect(clearResult.features).toHaveLength(0);
    });

    test('should delete values by omitting from sync', async ({ api }) => {
      const product = await createProduct(api, 'Product Delete Values');

      // Create feature with multiple values
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Sizes',
          values: [
            { index: 0, name: 'S' },
            { index: 1, name: 'M' },
            { index: 2, name: 'L' },
          ],
        },
      ]);

      const feature = createResult.features[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueToKeep = feature.values.find((v: any) => v.name === 'M');
      expect(valueToKeep).toBeTruthy();

      // Sync with only one value
      const syncResult = await syncFeatures(api, product.id, [
        {
          id: feature.id,
          index: [0],
          isGroup: false,
          name: 'Sizes',
          values: [{ id: valueToKeep.id, index: 0, name: 'M' }], // Only keep M
        },
      ]);

      expect(syncResult.userErrors).toHaveLength(0);
      expect(syncResult.features[0].values).toHaveLength(1);
      expect(syncResult.features[0].values[0].name).toBe('M');
    });
  });

  test.describe('Error Handling', () => {
    test('should return error for non-existent product', async ({ api }) => {
      const result = await syncFeatures(
        api,
        'gid://shopana/Product/00000000-0000-0000-0000-000000000000',
        [],
        false
      );

      expect(result.product).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });

    test('should return error when providing values for a group', async ({ api }) => {
      const product = await createProduct(api, 'Product Invalid Group');

      const result = await syncFeatures(
        api,
        product.id,
        [
          {
            index: [0],
            isGroup: true,
            name: 'Group With Values',
            values: [{ index: 0, name: 'Should Not Exist' }],
          },
        ],
        false
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Complex Scenarios', () => {
    test('should handle complete feature structure replacement', async ({ api }) => {
      const product = await createProduct(api, 'Product Structure Replace');

      // Create initial structure
      await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: true,
          name: 'Old Group',
        },
        {
          index: [0, 0],
          isGroup: false,
          name: 'Old Attribute',
          values: [{ index: 0, name: 'Old Value' }],
        },
      ]);

      // Replace with completely new structure
      const result = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'New Feature 1',
          values: [
            { index: 0, name: 'Value A' },
            { index: 1, name: 'Value B' },
          ],
        },
        {
          index: [1],
          isGroup: true,
          name: 'New Group',
        },
        {
          index: [1, 0],
          isGroup: false,
          name: 'New Nested Feature',
          values: [{ index: 0, name: 'Nested Value' }],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.features).toHaveLength(3);

      // Old features should be gone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldGroup = result.features.find((f: any) => f.name === 'Old Group');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldAttr = result.features.find((f: any) => f.name === 'Old Attribute');
      expect(oldGroup).toBeUndefined();
      expect(oldAttr).toBeUndefined();

      // New features should exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newFeature1 = result.features.find((f: any) => f.name === 'New Feature 1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newGroup = result.features.find((f: any) => f.name === 'New Group');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newNested = result.features.find((f: any) => f.name === 'New Nested Feature');

      expect(newFeature1).toBeTruthy();
      expect(newGroup).toBeTruthy();
      expect(newNested).toBeTruthy();
      expect(newNested.parent?.id).toBe(newGroup.id);
    });

    test('should preserve feature IDs when updating', async ({ api }) => {
      const product = await createProduct(api, 'Product Preserve IDs');

      // Create features
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Persistent Feature',
          values: [{ index: 0, name: 'Persistent Value' }],
        },
      ]);

      const originalFeature = createResult.features[0];
      const originalFeatureId = originalFeature.id;
      const originalValueId = originalFeature.values[0].id;

      // Update using the same IDs
      const updateResult = await syncFeatures(api, product.id, [
        {
          id: originalFeatureId,
          index: [0],
          isGroup: false,
          name: 'Updated Name',
          values: [{ id: originalValueId, index: 0, name: 'Updated Value' }],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.features[0].id).toBe(originalFeatureId);
      expect(updateResult.features[0].values[0].id).toBe(originalValueId);
      expect(updateResult.features[0].name).toBe('Updated Name');
      expect(updateResult.features[0].values[0].name).toBe('Updated Value');
    });
  });
});
