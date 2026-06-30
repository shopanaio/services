import { test } from '@fixtures/base.extend';

test.describe('ProductFindOne', () => {
  test('single product', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      description: null,
      excerpt: '',
      groups: [],
      requiresShipping: false,
      slug: null,
      status: 'DRAFT',
      tags: [],
      title: 'Product',
      variants: {
        create: [
          {
            categories: [],
            costPrice: 0,
            coverId: null,
            features: [],
            gallery: [],
            inListing: true,
            oldPrice: 0,
            price: 0,
            sku: '',
            slug: null,
            stockStatus: 'OUT_OF_STOCK',
            title: 'Product',
            variantSortIndex: 0,
          },
        ],
      },
    };

    const createdProduct = await api.admin.product.create({ input });
    await api.admin.product.assertProduct(createdProduct);
  });
});
