import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus } from '@codegen/admin-gql';


// DISABLED: This test relies on removed FeatureGroup API and complex UI interactions

test.describe('Product Options Create', () => {
  test('Create product with options via API', async ({ api }) => {
    await test.step('Create a user and project', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create product with options via API', async () => {
      // Create a product with color and size options using the fixture method
      const product = await api.admin.product.createWithOptions({
        title: 'T-Shirt',
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
        status: EntityStatus.Draft,
      });

      
      expect(product.variants?.length).toBe(9);
      expect(product.title).toBe('T-Shirt');
    });
  });
});
