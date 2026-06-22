import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { Connection } from '@utils/connectionPaginationBuilder';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

// Types
interface CategoryProduct {
  id: string;
  title: string;
  handle: string;
  priceMinor: number;
  createdAt: string;
}

// Helper to create product with price
async function createProduct(
  api: ApiFixtures['api'],
  title: string,
  priceMinor: number,
): Promise<CategoryProduct> {
  const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 8);
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: { title, handle },
    },
  });

  const product = data.catalogMutation.productCreate.product;
  if (!product) {
    throw new Error('Failed to create product');
  }

  const variantNode = product.variants?.edges[0]?.node;
  const variantId = variantNode?.id;

  // Set price on the default variant
  if (variantId) {
    const { data: pricingData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'USD',
          amountMinor: String(priceMinor),
        },
      },
    });
    const userErrors = pricingData?.catalogMutation?.variantUpdatePricing?.userErrors;
    if (userErrors?.length) {
      throw new Error(`VariantSetPricing failed: ${JSON.stringify(userErrors)}`);
    }
  }

  return {
    id: product.id as string,
    title: product.title as string,
    handle: (product.handle ?? handle) as string,
    priceMinor,
    createdAt: (product.updatedAt ?? new Date().toISOString()) as string,
  };
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

async function deleteProduct(api: ApiFixtures['api'], productId: string) {
  const { data, errors } = await api.admin.mutation('inventory-api/ProductDelete', {
    variables: {
      input: { id: productId },
    },
  });
  if (errors?.length) {
    throw new Error(`ProductDelete errors: ${JSON.stringify(errors)}`);
  }
  const userErrors = data?.catalogMutation?.productDelete?.userErrors;
  if (userErrors?.length) {
    throw new Error(`ProductDelete userErrors: ${JSON.stringify(userErrors)}`);
  }
}

async function getCategoryProductsSnapshot(api: ApiFixtures['api'], categoryId: string) {
  const { data } = await api.admin.query('category-api/CategoryWithProducts', {
    variables: {
      id: categoryId,
      first: 10,
    },
  });

  const category = data.catalogQuery.category;
  if (!category) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  return {
    productsCount: category.productsCount,
    totalCount: category.products.totalCount,
    productIds: category.products.edges.map((edge) => edge.node.id),
  };
}

