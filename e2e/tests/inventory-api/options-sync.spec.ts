import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Product Options Sync API', () => {
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
   * Helper to sync options
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function syncOptions(api: any, productId: string, options: unknown[], throwOnError = true) {
    const { data } = await api.admin.mutation('inventory-api/ProductOptionsSync', {
      variables: { input: { productId, options } },
      throwOnError,
    });

    return data.catalogMutation.productOptionsSync;
  }

  test.describe('Create Options', () => {
    test('should create simple options with values', async ({ api }) => {
      const product = await createProduct(api, 'Product With Options');

      const result = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [
            { index: 0, slug: 's', name: 'Small' },
            { index: 1, slug: 'm', name: 'Medium' },
            { index: 2, slug: 'l', name: 'Large' },
          ],
        },
        {
          index: 1,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [
            { index: 0, slug: 'red', name: 'Red' },
            { index: 1, slug: 'blue', name: 'Blue' },
          ],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.options).toHaveLength(2);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const size = result.options.find((o: any) => o.slug === 'size');
      expect(size).toBeTruthy();
      expect(size.name).toBe('Size');
      expect(size.displayType).toBe('BUTTONS');
      expect(size.values).toHaveLength(3);
      expect(size.values[0].name).toBe('Small');
      expect(size.values[1].name).toBe('Medium');
      expect(size.values[2].name).toBe('Large');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color = result.options.find((o: any) => o.slug === 'color');
      expect(color).toBeTruthy();
      expect(color.name).toBe('Color');
      expect(color.displayType).toBe('DROPDOWN');
      expect(color.values).toHaveLength(2);
    });

    test('should create options with swatches', async ({ api }) => {
      const product = await createProduct(api, 'Product With Swatches');

      const result = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'color',
          name: 'Color',
          displayType: 'SWATCH',
          values: [
            {
              index: 0,
              slug: 'red',
              name: 'Red',
              swatch: { swatchType: 'COLOR', colorOne: '#FF0000' },
            },
            {
              index: 1,
              slug: 'blue',
              name: 'Blue',
              swatch: { swatchType: 'COLOR', colorOne: '#0000FF' },
            },
            {
              index: 2,
              slug: 'gradient',
              name: 'Sunset',
              swatch: { swatchType: 'GRADIENT', colorOne: '#FF6B6B', colorTwo: '#4ECDC4' },
            },
          ],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.options).toHaveLength(1);

      const colorOption = result.options[0];
      expect(colorOption.displayType).toBe('SWATCH');
      expect(colorOption.values).toHaveLength(3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const red = colorOption.values.find((v: any) => v.slug === 'red');
      expect(red.swatch).toBeTruthy();
      expect(red.swatch.swatchType).toBe('COLOR');
      expect(red.swatch.colorOne).toBe('#FF0000');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gradient = colorOption.values.find((v: any) => v.slug === 'gradient');
      expect(gradient.swatch.swatchType).toBe('GRADIENT');
      expect(gradient.swatch.colorOne).toBe('#FF6B6B');
      expect(gradient.swatch.colorTwo).toBe('#4ECDC4');
    });
  });

  test.describe('Update Options', () => {
    test('should update existing option name and display type', async ({ api }) => {
      const product = await createProduct(api, 'Product For Update');

      // Create initial option
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'Small' }],
        },
      ]);

      const createdOption = createResult.options[0];
      const createdValueId = createdOption.values[0].id;

      // Update option name and display type
      const updateResult = await syncOptions(api, product.id, [
        {
          id: createdOption.id,
          index: 0,
          slug: 'size',
          name: 'Clothing Size', // Changed name
          displayType: 'DROPDOWN', // Changed display type
          values: [
            { id: createdValueId, index: 0, slug: 's', name: 'Small (S)' }, // Changed value name
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options).toHaveLength(1);

      const updated = updateResult.options[0];
      expect(updated.id).toBe(createdOption.id); // Same ID
      expect(updated.name).toBe('Clothing Size'); // Updated name
      expect(updated.displayType).toBe('DROPDOWN'); // Updated display type
      expect(updated.values[0].id).toBe(createdValueId); // Same value ID
      expect(updated.values[0].name).toBe('Small (S)'); // Updated value name
    });

    test('should add new values to existing option', async ({ api }) => {
      const product = await createProduct(api, 'Product Add Values');

      // Create initial option with one value
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
      ]);

      const createdOption = createResult.options[0];
      const existingValueId = createdOption.values[0].id;

      // Add more values
      const updateResult = await syncOptions(api, product.id, [
        {
          id: createdOption.id,
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [
            { id: existingValueId, index: 0, slug: 's', name: 'S' },
            { index: 1, slug: 'm', name: 'M' }, // New value
            { index: 2, slug: 'l', name: 'L' }, // New value
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options[0].values).toHaveLength(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(updateResult.options[0].values.map((v: any) => v.name)).toEqual(['S', 'M', 'L']);
    });

    test('should reorder options by changing index', async ({ api }) => {
      const product = await createProduct(api, 'Product Reorder');

      // Create options in order: Size, Color
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
        {
          index: 1,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'red', name: 'Red' }],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeOption = createResult.options.find((o: any) => o.slug === 'size');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colorOption = createResult.options.find((o: any) => o.slug === 'color');

      expect(sizeOption).toBeTruthy();
      expect(colorOption).toBeTruthy();

      // Reorder: Color, Size
      const updateResult = await syncOptions(api, product.id, [
        {
          id: colorOption.id,
          index: 0, // Color is now first
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [{ id: colorOption.values[0].id, index: 0, slug: 'red', name: 'Red' }],
        },
        {
          id: sizeOption.id,
          index: 1, // Size is now second
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ id: sizeOption.values[0].id, index: 0, slug: 's', name: 'S' }],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options).toHaveLength(2);
    });

    test('should update swatch values', async ({ api }) => {
      const product = await createProduct(api, 'Product Update Swatch');

      // Create option with swatch
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'color',
          name: 'Color',
          displayType: 'SWATCH',
          values: [
            {
              index: 0,
              slug: 'red',
              name: 'Red',
              swatch: { swatchType: 'COLOR', colorOne: '#FF0000' },
            },
          ],
        },
      ]);

      const createdOption = createResult.options[0];
      const createdValue = createdOption.values[0];

      // Update swatch color
      const updateResult = await syncOptions(api, product.id, [
        {
          id: createdOption.id,
          index: 0,
          slug: 'color',
          name: 'Color',
          displayType: 'SWATCH',
          values: [
            {
              id: createdValue.id,
              index: 0,
              slug: 'red',
              name: 'Crimson Red', // Updated name
              swatch: { swatchType: 'COLOR', colorOne: '#DC143C' }, // Updated color
            },
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      const updatedValue = updateResult.options[0].values[0];
      expect(updatedValue.name).toBe('Crimson Red');
      expect(updatedValue.swatch.colorOne).toBe('#DC143C');
    });
  });

  test.describe('Delete Options', () => {
    test('should delete options by omitting from sync', async ({ api }) => {
      const product = await createProduct(api, 'Product Delete Options');

      // Create two options
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
        {
          index: 1,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'red', name: 'Red' }],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeOption = createResult.options.find((o: any) => o.slug === 'size');
      expect(sizeOption).toBeTruthy();

      // Sync with only one option (omit "Color")
      const syncResult = await syncOptions(api, product.id, [
        {
          id: sizeOption.id,
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ id: sizeOption.values[0].id, index: 0, slug: 's', name: 'S' }],
        },
      ]);

      expect(syncResult.userErrors).toHaveLength(0);
      expect(syncResult.options).toHaveLength(1);
      expect(syncResult.options[0].slug).toBe('size');
    });

    test('should delete all options when syncing empty array', async ({ api }) => {
      const product = await createProduct(api, 'Product Clear Options');

      // Create options
      await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
        {
          index: 1,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'red', name: 'Red' }],
        },
      ]);

      // Sync with empty array
      const clearResult = await syncOptions(api, product.id, []);

      expect(clearResult.userErrors).toHaveLength(0);
      expect(clearResult.options).toHaveLength(0);
    });

    test('should delete values by omitting from sync', async ({ api }) => {
      const product = await createProduct(api, 'Product Delete Values');

      // Create option with multiple values
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [
            { index: 0, slug: 's', name: 'S' },
            { index: 1, slug: 'm', name: 'M' },
            { index: 2, slug: 'l', name: 'L' },
          ],
        },
      ]);

      const option = createResult.options[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueToKeep = option.values.find((v: any) => v.name === 'M');
      expect(valueToKeep).toBeTruthy();

      // Sync with only one value
      const syncResult = await syncOptions(api, product.id, [
        {
          id: option.id,
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ id: valueToKeep.id, index: 0, slug: 'm', name: 'M' }], // Only keep M
        },
      ]);

      expect(syncResult.userErrors).toHaveLength(0);
      expect(syncResult.options[0].values).toHaveLength(1);
      expect(syncResult.options[0].values[0].name).toBe('M');
    });

    test('should remove swatch by setting null', async ({ api }) => {
      const product = await createProduct(api, 'Product Remove Swatch');

      // Create option with swatch
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'color',
          name: 'Color',
          displayType: 'SWATCH',
          values: [
            {
              index: 0,
              slug: 'red',
              name: 'Red',
              swatch: { swatchType: 'COLOR', colorOne: '#FF0000' },
            },
          ],
        },
      ]);

      const option = createResult.options[0];
      const value = option.values[0];
      expect(value.swatch).toBeTruthy();

      // Remove swatch by setting null
      const updateResult = await syncOptions(api, product.id, [
        {
          id: option.id,
          index: 0,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN', // Changed to dropdown since no swatch
          values: [
            {
              id: value.id,
              index: 0,
              slug: 'red',
              name: 'Red',
              swatch: null, // Remove swatch
            },
          ],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options[0].values[0].swatch).toBeNull();
    });
  });

  test.describe('Error Handling', () => {
    test('should return error for non-existent product', async ({ api }) => {
      const result = await syncOptions(
        api,
        'gid://shopana/Product/00000000-0000-0000-0000-000000000000',
        [],
        false,
      );

      expect(result.product).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(['NOT_FOUND', 'VALIDATION_ERROR']).toContain(result.userErrors[0].code);
    });

    test('should return error for duplicate option slugs', async ({ api }) => {
      const product = await createProduct(api, 'Product Duplicate Slugs');

      const result = await syncOptions(
        api,
        product.id,
        [
          {
            index: 0,
            slug: 'size',
            name: 'Size',
            displayType: 'BUTTONS',
            values: [{ index: 0, slug: 's', name: 'S' }],
          },
          {
            index: 1,
            slug: 'size', // Duplicate slug
            name: 'Another Size',
            displayType: 'DROPDOWN',
            values: [{ index: 0, slug: 'm', name: 'M' }],
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('DUPLICATE_SLUG');
    });

    test('should return error for duplicate option indexes', async ({ api }) => {
      const product = await createProduct(api, 'Product Duplicate Indexes');

      const result = await syncOptions(
        api,
        product.id,
        [
          {
            index: 0,
            slug: 'size',
            name: 'Size',
            displayType: 'BUTTONS',
            values: [{ index: 0, slug: 's', name: 'S' }],
          },
          {
            index: 0, // Duplicate index
            slug: 'color',
            name: 'Color',
            displayType: 'DROPDOWN',
            values: [{ index: 0, slug: 'red', name: 'Red' }],
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('DUPLICATE_INDEX');
    });

    test('should return error for duplicate value slugs within option', async ({ api }) => {
      const product = await createProduct(api, 'Product Duplicate Value Slugs');

      const result = await syncOptions(
        api,
        product.id,
        [
          {
            index: 0,
            slug: 'size',
            name: 'Size',
            displayType: 'BUTTONS',
            values: [
              { index: 0, slug: 'small', name: 'Small' },
              { index: 1, slug: 'small', name: 'Another Small' }, // Duplicate slug
            ],
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('DUPLICATE_SLUG');
    });

    test('should return error for option without values', async ({ api }) => {
      const product = await createProduct(api, 'Product No Values');

      const result = await syncOptions(
        api,
        product.id,
        [
          {
            index: 0,
            slug: 'size',
            name: 'Size',
            displayType: 'BUTTONS',
            values: [], // No values
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('VALIDATION_ERROR');
    });

    test('should return error for referencing non-existent option ID', async ({ api }) => {
      const product = await createProduct(api, 'Product Invalid Option ID');

      const result = await syncOptions(
        api,
        product.id,
        [
          {
            id: '00000000-0000-0000-0000-000000000000', // Non-existent ID
            index: 0,
            slug: 'size',
            name: 'Size',
            displayType: 'BUTTONS',
            values: [{ index: 0, slug: 's', name: 'S' }],
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });

    test('should return error when new option references existing value ID', async ({ api }) => {
      const product = await createProduct(api, 'Product Invalid Value Reference');

      // Create initial option
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
      ]);

      const existingValueId = createResult.options[0].values[0].id;

      // Try to create new option with existing value ID
      const result = await syncOptions(
        api,
        product.id,
        [
          {
            // No id - new option
            index: 0,
            slug: 'color',
            name: 'Color',
            displayType: 'DROPDOWN',
            values: [
              { id: existingValueId, index: 0, slug: 'red', name: 'Red' }, // Invalid reference
            ],
          },
        ],
        false,
      );

      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('INVALID_VALUE_REFERENCE');
    });
  });

  test.describe('Complex Scenarios', () => {
    test('should handle complete options structure replacement', async ({ api }) => {
      const product = await createProduct(api, 'Product Structure Replace');

      // Create initial structure
      await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'old-size',
          name: 'Old Size',
          displayType: 'BUTTONS',
          values: [
            { index: 0, slug: 'old-s', name: 'Old S' },
            { index: 1, slug: 'old-m', name: 'Old M' },
          ],
        },
        {
          index: 1,
          slug: 'old-color',
          name: 'Old Color',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'old-red', name: 'Old Red' }],
        },
      ]);

      // Replace with completely new structure
      const result = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'material',
          name: 'Material',
          displayType: 'DROPDOWN',
          values: [
            { index: 0, slug: 'cotton', name: 'Cotton' },
            { index: 1, slug: 'polyester', name: 'Polyester' },
          ],
        },
        {
          index: 1,
          slug: 'style',
          name: 'Style',
          displayType: 'SWATCH',
          values: [
            {
              index: 0,
              slug: 'classic',
              name: 'Classic',
              swatch: { swatchType: 'COLOR', colorOne: '#000000' },
            },
          ],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.options).toHaveLength(2);

      // Old options should be gone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldSize = result.options.find((o: any) => o.slug === 'old-size');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldColor = result.options.find((o: any) => o.slug === 'old-color');
      expect(oldSize).toBeUndefined();
      expect(oldColor).toBeUndefined();

      // New options should exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const material = result.options.find((o: any) => o.slug === 'material');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const style = result.options.find((o: any) => o.slug === 'style');
      expect(material).toBeTruthy();
      expect(style).toBeTruthy();
      expect(style.values[0].swatch).toBeTruthy();
    });

    test('should handle complex reorder with modifications', async ({ api }) => {
      const product = await createProduct(api, 'Product Complex Reorder');

      // Initial structure:
      // [0] Size (S, M, L)
      // [1] Color (Red, Blue)
      // [2] Material (Cotton)
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [
            { index: 0, slug: 's', name: 'S' },
            { index: 1, slug: 'm', name: 'M' },
            { index: 2, slug: 'l', name: 'L' },
          ],
        },
        {
          index: 1,
          slug: 'color',
          name: 'Color',
          displayType: 'DROPDOWN',
          values: [
            { index: 0, slug: 'red', name: 'Red' },
            { index: 1, slug: 'blue', name: 'Blue' },
          ],
        },
        {
          index: 2,
          slug: 'material',
          name: 'Material',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'cotton', name: 'Cotton' }],
        },
      ]);

      expect(createResult.userErrors).toHaveLength(0);
      expect(createResult.options).toHaveLength(3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const size = createResult.options.find((o: any) => o.slug === 'size');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color = createResult.options.find((o: any) => o.slug === 'color');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const material = createResult.options.find((o: any) => o.slug === 'material');

      expect(size).toBeTruthy();
      expect(color).toBeTruthy();
      expect(material).toBeTruthy();

      // Complex transformation:
      // 1. Reorder: Color [0], Size [1] (delete Material)
      // 2. Rename Color to "Colour"
      // 3. Add "Green" to Color, remove "Red"
      // 4. Add "XL" to Size, remove "S"
      // 5. Change Size display type to DROPDOWN

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeM = size.values.find((v: any) => v.slug === 'm');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeL = size.values.find((v: any) => v.slug === 'l');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colorBlue = color.values.find((v: any) => v.slug === 'blue');

      const updateResult = await syncOptions(api, product.id, [
        {
          id: color.id,
          index: 0, // Color is now first
          slug: 'color',
          name: 'Colour', // Renamed
          displayType: 'SWATCH', // Changed type
          values: [
            {
              id: colorBlue.id,
              index: 0,
              slug: 'blue',
              name: 'Blue',
              swatch: { swatchType: 'COLOR', colorOne: '#0000FF' },
            },
            {
              index: 1,
              slug: 'green',
              name: 'Green',
              swatch: { swatchType: 'COLOR', colorOne: '#00FF00' },
            }, // New
          ],
        },
        {
          id: size.id,
          index: 1, // Size is now second
          slug: 'size',
          name: 'Size',
          displayType: 'DROPDOWN', // Changed type
          values: [
            { id: sizeM.id, index: 0, slug: 'm', name: 'M' },
            { id: sizeL.id, index: 1, slug: 'l', name: 'L' },
            { index: 2, slug: 'xl', name: 'XL' }, // New
          ],
        },
        // Material is deleted (not included)
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options).toHaveLength(2);

      // Verify Color is now [0] and renamed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedColor = updateResult.options.find((o: any) => o.slug === 'color');
      expect(updatedColor.id).toBe(color.id);
      expect(updatedColor.name).toBe('Colour');
      expect(updatedColor.displayType).toBe('SWATCH');
      expect(updatedColor.values).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(updatedColor.values.map((v: any) => v.slug)).toEqual(['blue', 'green']);

      // Verify Size is now [1] with updated values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedSize = updateResult.options.find((o: any) => o.slug === 'size');
      expect(updatedSize.id).toBe(size.id);
      expect(updatedSize.displayType).toBe('DROPDOWN');
      expect(updatedSize.values).toHaveLength(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(updatedSize.values.map((v: any) => v.slug)).toEqual(['m', 'l', 'xl']);

      // Verify Material is deleted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deletedMaterial = updateResult.options.find((o: any) => o.slug === 'material');
      expect(deletedMaterial).toBeUndefined();
    });

    test('should preserve option IDs when updating', async ({ api }) => {
      const product = await createProduct(api, 'Product Preserve IDs');

      // Create options
      const createResult = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'size',
          name: 'Size',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 's', name: 'S' }],
        },
      ]);

      const originalOption = createResult.options[0];
      const originalOptionId = originalOption.id;
      const originalValueId = originalOption.values[0].id;

      // Update using the same IDs
      const updateResult = await syncOptions(api, product.id, [
        {
          id: originalOptionId,
          index: 0,
          slug: 'size',
          name: 'Updated Size',
          displayType: 'DROPDOWN',
          values: [{ id: originalValueId, index: 0, slug: 's', name: 'Updated S' }],
        },
      ]);

      expect(updateResult.userErrors).toHaveLength(0);
      expect(updateResult.options[0].id).toBe(originalOptionId);
      expect(updateResult.options[0].values[0].id).toBe(originalValueId);
      expect(updateResult.options[0].name).toBe('Updated Size');
      expect(updateResult.options[0].values[0].name).toBe('Updated S');
    });

    test('should handle all display types', async ({ api }) => {
      const product = await createProduct(api, 'Product Display Types');

      const result = await syncOptions(api, product.id, [
        {
          index: 0,
          slug: 'buttons-option',
          name: 'Buttons Option',
          displayType: 'BUTTONS',
          values: [{ index: 0, slug: 'btn-val', name: 'Button Value' }],
        },
        {
          index: 1,
          slug: 'dropdown-option',
          name: 'Dropdown Option',
          displayType: 'DROPDOWN',
          values: [{ index: 0, slug: 'dd-val', name: 'Dropdown Value' }],
        },
        {
          index: 2,
          slug: 'swatch-option',
          name: 'Swatch Option',
          displayType: 'SWATCH',
          values: [
            {
              index: 0,
              slug: 'sw-val',
              name: 'Swatch Value',
              swatch: { swatchType: 'COLOR', colorOne: '#FF0000' },
            },
          ],
        },
      ]);

      expect(result.userErrors).toHaveLength(0);
      expect(result.options).toHaveLength(3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buttons = result.options.find((o: any) => o.slug === 'buttons-option');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropdown = result.options.find((o: any) => o.slug === 'dropdown-option');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const swatch = result.options.find((o: any) => o.slug === 'swatch-option');

      expect(buttons.displayType).toBe('BUTTONS');
      expect(dropdown.displayType).toBe('DROPDOWN');
      expect(swatch.displayType).toBe('SWATCH');
    });
  });
});
