import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'crypto';

test.describe('product', () => {
  const productContainerSlug = `test-product-${randomUUID()}`;
  const productTitle = 'Test Product';
  const productPrice = 35.99 * 100;

  test('get product and check scalar fields', async ({ api }) => {
    await api.session.setupUserAndProject();

    const adminProduct = await api.admin.product.createWithOptions({
      title: productTitle,
      slug: productContainerSlug,
      status: 'PUBLISHED',
      price: productPrice,
      requiresShipping: true,
      options: [
        {
          title: 'Size',
          values: ['S', 'M'],
        },
        {
          title: 'Color',
          values: ['Black', 'White'],
        },
      ],
    });

    await api.session.setupApiKey();

    for (const variant of adminProduct.variants) {
      const clientVariant = await api.client.variant.get(variant.slug);

      expect(clientVariant?.product?.handle).toBe(productContainerSlug);
      expect(clientVariant?.product?.title).toBe(adminProduct.title);
      expect(clientVariant?.product?.description).not.toBeUndefined();
      expect(clientVariant?.product?.excerpt).not.toBeUndefined();
    }
  });
});
