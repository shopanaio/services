import { expect } from '@playwright/test';
import type { ApiProduct } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import type { CategoryData } from '@fixtures/admin/category';
import { seedListingCategoryProducts } from '@utils/listingSeed';

export interface ListingCatalogFixture {
  category: CategoryData;
  products: ApiProduct[];
  expectedOrder: {
    manual: ApiProduct[];
    newest: ApiProduct[];
    created: ApiProduct[];
    name: ApiProduct[];
    priceAsc: ApiProduct[];
    priceDesc: ApiProduct[];
  };
}

const listingProductOptions = [
  { name: 'Color', slug: 'color', values: ['Black', 'White'] },
  { name: 'Material', slug: 'material', values: ['Cotton', 'Linen'] },
  { name: 'Size', slug: 'size', values: ['Small', 'Large'] },
  { name: 'Style', slug: 'style', values: ['Classic', 'Modern'] },
];

export async function seedCategoryListingProducts(
  api: ApiFixtures['api'],
  count = 20,
): Promise<ListingCatalogFixture> {
  const now = Date.now();
  const category = await api.admin.category.create({
    handle: `listing-category-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Listing Category',
  });

  const products: ApiProduct[] = [];
  for (let productIndex = 0; productIndex < count; productIndex += 1) {
    const titleRank = count - productIndex;
    const product = await api.admin.product.createWithOptions({
      title: `Sortable Listing Product ${String(titleRank).padStart(2, '0')}`,
      handle: `listing-product-${productIndex + 1}-${crypto.randomUUID().slice(0, 8)}`,
      status: 'PUBLISHED',
      price: (count - productIndex) * 100,
      options: listingProductOptions,
    });

    const { data: addProductData } = await api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        categoryId: category.id,
        productId: product.id,
      },
    });

    expect(addProductData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
    products.push(product);
  }

  await seedListingCategoryProducts({
    projectId: api.session.project.id,
    category,
    products: products.map((product, productIndex) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      publishedAt: new Date(now - productIndex * 1000).toISOString(),
      createdAt: new Date(now - (count - productIndex) * 1000).toISOString(),
      revision: product.revision,
      priceMinor: (count - productIndex) * 100,
      manualSortKey: String(productIndex).padStart(4, '0'),
    })),
  });

  const reversedProducts = [...products].reverse();

  return {
    category,
    products,
    expectedOrder: {
      manual: products,
      newest: products,
      created: reversedProducts,
      name: reversedProducts,
      priceAsc: reversedProducts,
      priceDesc: products,
    },
  };
}