// Prepare function for pagination tests
async function prepareCategoryProducts(api: ApiFixtures['api']) {
  await api.session.setupUserAndStore();
  api.session.setCurrency('USD'); // Set currency for price sorting tests

  const category = await api.admin.category.create({
    handle: 'pagination-test-' + crypto.randomUUID().slice(0, 8),
    name: 'Pagination Test Category',
  });

  const expectedItems: CategoryProduct[] = [];

  // Create 5 products with predictable data for testing all sort types:
  // - NAME: Alpha, Beta, Charlie, Delta, Echo (alphabetical)
  // - PRICE: 1000, 3000, 2000, 5000, 4000 (non-alphabetical order)
  // - NEWEST: created in order (Alpha first, Echo last)
  // - MANUAL: insertion order
  const productData = [
    { title: 'Alpha Product', priceMinor: 1000 }, // cheapest
    { title: 'Beta Product', priceMinor: 3000 },
    { title: 'Charlie Product', priceMinor: 2000 },
    { title: 'Delta Product', priceMinor: 5000 }, // most expensive
    { title: 'Echo Product', priceMinor: 4000 },
  ];

  for (const item of productData) {
    const product = await createProduct(api, item.title, item.priceMinor);
    await addProductToCategory(api, category.id, product.id);
    expectedItems.push(product);
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
    // MANUAL sorting (insertion order)
    {
      name: 'MANUAL asc (default)',
      orderBy: [{ field: 'MANUAL', direction: 'asc' }],
      sortExpected: (items) => [...items], // Keep insertion order
    },
    {
      name: 'MANUAL desc',
      orderBy: [{ field: 'MANUAL', direction: 'desc' }],
      sortExpected: (items) => [...items].reverse(), // Reverse insertion order
    },
    // NEWEST sorting (by creation time)
    {
      name: 'NEWEST asc',
      orderBy: [{ field: 'NEWEST', direction: 'asc' }],
      sortExpected: (items) => [...items], // Products created in order, oldest first
    },
    {
      name: 'NEWEST desc',
      orderBy: [{ field: 'NEWEST', direction: 'desc' }],
      sortExpected: (items) => [...items].reverse(), // Products created in order, newest first
    },
    // NAME sorting (alphabetical by title)
    {
      name: 'NAME asc',
      orderBy: [{ field: 'NAME', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.title.localeCompare(b.title)),
    },
    {
      name: 'NAME desc',
      orderBy: [{ field: 'NAME', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.title.localeCompare(a.title)),
    },
    // PRICE sorting (by price amount)
    {
      name: 'PRICE asc',
      orderBy: [{ field: 'PRICE', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.priceMinor - b.priceMinor),
    },
    {
      name: 'PRICE desc',
      orderBy: [{ field: 'PRICE', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.priceMinor - a.priceMinor),
    },
  ],
  getConnection: (data) => {
    const d = data as { catalogQuery: { category: { products: Connection<CategoryProduct> } } };
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

    const cat = data.catalogQuery.category;
    expect(cat).toBeTruthy();
    expect(cat?.products.edges).toHaveLength(0);
    expect(cat?.products.totalCount).toBe(0);
    expect(cat?.productsCount).toBe(0);
  });

  test('should return products assigned to category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'with-products-' + crypto.randomUUID().slice(0, 8),
      name: 'Category With Products',
    });

    const product = await createProduct(api, 'Test Product', 1000);
    await addProductToCategory(api, category.id, product.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
      },
    });

    const cat = data.catalogQuery.category;
    expect(cat?.products.edges).toHaveLength(1);
    expect(cat?.products.edges[0].node.id).toBe(product.id);
    expect(cat?.products.totalCount).toBe(1);
  });

  test('should update productsCount from product category assignment and delete events', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'count-events-' + crypto.randomUUID().slice(0, 8),
      name: 'Count Events Category',
    });

    const firstProduct = await createProduct(api, 'Count Events First Product', 1000);
    const secondProduct = await createProduct(api, 'Count Events Second Product', 1000);

    await addProductToCategory(api, category.id, firstProduct.id);
    await addProductToCategory(api, category.id, secondProduct.id);

    await expect
      .poll(async () => (await getCategoryProductsSnapshot(api, category.id)).productsCount, {
        timeout: 10_000,
      })
      .toBe(2);

    const afterAssignment = await getCategoryProductsSnapshot(api, category.id);
    expect(afterAssignment.totalCount).toBe(2);
    expect(afterAssignment.productIds).toEqual(expect.arrayContaining([firstProduct.id, secondProduct.id]));

    await deleteProduct(api, firstProduct.id);

    await expect
      .poll(async () => (await getCategoryProductsSnapshot(api, category.id)).productsCount, {
        timeout: 10_000,
      })
      .toBe(1);

    const afterDelete = await getCategoryProductsSnapshot(api, category.id);
    expect(afterDelete.totalCount).toBe(1);
    expect(afterDelete.productIds).toEqual([secondProduct.id]);
  });

  test('should sort by NAME ascending', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'orderby-name-' + crypto.randomUUID().slice(0, 8),
      name: 'OrderBy Name Category',
    });

    const p1 = await createProduct(api, 'Zebra', 1000);
    const p2 = await createProduct(api, 'Apple', 2000);
    const p3 = await createProduct(api, 'Mango', 1500);
    await addProductToCategory(api, category.id, p1.id);
    await addProductToCategory(api, category.id, p2.id);
    await addProductToCategory(api, category.id, p3.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
        orderBy: [{ field: 'NAME', direction: 'asc' }],
      },
    });

    const titles = data.catalogQuery.category?.products.edges.map((e) => e.node.title);
    expect(titles).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  test('should sort by PRICE ascending', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'orderby-price-' + crypto.randomUUID().slice(0, 8),
      name: 'OrderBy Price Category',
    });

    const p1 = await createProduct(api, 'Expensive', 5000);
    const p2 = await createProduct(api, 'Cheap', 1000);
    const p3 = await createProduct(api, 'Medium', 3000);
    await addProductToCategory(api, category.id, p1.id);
    await addProductToCategory(api, category.id, p2.id);
    await addProductToCategory(api, category.id, p3.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
        orderBy: [{ field: 'PRICE', direction: 'asc' }],
      },
    });

    const titles = data.catalogQuery.category?.products.edges.map((e) => e.node.title);
    expect(titles).toEqual(['Cheap', 'Medium', 'Expensive']);
  });

  test('should sort by NEWEST descending', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'orderby-newest-' + crypto.randomUUID().slice(0, 8),
      name: 'OrderBy Newest Category',
    });

    const p1 = await createProduct(api, 'First Created', 1000);
    const p2 = await createProduct(api, 'Second Created', 1000);
    const p3 = await createProduct(api, 'Third Created', 1000);
    await addProductToCategory(api, category.id, p1.id);
    await addProductToCategory(api, category.id, p2.id);
    await addProductToCategory(api, category.id, p3.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
        orderBy: [{ field: 'NEWEST', direction: 'desc' }],
      },
    });

    const cat = data.catalogQuery.category;
    const titles = cat?.products.edges.map((e) => e.node.title);
    // Newest first = reverse creation order
    expect(titles).toEqual(['Third Created', 'Second Created', 'First Created']);
  });

  test('should sort by MANUAL (insertion order)', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'orderby-manual-' + crypto.randomUUID().slice(0, 8),
      name: 'OrderBy Manual Category',
    });

    const p1 = await createProduct(api, 'First Added', 1000);
    const p2 = await createProduct(api, 'Second Added', 1000);
    const p3 = await createProduct(api, 'Third Added', 1000);
    await addProductToCategory(api, category.id, p1.id);
    await addProductToCategory(api, category.id, p2.id);
    await addProductToCategory(api, category.id, p3.id);

    const { data } = await api.admin.query('category-api/CategoryWithProducts', {
      variables: {
        id: category.id,
        first: 10,
        orderBy: [{ field: 'MANUAL', direction: 'asc' }],
      },
    });

    const cat = data.catalogQuery.category;
    const titles = cat?.products.edges.map((e) => e.node.title);
    // Manual = insertion order
    expect(titles).toEqual(['First Added', 'Second Added', 'Third Added']);
  });
});
