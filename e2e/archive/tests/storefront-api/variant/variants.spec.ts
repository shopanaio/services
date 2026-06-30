import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'crypto';
import type { ApiFixtures } from '@fixtures/api/api';

const prepareProduct = async (api: ApiFixtures['api']) => {
  await api.session.setupUserAndProject();

  const options = [
    {
      title: 'Size',
      values: ['XS', 'S', 'M', 'L'],
    },
    {
      title: 'Color',
      values: ['Black', 'White', 'Red'],
    },
    {
      title: 'Material',
      values: ['Cotton', 'Polyester'],
    },
  ];

  const productHandle = `test-product-options-${randomUUID()}`;

  return {
    product: await api.admin.product.createWithOptions({
      title: 'Product With Options',
      slug: productHandle,
      status: 'PUBLISHED',
      options,
    }),
    options,
  };
};

test.describe('product variants', () => {
  test('should return product variants in order defined by sort index', async ({ api }) => {
    const { product: adminProduct, options } = await prepareProduct(api);
    await api.session.setupApiKey();

    const variantSlug = adminProduct.variants[0].slug;

    const { data } = await api.client.query('client/ProductVariants', {
      variables: { handle: variantSlug },
    });

    expect(data.product).not.toBeNull();

    const variants = data.product?.variants ?? [];
    const totalVariants = options.reduce<number>((acc, g) => acc * g.values.length, 1);
    expect(variants.length).toBe(totalVariants);
    expect(adminProduct.variants.map((it) => it.slug)).toEqual(variants.map((it) => it.handle));
  });

  test('each variant should expose correct options structure and selectedOptions', async ({
    api,
  }) => {
    const { product: adminProduct, options } = await prepareProduct(api);
    await api.session.setupApiKey();

    // Use the slug of the first generated variant to fetch the product with all variants via client API.
    const firstVariantSlug = adminProduct.variants[0].slug;
    const { data } = await api.client.query('client/ProductVariants', {
      variables: { handle: firstVariantSlug },
    });

    const product = data.product;
    if (!product) {
      throw new Error('Product not found');
    }

    expect(product).not.toBeNull();
    const variants = product.variants;
    const totalVariants = options.reduce<number>((acc, g) => acc * g.values.length, 1);
    expect(variants.length).toBe(totalVariants);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productOptions = (product as any).options as any[];
    expect(productOptions.length).toBe(options.length);

    options.forEach((group, idx) => {
      const apiGroup = productOptions[idx];
      expect(apiGroup.title).toBe(group.title);
      const apiValues = apiGroup.values.map((v: { title: string }) => v.title);
      expect(apiValues.sort()).toEqual([...group.values].sort());
    });

    const allValueSet = new Set(
      options.flatMap((g) => g.values.map((v) => `${g.title.toLowerCase()}.${v.toLowerCase()}`)),
    );

    for (const variant of variants) {
      const parts = variant.title.split(' ');
      expect(parts.length).toBe(options.length);

      const selected = variant.selectedOptions;
      expect(Array.isArray(selected)).toBe(true);
      expect(selected.length).toBe(options.length);

      selected.forEach((handle, idx) => {
        expect(allValueSet.has(handle)).toBe(true);

        const [groupHandle, valueHandle] = handle.split('.');
        expect(groupHandle).toBe(options[idx].title.toLowerCase());
        expect(valueHandle).toBe(parts[idx].toLowerCase());
      });
    }

  });
});
