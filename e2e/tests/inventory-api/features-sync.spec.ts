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

    return data.catalogMutation.productCreate.product;
  }

  /**
   * Helper to sync features
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function syncFeatures(
    api: any,
    productId: string,
    features: unknown[],
    throwOnError = true,
  ) {
    const { data } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
      variables: { input: { productId, features } },
      throwOnError,
    });

    return data.catalogMutation.productFeaturesSync;
  }

  test.describe('Create Features', () => {
    test('should create simple attributes without groups', async ({ api }) => {
      const product = await createProduct(api, 'Product With Features');

      const result = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Material',
          slug: 'material',
          values: [
            { index: 0, name: 'Cotton', slug: 'cotton' },
            { index: 1, name: 'Polyester', slug: 'polyester' },
          ],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Country',
          slug: 'country',
          values: [
            { index: 0, name: 'Ukraine', slug: 'ukraine' },
            { index: 1, name: 'Poland', slug: 'poland' },
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
          slug: 'technical-specs',
        },
        // Attribute under group
        {
          index: [0, 0],
          isGroup: false,
          name: 'Weight',
          slug: 'weight',
          values: [
            { index: 0, name: '100g', slug: '100g' },
            { index: 1, name: '200g', slug: '200g' },
          ],
        },
        {
          index: [0, 1],
          isGroup: false,
          name: 'Dimensions',
          slug: 'dimensions',
          values: [
            { index: 0, name: '10x10cm', slug: '10x10cm' },
            { index: 1, name: '20x20cm', slug: '20x20cm' },
          ],
        },
        // Standalone attribute (no group)
        {
          index: [1],
          isGroup: false,
          name: 'Brand',
          slug: 'brand',
          values: [{ index: 0, name: 'Shopana', slug: 'shopana' }],
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
          slug: 'material',
          values: [{ index: 0, name: 'Cotton', slug: 'cotton' }],
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
          slug: 'fabric-type',
          values: [
            { id: createdValueId, index: 0, name: 'Organic Cotton', slug: 'organic-cotton' }, // Changed value name
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
          slug: 'size',
          values: [{ index: 0, name: 'S', slug: 's' }],
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
          slug: 'size',
          values: [
            { id: existingValueId, index: 0, name: 'S', slug: 's' },
            { index: 1, name: 'M', slug: 'm' }, // New value
            { index: 2, name: 'L', slug: 'l' }, // New value
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
          slug: 'feature-a',
          values: [{ index: 0, name: 'Value A', slug: 'value-a' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Feature B',
          slug: 'feature-b',
          values: [{ index: 0, name: 'Value B', slug: 'value-b' }],
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
          slug: 'feature-b',
          values: [{ id: featureB.values[0].id, index: 0, name: 'Value B', slug: 'value-b' }],
        },
        {
          id: featureA.id,
          index: [1], // A is now second
          isGroup: false,
          name: 'Feature A',
          slug: 'feature-a',
          values: [{ id: featureA.values[0].id, index: 0, name: 'Value A', slug: 'value-a' }],
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
          slug: 'to-keep',
          values: [{ index: 0, name: 'Keep Value', slug: 'keep-value' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'To Delete',
          slug: 'to-delete',
          values: [{ index: 0, name: 'Delete Value', slug: 'delete-value' }],
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
          slug: 'to-keep',
          values: [{ id: featureToKeep.values[0].id, index: 0, name: 'Keep Value', slug: 'keep-value' }],
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
          slug: 'feature-1',
          values: [{ index: 0, name: 'Value 1', slug: 'value-1' }],
        },
        {
          index: [1],
          isGroup: false,
          name: 'Feature 2',
          slug: 'feature-2',
          values: [{ index: 0, name: 'Value 2', slug: 'value-2' }],
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
          slug: 'sizes',
          values: [
            { index: 0, name: 'S', slug: 's' },
            { index: 1, name: 'M', slug: 'm' },
            { index: 2, name: 'L', slug: 'l' },
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
          slug: 'sizes',
          values: [{ id: valueToKeep.id, index: 0, name: 'M', slug: 'm' }], // Only keep M
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
        false,
      );

      expect(result.product).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      // API returns VALIDATION_ERROR for invalid Global ID format
      expect(['NOT_FOUND', 'VALIDATION_ERROR']).toContain(result.userErrors[0].code);
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
            slug: 'group-with-values',
            values: [{ index: 0, name: 'Should Not Exist', slug: 'should-not-exist' }],
          },
        ],
        false,
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
          slug: 'old-group',
        },
        {
          index: [0, 0],
          isGroup: false,
          name: 'Old Attribute',
          slug: 'old-attribute',
          values: [{ index: 0, name: 'Old Value', slug: 'old-value' }],
        },
      ]);

      // Replace with completely new structure
      const result = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'New Feature 1',
          slug: 'new-feature-1',
          values: [
            { index: 0, name: 'Value A', slug: 'value-a' },
            { index: 1, name: 'Value B', slug: 'value-b' },
          ],
        },
        {
          index: [1],
          isGroup: true,
          name: 'New Group',
          slug: 'new-group',
        },
        {
          index: [1, 0],
          isGroup: false,
          name: 'New Nested Feature',
          slug: 'new-nested-feature',
          values: [{ index: 0, name: 'Nested Value', slug: 'nested-value' }],
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

    test('should handle complex reorder with group changes and modifications', async ({ api }) => {
      const product = await createProduct(api, 'Product Complex Reorder');

      // Initial structure:
      // [0] Group A (Technical)
      //   [0,0] Weight (100g, 200g)
      //   [0,1] Dimensions (10x10, 20x20)
      // [1] Group B (Materials)
      //   [1,0] Fabric (Cotton, Silk)
      // [2] Brand (standalone: Nike, Adidas)
      const createResult = await syncFeatures(api, product.id, [
        { index: [0], isGroup: true, name: 'Technical', slug: 'technical' },
        {
          index: [0, 0],
          isGroup: false,
          name: 'Weight',
          slug: 'weight',
          values: [
            { index: 0, name: '100g', slug: '100g' },
            { index: 1, name: '200g', slug: '200g' },
          ],
        },
        {
          index: [0, 1],
          isGroup: false,
          name: 'Dimensions',
          slug: 'dimensions',
          values: [
            { index: 0, name: '10x10', slug: '10x10' },
            { index: 1, name: '20x20', slug: '20x20' },
          ],
        },
        { index: [1], isGroup: true, name: 'Materials', slug: 'materials' },
        {
          index: [1, 0],
          isGroup: false,
          name: 'Fabric',
          slug: 'fabric',
          values: [
            { index: 0, name: 'Cotton', slug: 'cotton' },
            { index: 1, name: 'Silk', slug: 'silk' },
          ],
        },
        {
          index: [2],
          isGroup: false,
          name: 'Brand',
          slug: 'brand',
          values: [
            { index: 0, name: 'Nike', slug: 'nike' },
            { index: 1, name: 'Adidas', slug: 'adidas' },
          ],
        },
      ]);

      expect(createResult.userErrors).toHaveLength(0);
      expect(createResult.features).toHaveLength(6);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupA = createResult.features.find((f: any) => f.name === 'Technical');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupB = createResult.features.find((f: any) => f.name === 'Materials');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weight = createResult.features.find((f: any) => f.name === 'Weight');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dimensions = createResult.features.find((f: any) => f.name === 'Dimensions');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fabric = createResult.features.find((f: any) => f.name === 'Fabric');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brand = createResult.features.find((f: any) => f.name === 'Brand');

      expect(groupA).toBeTruthy();
      expect(groupB).toBeTruthy();
      expect(weight).toBeTruthy();
      expect(dimensions).toBeTruthy();
      expect(fabric).toBeTruthy();
      expect(brand).toBeTruthy();

      // Complex transformation:
      // 1. Swap groups: Materials [0], Technical [1]
      // 2. Move Weight from Technical to Materials
      // 3. Move Fabric from Materials to Technical
      // 4. Rename "Technical" to "Specifications"
      // 5. Add "300g" to Weight, remove "100g"
      // 6. Add new "Color" to Materials
      // 7. Delete Dimensions
      // 8. Move Brand inside Materials
      //
      // New structure:
      // [0] Materials
      //   [0,0] Weight (200g, 300g)
      //   [0,1] Brand (Nike, Adidas, Puma)
      //   [0,2] Color (Red, Blue) - NEW
      // [1] Specifications (renamed)
      //   [1,0] Fabric (Cotton, Silk, Wool)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weight200gValue = weight.values.find((v: any) => v.name === '200g');

      const updateResult = await syncFeatures(api, product.id, [
        { id: groupB.id, index: [0], isGroup: true, name: 'Materials', slug: 'materials' },
        {
          id: weight.id,
          index: [0, 0],
          isGroup: false,
          name: 'Weight',
          slug: 'weight',
          values: [
            { id: weight200gValue.id, index: 0, name: '200g', slug: '200g' },
            { index: 1, name: '300g', slug: '300g' },
          ],
        },
        {
          id: brand.id,
          index: [0, 1],
          isGroup: false,
          name: 'Brand',
          slug: 'brand',
          values: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { id: brand.values.find((v: any) => v.name === 'Nike').id, index: 0, name: 'Nike', slug: 'nike' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { id: brand.values.find((v: any) => v.name === 'Adidas').id, index: 1, name: 'Adidas', slug: 'adidas' },
            { index: 2, name: 'Puma', slug: 'puma' },
          ],
        },
        {
          index: [0, 2],
          isGroup: false,
          name: 'Color',
          slug: 'color',
          values: [
            { index: 0, name: 'Red', slug: 'red' },
            { index: 1, name: 'Blue', slug: 'blue' },
          ],
        },
        { id: groupA.id, index: [1], isGroup: true, name: 'Specifications', slug: 'specifications' },
        {
          id: fabric.id,
          index: [1, 0],
          isGroup: false,
          name: 'Fabric',
          slug: 'fabric',
          values: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {
              id: fabric.values.find((v: any) => v.name === 'Cotton').id,
              index: 0,
              name: 'Cotton',
              slug: 'cotton',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { id: fabric.values.find((v: any) => v.name === 'Silk').id, index: 1, name: 'Silk', slug: 'silk' },
            { index: 2, name: 'Wool', slug: 'wool' },
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.features).toHaveLength(6);

      // Verify Materials is now [0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedGroupB = updateResult.features.find((f: any) => f.name === 'Materials');
      expect(updatedGroupB.id).toBe(groupB.id);
      expect(updatedGroupB.index).toEqual([0]);

      // Verify Specifications (renamed) is [1]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedGroupA = updateResult.features.find((f: any) => f.name === 'Specifications');
      expect(updatedGroupA.id).toBe(groupA.id);
      expect(updatedGroupA.index).toEqual([1]);

      // Verify Weight moved to Materials [0,0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedWeight = updateResult.features.find((f: any) => f.name === 'Weight');
      expect(updatedWeight.id).toBe(weight.id);
      expect(updatedWeight.index).toEqual([0, 0]);
      expect(updatedWeight.parent?.id).toBe(groupB.id);
      expect(updatedWeight.values).toHaveLength(2);
      expect(updatedWeight.values[0].name).toBe('200g');
      expect(updatedWeight.values[1].name).toBe('300g');

      // Verify Brand moved inside Materials [0,1]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedBrand = updateResult.features.find((f: any) => f.name === 'Brand');
      expect(updatedBrand.id).toBe(brand.id);
      expect(updatedBrand.index).toEqual([0, 1]);
      expect(updatedBrand.parent?.id).toBe(groupB.id);
      expect(updatedBrand.values).toHaveLength(3);

      // Verify Color is new at [0,2]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color = updateResult.features.find((f: any) => f.name === 'Color');
      expect(color).toBeTruthy();
      expect(color.index).toEqual([0, 2]);
      expect(color.parent?.id).toBe(groupB.id);

      // Verify Fabric moved to Specifications [1,0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedFabric = updateResult.features.find((f: any) => f.name === 'Fabric');
      expect(updatedFabric.id).toBe(fabric.id);
      expect(updatedFabric.index).toEqual([1, 0]);
      expect(updatedFabric.parent?.id).toBe(groupA.id);
      expect(updatedFabric.values).toHaveLength(3);

      // Verify Dimensions deleted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deletedDimensions = updateResult.features.find((f: any) => f.name === 'Dimensions');
      expect(deletedDimensions).toBeUndefined();
    });

    test('should preserve feature IDs when updating', async ({ api }) => {
      const product = await createProduct(api, 'Product Preserve IDs');

      // Create features
      const createResult = await syncFeatures(api, product.id, [
        {
          index: [0],
          isGroup: false,
          name: 'Persistent Feature',
          slug: 'persistent-feature',
          values: [{ index: 0, name: 'Persistent Value', slug: 'persistent-value' }],
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
          slug: 'updated-name',
          values: [{ id: originalValueId, index: 0, name: 'Updated Value', slug: 'updated-value' }],
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
