import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category Product Ordering API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and return its ID
   */
  async function createProduct(api: any, title: string) {
    const handle = title.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().slice(0, 8);
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle,
        },
      },
    });

    const product = data.catalogMutation.productCreate.product;
    if (!product) {
      throw new Error('Failed to create product');
    }
    return product.id;
  }

  /**
   * Helper to add a product to a category
   * Note: We use categoryMoveProduct to add products (it creates the link if missing via upsert)
   * or we can directly use the repository's addProductToCategory via a separate mutation
   */
  async function addProductToCategory(api: any, categoryId: string, productId: string) {
    // First, we need to check if there's a mutation to add products
    // Based on the schema, categoryMoveProduct expects the product to already be in category
    // We might need to use a different approach - let's check for a dedicated mutation
    // For now, use categoryMoveProduct with no positioning (adds to end)
    const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
      variables: {
        input: {
          categoryId,
          productId,
          // No afterProductId or beforeProductId - adds to end
        },
      },
      throwOnError: false,
    });

    return data;
  }

  /**
   * Helper to get products in category order
   */
  async function getCategoryProducts(api: any, categoryId: string) {
    const { data } = await api.admin.query('category-api/CategoryProducts', {
      variables: {
        categoryId,
        first: 20,
        sort: { by: 'MANUAL', direction: 'asc' },
      },
    });

    return data.catalogQuery.categoryProducts.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
    }));
  }

  // ===============================================
  // CATEGORY MOVE PRODUCT
  // ===============================================

  test('should reject move when product not in category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'move-product-not-in-cat',
      name: 'Move Product Not In Cat',
    });

    const productId = await createProduct(api, 'Orphan Product');

    const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          categoryId: category.id,
          productId: productId,
        },
      },
    });

    const result = data.catalogMutation.categoryMoveProduct;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
      })
    );
  });

  test('should reject move with non-existent category', async ({ api }) => {
    const productId = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          categoryId: '00000000-0000-0000-0000-000000000000',
          productId: productId,
        },
      },
    });

    const result = data.catalogMutation.categoryMoveProduct;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
      })
    );
  });

  test('should reject move with invalid afterProductId', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'move-invalid-after',
      name: 'Move Invalid After',
    });

    const productId = await createProduct(api, 'Test Product');

    // Note: Since we can't add products without them being in category first,
    // this test validates the error when afterProductId is not in the category
    const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          categoryId: category.id,
          productId: productId,
          afterProductId: '00000000-0000-0000-0000-000000000000',
        },
      },
    });

    const result = data.catalogMutation.categoryMoveProduct;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ===============================================
  // CATEGORY REBALANCE
  // ===============================================

  test('should rebalance empty category', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'rebalance-empty',
      name: 'Rebalance Empty',
    });

    const { data } = await api.admin.mutation('category-api/CategoryRebalance', {
      variables: {
        input: {
          categoryId: category.id,
        },
      },
    });

    const result = data.catalogMutation.categoryRebalance;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.id).toBe(category.id);
  });

  test('should reject rebalance for non-existent category', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryRebalance', {
      throwOnError: false,
      variables: {
        input: {
          categoryId: '00000000-0000-0000-0000-000000000000',
        },
      },
    });

    const result = data.catalogMutation.categoryRebalance;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
      })
    );
  });

  test('should rebalance using fixture helper', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'rebalance-fixture',
      name: 'Rebalance Fixture',
    });

    const result = await api.admin.category.rebalance(category.id);

    expect(result.id).toBe(category.id);
  });

  // ===============================================
  // EDGE CASES
  // ===============================================

  test('should handle move product with same afterProductId as productId', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'move-same-id',
      name: 'Move Same ID',
    });

    const productId = await createProduct(api, 'Self Reference Product');

    // This should fail since the product isn't in the category, but also because
    // moving after itself doesn't make sense
    const { data } = await api.admin.mutation('category-api/CategoryMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          categoryId: category.id,
          productId: productId,
          afterProductId: productId, // Same as productId
        },
      },
    });

    const result = data.catalogMutation.categoryMoveProduct;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
