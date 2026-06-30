
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiProduct } from '@codegen/admin-gql';

test.describe('Products API', () => {
  test('Manage Features', async ({ api }) => {
    let productWithColorOptions: ApiProduct;

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create product with color options', async () => {
      productWithColorOptions = await api.admin.product.createWithOptions({
        title: 'Sunglasses',
        options: [
          {
            title: 'Color',
            slug: 'color',
            values: ['Red', 'Green'],
          },
        ],
        status: 'DRAFT',
        price: 3500,
      });

      expect(productWithColorOptions.variants?.length).toBe(2);
      expect(productWithColorOptions.variants[0].title).toBe('Red');
      expect(productWithColorOptions.variants[1].title).toBe('Green');
    });

    await test.step('Remove variant (simulating feature removal)', async () => {
      const updatedProduct = await api.admin.product.update({
        input: {
          id: productWithColorOptions.id,
          variants: {
            delete: [productWithColorOptions.variants[0].id],
          },
        },
      });
      expect(updatedProduct.variants.length).toBe(1);
      expect(updatedProduct.variants[0].title).toBe('Green');
    });
  });
});
