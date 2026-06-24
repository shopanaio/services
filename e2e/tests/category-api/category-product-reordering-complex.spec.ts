import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

/**
 * Complex reordering test scenarios for category products.
 *
 * Tests cover edge cases with 10-15 products:
 * - Move first to end
 * - Move last to beginning
 * - Move middle to different positions
 * - Multiple sequential moves
 * - Swap adjacent products
 */

interface Product {
  id: string;
  title: string;
}

/**
 * Helper to create a product and return its ID and title
 */
async function createProduct(api: ApiFixtures['api'], title: string): Promise<Product> {
  const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 8);
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: { title, handle },
    },
  });

  const product = data.catalogMutation.productCreate.product;
  if (!product) {
    throw new Error(`Failed to create product: ${title}`);
  }
  return { id: product.id, title: product.title };
}

/**
 * Helper to add product to category
 */
async function addProductToCategory(api: ApiFixtures['api'], categoryId: string, productId: string) {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: {
      categoryId,
      productId,
    },
  });
  if (data?.catalogMutation?.productUpdate?.userErrors?.length > 0) {
    throw new Error(
      `CategoryAddProduct failed: ${JSON.stringify(data.catalogMutation.productUpdate.userErrors)}`
    );
  }
}

/**
 * Helper to move product in category
 */
async function moveProduct(
  api: ApiFixtures['api'],
  categoryId: string,
  productId: string,
  options: { afterProductId?: string; beforeProductId?: string } = {}
) {
  const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
    variables: {
      categoryId,
      productId,
      afterProductId: options.afterProductId,
      beforeProductId: options.beforeProductId,
    },
  });

  const result = data.catalogMutation.productUpdate;
  if (result.userErrors?.length > 0) {
    throw new Error(`CategoryMoveProduct failed: ${JSON.stringify(result.userErrors)}`);
  }
  return result;
}

/**
 * Helper to get products in MANUAL order
 */
async function getProductsInOrder(api: ApiFixtures['api'], categoryId: string): Promise<string[]> {
  const { data } = await api.admin.query('category-api/CategoryWithProducts', {
    variables: {
      id: categoryId,
      first: 50,
      orderBy: [{ field: 'MANUAL', direction: 'asc' }],
    },
  });

  return data.catalogQuery.category.products.edges.map((e: any) => e.node.title);
}

/**
 * Setup: Create category with N products named P1, P2, ..., PN
 */
async function setupCategoryWithProducts(
  api: ApiFixtures['api'],
  count: number,
  prefix = 'P'
): Promise<{ categoryId: string; products: Product[] }> {
  const category = await api.admin.category.create({
    handle: 'reorder-test-' + crypto.randomUUID().slice(0, 8),
    name: 'Reorder Test Category',
  });

  const products: Product[] = [];
  for (let i = 1; i <= count; i++) {
    const product = await createProduct(api, `${prefix}${i}`);
    await addProductToCategory(api, category.id, product.id);
    products.push(product);
  }

  return { categoryId: category.id, products };
}

