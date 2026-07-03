import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { seedListingCategoryProducts } from '@utils/listingSeed';
import type { ApiProduct } from '@codegen/admin-gql';

test.describe('Listing API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });
  });

  test('returns products for the first category listing page without filters', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: `listing-category-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Listing Category',
    });
    const product = await api.admin.product.createWithOptions({
      title: 'Listing Product',
      handle: `listing-product-${crypto.randomUUID().slice(0, 8)}`,
      status: 'PUBLISHED',
      options: [{ name: 'Default', slug: 'default', values: ['Default'] }],
    });

    const { data: addProductData } = await api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        categoryId: category.id,
        productId: product.id,
      },
    });

    expect(addProductData.catalogMutation.productUpdate.userErrors).toHaveLength(0);

    await seedListingCategoryProducts({
      projectId: api.session.project.id,
      category,
      products: [
        {
          id: product.id,
          handle: product.handle,
          title: product.title,
          publishedAt: product.publishedAt,
          updatedAt: product.updatedAt,
          revision: product.revision,
        },
      ],
    });

    const { data } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 2,
        locale: 'en',
        currency: 'USD',
        scope: {
          kind: 'CATEGORY',
          categoryId: category.id,
        },
      },
    });

    const listing = data.listingQuery.listing;
    const node = listing.edges[0].node as ApiProduct;

    expect(listing.totalCount).toBe(1);
    expect(listing.edges).toHaveLength(1);
    expect(listing.edges[0].cursor).toBeTruthy();
    expect(node.__typename).toBe('Product');
    expect(node.id).toBe(product.id);
    expect(node.title).toBe(product.title);
    expect(node.handle).toBe(product.handle);
    expect(node.isPublished).toBe(true);
    expect(listing.pageInfo.hasNextPage).toBe(false);
    expect(listing.pageInfo.hasPreviousPage).toBe(false);
    expect(listing.pageInfo.startCursor).toBe(listing.edges[0].cursor);
    expect(listing.pageInfo.endCursor).toBe(listing.edges[0].cursor);
  });
});
