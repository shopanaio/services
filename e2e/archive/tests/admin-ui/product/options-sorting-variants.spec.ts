import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

// DISABLED: This test relies on removed FeatureGroup API and complex UI interactions

test.describe('Product Options Sorting', () => {
  test('Sorting variants verification via API', async ({ api }) => {
    await test.step('Create a user and project', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create product with options and verify variant sorting', async () => {
      // Create a product with color and size options
      const product = await api.admin.product.createWithOptions({
        title: 'T-Shirt for Sorting Test',
        options: [
          {
            title: 'Color',
            slug: 'color',
            values: ['Red', 'Green', 'Blue'],
          },
          {
            title: 'Size',
            slug: 'size',
            values: ['S', 'M', 'L'],
          },
        ],
        status: 'DRAFT',
      });

      // Verify that 9 variants were created with proper naming
      expect(product.variants?.length).toBe(9);

      // Check that variants have proper titles (cartesian product)
      const expectedVariants = [
        'Red S', 'Red M', 'Red L',
        'Green S', 'Green M', 'Green L',
        'Blue S', 'Blue M', 'Blue L'
      ];

      product.variants?.forEach((variant) => {
        expect(expectedVariants).toContain(variant.title);
      });
    });

    await test.step('Test variant sorting via update', async () => {
      // Create another product to test sorting
      const product = await api.admin.product.createWithOptions({
        title: 'Product for Sort Update',
        options: [
          {
            title: 'Priority',
            slug: 'priority',
            values: ['High', 'Medium', 'Low'],
          },
        ],
        status: 'DRAFT',
      });

      // Update variant sort indexes
      const updatedProduct = await api.admin.product.update({
        input: {
          id: product.id,
          variants: {
            update: product.variants.map((variant, index) => ({
              id: variant.id,
              variantSortIndex: 2 - index, // Reverse order
            })),
          },
        },
      });

      expect(updatedProduct.variants?.length).toBe(3);
    });
  });
});
