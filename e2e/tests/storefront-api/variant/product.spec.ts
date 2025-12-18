import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CurrencyCode } from '@codegen/client-gql';
import { EntityStatus } from '@codegen/admin-gql';
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
      status: EntityStatus.Published,
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
      const product = await api.client.product.get(variant.slug);

      expect(product?.handle).toBe(variant.slug);
      expect(product?.title).toBe(variant.title);
      expect(product?.description).not.toBeUndefined();
      expect(product?.excerpt).not.toBeUndefined();
      expect(product?.price.amount).toBe(productPrice / 100);
      expect(product?.price.currencyCode).toBe(CurrencyCode.Usd);
      expect(product?.rating.rating).toBeGreaterThanOrEqual(0);
      expect(product?.rating.count).toBeGreaterThanOrEqual(0);
      expect(product?.sku).not.toBeUndefined();
      expect(product?.stockStatus).not.toBeNull();
      expect(product?.cover).toBeNull(); // We didn't upload a cover
    }
  });
});
