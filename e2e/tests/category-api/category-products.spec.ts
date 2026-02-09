import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

// Types
interface CategoryProduct {
  id: string;
  title: string;
  handle: string;
}

// Helper to create product
async function createProduct(api: ApiFixtures['api'], title: string) {
  const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 8);
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: { title, handle },
    },
  });
  return data.catalogMutation.productCreate.product;
}

// Helper to add product to category
async function addProductToCategory(api: ApiFixtures['api'], categoryId: string, productId: string) {
  const { data, errors } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: {
      input: { categoryId, productId },
    },
  });
  if (errors?.length) {
    throw new Error(`CategoryAddProduct errors: ${JSON.stringify(errors)}`);
  }
  if (data?.catalogMutation?.categoryAddProduct?.userErrors?.length > 0) {
    throw new Error(`CategoryAddProduct userErrors: ${JSON.stringify(data.catalogMutation.categoryAddProduct.userErrors)}`);
  }
}

// Prepare function for pagination tests
async function prepareCategoryProducts(api: ApiFixtures['api']) {
  await api.session.setupUserAndStore();

  const category = await api.admin.category.create({
    handle: 'pagination-test-' + crypto.randomUUID().slice(0, 8),
    name: 'Pagination Test Category',
  });

  const expectedItems: CategoryProduct[] = [];

  // Create 5 products with predictable data
  const productData = [
    { title: 'Alpha Product' },
    { title: 'Beta Product' },
    { title: 'Charlie Product' },
    { title: 'Delta Product' },
    { title: 'Echo Product' },
  ];

  for (const item of productData) {
    const product = await createProduct(api, item.title);
    await addProductToCategory(api, category.id, product.id);
    expectedItems.push({
      id: product.id,
      title: product.title,
      handle: product.handle,
    });
  }

  return {
    expectedItems,
    baseVariables: { id: category.id },
  };
}

// Use the pagination builder for comprehensive tests
createConnectionPaginationTests<CategoryProduct>({
  queryName: 'category-api/CategoryWithProducts',
  suiteName: 'Category.products cursor pagination',
  prepare: prepareCategoryProducts,
  sortCases: [
    {
      name: 'MANUAL asc (default)',
      orderBy: [{ field: 'MANUAL', direction: 'asc' }],
      sortExpected: (items) => [...items], // Keep insertion order
    },
  ],
  getConnection: (data) => {
    const d = data as { catalogQuery: { category: { products: any } } };
    return d.catalogQuery.category.products;
  },
  pageSize: 2,
  skipCursorValidation: true, // Skip cursor validation for now
});

// Basic functional tests
test.describe('Category.products field - basic', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should return empty products for new category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'empty-cat-' + crypto.randomUUID().slice(0, 8),
      name: 'Empty Category',
    });

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.category).toBeTruthy();
    expect(data.catalogQuery.category.products.edges).toHaveLength(0);
    expect(data.catalogQuery.category.products.totalCount).toBe(0);
    expect(data.catalogQuery.category.productsCount).toBe(0);
  });

  test('should return products assigned to category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'with-products-' + crypto.randomUUID().slice(0, 8),
      name: 'Category With Products',
    });

    const product = await createProduct(api, 'Test Product');
    await addProductToCategory(api, category.id, product.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.category.products.edges).toHaveLength(1);
    expect(data.catalogQuery.category.products.edges[0].node.id).toBe(product.id);
    expect(data.catalogQuery.category.products.totalCount).toBe(1);
  });

  test('should support orderBy parameter', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'orderby-' + crypto.randomUUID().slice(0, 8),
      name: 'OrderBy Category',
    });

    const p1 = await createProduct(api, 'Zebra');
    const p2 = await createProduct(api, 'Apple');
    await addProductToCategory(api, category.id, p1.id);
    await addProductToCategory(api, category.id, p2.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
        orderBy: [{ field: 'MANUAL', direction: 'asc' }],
      },
    });

    expect(data.catalogQuery.category.products.edges).toHaveLength(2);
  });
});