test.describe('Category Product Reordering - Complex Scenarios', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // TEST 1: Move first product to end (12 products)
  // ===============================================
  test('should move first product to end of list', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 12);

    // Initial order: P1, P2, P3, ..., P12
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12']);

    // Move P1 after P12 (to end)
    await moveProduct(api, categoryId, products[0].id, {
      afterProductId: products[11].id, // after P12
    });

    // Expected: P2, P3, P4, ..., P12, P1
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual(['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P1']);
  });

  // ===============================================
  // TEST 2: Move last product to beginning (10 products)
  // ===============================================
  test('should move last product to beginning of list', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial order: P1, P2, ..., P10
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);

    // Move P10 before P1 (to beginning)
    await moveProduct(api, categoryId, products[9].id, {
      beforeProductId: products[0].id, // before P1
    });

    // Expected: P10, P1, P2, ..., P9
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual(['P10', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']);
  });

  // ===============================================
  // TEST 3: Move product from middle backward (15 products)
  // Use beforeProductId for precise positioning
  // ===============================================
  test('should move product from middle to earlier position', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 15);

    // Initial order: P1, P2, ..., P15
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
      'P12',
      'P13',
      'P14',
      'P15',
    ]);

    // Move P12 before P5 (to position between P4 and P5)
    await moveProduct(api, categoryId, products[11].id, {
      beforeProductId: products[4].id, // before P5
    });

    // Expected: P1, P2, P3, P4, P12, P5, P6, P7, P8, P9, P10, P11, P13, P14, P15
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P12',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
      'P13',
      'P14',
      'P15',
    ]);
  });

  // ===============================================
  // TEST 4: Multiple sequential moves (12 products)
  // Verify each move step by step
  // ===============================================
  test('should handle multiple sequential moves correctly', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 12);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12

    // Move 1: P1 to end (after P12)
    await moveProduct(api, categoryId, products[0].id, {
      afterProductId: products[11].id,
    });
    const order1 = await getProductsInOrder(api, categoryId);
    expect(order1).toEqual(['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P1']);

    // Move 2: P12 to beginning (before P2, which is now first)
    await moveProduct(api, categoryId, products[11].id, {
      beforeProductId: products[1].id,
    });
    const order2 = await getProductsInOrder(api, categoryId);
    expect(order2).toEqual(['P12', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P1']);

    // Move 3: P3 to end (after P1, which is now last)
    await moveProduct(api, categoryId, products[2].id, {
      afterProductId: products[0].id, // P1
    });
    const order3 = await getProductsInOrder(api, categoryId);
    expect(order3).toEqual(['P12', 'P2', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P1', 'P3']);

    // Move 4: P7 before P5
    await moveProduct(api, categoryId, products[6].id, {
      beforeProductId: products[4].id, // P5
    });
    const finalOrder = await getProductsInOrder(api, categoryId);
    expect(finalOrder).toEqual(['P12', 'P2', 'P4', 'P7', 'P5', 'P6', 'P8', 'P9', 'P10', 'P11', 'P1', 'P3']);
  });

  // ===============================================
  // TEST 5: Swap adjacent products (10 products)
  // Use beforeProductId for precise swap positioning
  // ===============================================
  test('should swap adjacent products correctly', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10

    // Swap P5 and P6: move P6 before P5
    await moveProduct(api, categoryId, products[5].id, {
      beforeProductId: products[4].id, // P6 before P5
    });
    // After: P1, P2, P3, P4, P6, P5, P7, P8, P9, P10

    const orderAfterSwap = await getProductsInOrder(api, categoryId);
    expect(orderAfterSwap).toEqual(['P1', 'P2', 'P3', 'P4', 'P6', 'P5', 'P7', 'P8', 'P9', 'P10']);

    // Swap back: move P5 before P6
    await moveProduct(api, categoryId, products[4].id, {
      beforeProductId: products[5].id, // P5 before P6
    });
    // After: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10

    const orderAfterSwapBack = await getProductsInOrder(api, categoryId);
    expect(orderAfterSwapBack).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);
  });

  // ===============================================
  // TEST 6: Reverse list by moving each to beginning (10 products)
  // ===============================================
  test('should reverse list order through sequential moves to beginning', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10
    // Strategy: Move each product (P2-P10) to beginning one by one

    // Move P2 before P1
    await moveProduct(api, categoryId, products[1].id, { beforeProductId: products[0].id });
    // P2, P1, P3, P4, P5, P6, P7, P8, P9, P10

    // Move P3 before P2
    await moveProduct(api, categoryId, products[2].id, { beforeProductId: products[1].id });
    // P3, P2, P1, P4, P5, P6, P7, P8, P9, P10

    // Move P4 before P3
    await moveProduct(api, categoryId, products[3].id, { beforeProductId: products[2].id });
    // P4, P3, P2, P1, P5, P6, P7, P8, P9, P10

    // Move P5 before P4
    await moveProduct(api, categoryId, products[4].id, { beforeProductId: products[3].id });
    // P5, P4, P3, P2, P1, P6, P7, P8, P9, P10

    // Move P6 before P5
    await moveProduct(api, categoryId, products[5].id, { beforeProductId: products[4].id });
    // P6, P5, P4, P3, P2, P1, P7, P8, P9, P10

    // Move P7 before P6
    await moveProduct(api, categoryId, products[6].id, { beforeProductId: products[5].id });
    // P7, P6, P5, P4, P3, P2, P1, P8, P9, P10

    // Move P8 before P7
    await moveProduct(api, categoryId, products[7].id, { beforeProductId: products[6].id });
    // P8, P7, P6, P5, P4, P3, P2, P1, P9, P10

    // Move P9 before P8
    await moveProduct(api, categoryId, products[8].id, { beforeProductId: products[7].id });
    // P9, P8, P7, P6, P5, P4, P3, P2, P1, P10

    // Move P10 before P9
    await moveProduct(api, categoryId, products[9].id, { beforeProductId: products[8].id });
    // P10, P9, P8, P7, P6, P5, P4, P3, P2, P1

    const finalOrder = await getProductsInOrder(api, categoryId);
    expect(finalOrder).toEqual(['P10', 'P9', 'P8', 'P7', 'P6', 'P5', 'P4', 'P3', 'P2', 'P1']);
  });

  // ===============================================
  // TEST 7: Move product to position 2 (second place)
  // ===============================================
  test('should move product to second position', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 12);

    // Initial: P1, P2, P3, ..., P12

    // Move P10 to position 2 (after P1)
    await moveProduct(api, categoryId, products[9].id, {
      afterProductId: products[0].id,
    });

    // Expected: P1, P10, P2, P3, P4, P5, P6, P7, P8, P9, P11, P12
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual(['P1', 'P10', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P11', 'P12']);
  });

  // ===============================================
  // TEST 8: Move product to second-to-last position
  // ===============================================
  test('should move product to second-to-last position', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10

    // Move P3 before P10 (second-to-last)
    await moveProduct(api, categoryId, products[2].id, {
      beforeProductId: products[9].id,
    });

    // Expected: P1, P2, P4, P5, P6, P7, P8, P9, P3, P10
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual(['P1', 'P2', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P3', 'P10']);
  });

  // ===============================================
  // TEST 9: Move same product multiple times
  // ===============================================
  test('should handle moving same product multiple times', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10

    // Move P5 to end (after P10)
    await moveProduct(api, categoryId, products[4].id, {
      afterProductId: products[9].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P5',
    ]);

    // Move P5 back to beginning (before P1)
    await moveProduct(api, categoryId, products[4].id, {
      beforeProductId: products[0].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P5',
      'P1',
      'P2',
      'P3',
      'P4',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
    ]);

    // Move P5 to middle (after P4)
    await moveProduct(api, categoryId, products[4].id, {
      afterProductId: products[3].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
    ]);

    // Move P5 after P7
    await moveProduct(api, categoryId, products[4].id, {
      afterProductId: products[6].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P6',
      'P7',
      'P5',
      'P8',
      'P9',
      'P10',
    ]);
  });

  // ===============================================
  // TEST 10: Move with no position change (noop)
  // ===============================================
  test('should handle move to same position gracefully', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10

    // Move P5 after P4 (should stay in same position)
    await moveProduct(api, categoryId, products[4].id, {
      afterProductId: products[3].id,
    });

    // Order should remain unchanged
    const orderAfter = await getProductsInOrder(api, categoryId);
    expect(orderAfter).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);
  });

  // ===============================================
  // TEST 11: Interleave two groups of products
  // Use beforeProductId for precise positioning
  // ===============================================
  test('should interleave products from different positions', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10
    // Goal: Interleave first 5 with last 5: P1, P6, P2, P7, P3, P8, P4, P9, P5, P10

    // Move P6 before P2
    await moveProduct(api, categoryId, products[5].id, { beforeProductId: products[1].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P6',
      'P2',
      'P3',
      'P4',
      'P5',
      'P7',
      'P8',
      'P9',
      'P10',
    ]);

    // Move P7 before P3
    await moveProduct(api, categoryId, products[6].id, { beforeProductId: products[2].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P6',
      'P2',
      'P7',
      'P3',
      'P4',
      'P5',
      'P8',
      'P9',
      'P10',
    ]);

    // Move P8 before P4
    await moveProduct(api, categoryId, products[7].id, { beforeProductId: products[3].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P6',
      'P2',
      'P7',
      'P3',
      'P8',
      'P4',
      'P5',
      'P9',
      'P10',
    ]);

    // Move P9 before P5
    await moveProduct(api, categoryId, products[8].id, { beforeProductId: products[4].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P1',
      'P6',
      'P2',
      'P7',
      'P3',
      'P8',
      'P4',
      'P9',
      'P5',
      'P10',
    ]);
  });

  // ===============================================
  // TEST 12: Move products to create specific pattern (15 products)
  // Use beforeProductId for precise positioning
  // ===============================================
  test('should arrange products in zigzag pattern', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 15);

    // Initial: P1-P15 in order
    // Goal: Create zigzag: P15, P1, P14, P2, P13, P3, P12, P4, P11, P5, P10, P6, P9, P7, P8

    // Step 1: Move P15 to beginning
    await moveProduct(api, categoryId, products[14].id, { beforeProductId: products[0].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
      'P12',
      'P13',
      'P14',
    ]);

    // Step 2: Move P14 before P2
    await moveProduct(api, categoryId, products[13].id, { beforeProductId: products[1].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
      'P12',
      'P13',
    ]);

    // Step 3: Move P13 before P3
    await moveProduct(api, categoryId, products[12].id, { beforeProductId: products[2].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P13',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
      'P12',
    ]);

    // Step 4: Move P12 before P4
    await moveProduct(api, categoryId, products[11].id, { beforeProductId: products[3].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P13',
      'P3',
      'P12',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
      'P11',
    ]);

    // Step 5: Move P11 before P5
    await moveProduct(api, categoryId, products[10].id, { beforeProductId: products[4].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P13',
      'P3',
      'P12',
      'P4',
      'P11',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
    ]);

    // Step 6: Move P10 before P6
    await moveProduct(api, categoryId, products[9].id, { beforeProductId: products[5].id });
    expect(await getProductsInOrder(api, categoryId)).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P13',
      'P3',
      'P12',
      'P4',
      'P11',
      'P5',
      'P10',
      'P6',
      'P7',
      'P8',
      'P9',
    ]);

    // Step 7: Move P9 before P7
    await moveProduct(api, categoryId, products[8].id, { beforeProductId: products[6].id });
    const finalOrder = await getProductsInOrder(api, categoryId);
    expect(finalOrder).toEqual([
      'P15',
      'P1',
      'P14',
      'P2',
      'P13',
      'P3',
      'P12',
      'P4',
      'P11',
      'P5',
      'P10',
      'P6',
      'P9',
      'P7',
      'P8',
    ]);
  });

  // ===============================================
  // TEST 13: Minimal list - 2 products swap
  // ===============================================
  test('should swap two products in minimal list', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 2);

    // Initial: P1, P2
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual(['P1', 'P2']);

    // Swap: Move P2 before P1
    await moveProduct(api, categoryId, products[1].id, {
      beforeProductId: products[0].id,
    });

    const afterSwap = await getProductsInOrder(api, categoryId);
    expect(afterSwap).toEqual(['P2', 'P1']);

    // Swap back: Move P1 before P2
    await moveProduct(api, categoryId, products[0].id, {
      beforeProductId: products[1].id,
    });

    const afterSwapBack = await getProductsInOrder(api, categoryId);
    expect(afterSwapBack).toEqual(['P1', 'P2']);
  });

  // ===============================================
  // TEST 14: Minimal list - 3 products
  // ===============================================
  test('should reorder three products correctly', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 3);

    // Initial: P1, P2, P3
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual(['P1', 'P2', 'P3']);

    // Move P3 to beginning
    await moveProduct(api, categoryId, products[2].id, {
      beforeProductId: products[0].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual(['P3', 'P1', 'P2']);

    // Move P2 to middle (after P3)
    await moveProduct(api, categoryId, products[1].id, {
      afterProductId: products[2].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual(['P3', 'P2', 'P1']);

    // Move P1 to beginning
    await moveProduct(api, categoryId, products[0].id, {
      beforeProductId: products[2].id,
    });
    expect(await getProductsInOrder(api, categoryId)).toEqual(['P1', 'P3', 'P2']);
  });

  // ===============================================
  // TEST 15: Move middle product forward (not to end)
  // ===============================================
  test('should move product from middle to later position', async ({ api }) => {
    const { categoryId, products } = await setupCategoryWithProducts(api, 10);

    // Initial: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10
    const initialOrder = await getProductsInOrder(api, categoryId);
    expect(initialOrder).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']);

    // Move P3 after P7 (forward, but not to end)
    await moveProduct(api, categoryId, products[2].id, {
      afterProductId: products[6].id,
    });

    // Expected: P1, P2, P4, P5, P6, P7, P3, P8, P9, P10
    const newOrder = await getProductsInOrder(api, categoryId);
    expect(newOrder).toEqual(['P1', 'P2', 'P4', 'P5', 'P6', 'P7', 'P3', 'P8', 'P9', 'P10']);
  });
});
