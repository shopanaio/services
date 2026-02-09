import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Collection Manual Products API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // Helper to create a simple product
  async function createProduct(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    title: string,
  ) {
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle: `product-${crypto.randomUUID().slice(0, 8)}`,
        },
      },
    });
    const result = data.catalogMutation.productCreate;
    if (result.userErrors.length > 0 || !result.product) {
      throw new Error(`Failed to create product: ${JSON.stringify(result.userErrors)}`);
    }
    return result.product;
  }

  // ═══════════════════════════════════════
  // ADD PRODUCTS
  // ═══════════════════════════════════════

  test('should add single product to manual collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Manual Collection',
    });
    const product = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.productsCount).toBe(1);

    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds).toContain(product.id);
  });

  test('should add multiple products to manual collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Multi Product Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');
    const product3 = await createProduct(api, 'Product 3');

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product1.id, product2.id, product3.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.productsCount).toBe(3);

    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds).toContain(product1.id);
    expect(productIds).toContain(product2.id);
    expect(productIds).toContain(product3.id);
  });

  test('should add products incrementally', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Incremental Collection',
    });
    const product1 = await createProduct(api, 'First Product');
    const product2 = await createProduct(api, 'Second Product');

    // Add first product
    await api.admin.mutation('catalog-api/CollectionAddProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product1.id],
        },
      },
    });

    // Add second product
    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product2.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.productsCount).toBe(2);
  });

  test('should handle adding already-added product (idempotent)', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Idempotent Collection',
    });
    const product = await createProduct(api, 'Duplicate Product');

    // Add product first time
    await api.admin.mutation('catalog-api/CollectionAddProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    // Add same product again
    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    // Should either succeed (idempotent) or return error
    if (result.userErrors.length === 0) {
      // Idempotent - count should still be 1
      expect(result.collection.productsCount).toBe(1);
    } else {
      // Error returned for duplicate
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('should reject adding products to RULE collection', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Rule Collection',
    });
    const product = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject adding non-existent product', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Collection with Invalid Product',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: ['gid://catalog/Product/nonexistent'],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject adding to non-existent collection', async ({ api }) => {
    const product = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: 'gid://catalog/Collection/nonexistent',
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // REMOVE PRODUCTS
  // ═══════════════════════════════════════

  test('should remove single product from collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Remove Single Collection',
    });
    const product = await createProduct(api, 'Product to Remove');

    // Add product
    await api.admin.collection.addProducts(collection.id, [product.id]);

    // Remove product
    const { data } = await api.admin.mutation('catalog-api/CollectionRemoveProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionRemoveProducts;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.productsCount).toBe(0);
  });

  test('should remove multiple products from collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Remove Multi Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');
    const product3 = await createProduct(api, 'Product 3');

    // Add all products
    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id, product3.id]);

    // Remove two products
    const { data } = await api.admin.mutation('catalog-api/CollectionRemoveProducts', {
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product1.id, product2.id],
        },
      },
    });

    const result = data.catalogMutation.collectionRemoveProducts;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.productsCount).toBe(1);

    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds).not.toContain(product1.id);
    expect(productIds).not.toContain(product2.id);
    expect(productIds).toContain(product3.id);
  });

  test('should handle removing non-existing product from collection (idempotent)', async ({
    api,
  }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Idempotent Remove Collection',
    });
    const product = await createProduct(api, 'Test Product');

    // Try to remove product that was never added
    const { data } = await api.admin.mutation('catalog-api/CollectionRemoveProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionRemoveProducts;

    // Should either succeed (idempotent) or return error
    if (result.userErrors.length === 0) {
      expect(result.collection.productsCount).toBe(0);
    } else {
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('should reject removing from RULE collection', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Rule Collection',
    });
    const product = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('catalog-api/CollectionRemoveProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [product.id],
        },
      },
    });

    const result = data.catalogMutation.collectionRemoveProducts;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // MOVE PRODUCT (REORDER)
  // ═══════════════════════════════════════

  test('should move product to beginning of collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Move to Beginning Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');
    const product3 = await createProduct(api, 'Product 3');

    // Add products in order
    await api.admin.collection.addProducts(collection.id, [product1.id]);
    await api.admin.collection.addProducts(collection.id, [product2.id]);
    await api.admin.collection.addProducts(collection.id, [product3.id]);

    // Move product3 to beginning (before product1)
    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      variables: {
        input: {
          collectionId: collection.id,
          productId: product3.id,
          beforeProductId: product1.id,
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();

    // Verify order: product3, product1, product2
    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds[0]).toBe(product3.id);
    expect(productIds[1]).toBe(product1.id);
    expect(productIds[2]).toBe(product2.id);
  });

  test('should move product to end of collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Move to End Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');
    const product3 = await createProduct(api, 'Product 3');

    // Add products in order
    await api.admin.collection.addProducts(collection.id, [product1.id]);
    await api.admin.collection.addProducts(collection.id, [product2.id]);
    await api.admin.collection.addProducts(collection.id, [product3.id]);

    // Move product1 to end (after product3)
    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      variables: {
        input: {
          collectionId: collection.id,
          productId: product1.id,
          afterProductId: product3.id,
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.userErrors).toHaveLength(0);

    // Verify order: product2, product3, product1
    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds[0]).toBe(product2.id);
    expect(productIds[1]).toBe(product3.id);
    expect(productIds[2]).toBe(product1.id);
  });

  test('should move product to middle of collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Move to Middle Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');
    const product3 = await createProduct(api, 'Product 3');
    const product4 = await createProduct(api, 'Product 4');

    // Add products in order
    await api.admin.collection.addProducts(collection.id, [
      product1.id,
      product2.id,
      product3.id,
      product4.id,
    ]);

    // Move product4 between product1 and product2
    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      variables: {
        input: {
          collectionId: collection.id,
          productId: product4.id,
          afterProductId: product1.id,
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.userErrors).toHaveLength(0);

    // Verify order: product1, product4, product2, product3
    const productIds = result.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    expect(productIds[0]).toBe(product1.id);
    expect(productIds[1]).toBe(product4.id);
    expect(productIds[2]).toBe(product2.id);
    expect(productIds[3]).toBe(product3.id);
  });

  test('should reject move in RULE collection', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Rule Collection',
    });
    const product = await createProduct(api, 'Test Product');

    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productId: product.id,
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject move for product not in collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Move Not In Collection',
    });
    const product1 = await createProduct(api, 'Product In Collection');
    const product2 = await createProduct(api, 'Product Not In Collection');

    await api.admin.collection.addProducts(collection.id, [product1.id]);

    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productId: product2.id,
          beforeProductId: product1.id,
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject move with invalid reference product', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Move Invalid Reference Collection',
    });
    const product1 = await createProduct(api, 'Product 1');
    const product2 = await createProduct(api, 'Product 2');

    await api.admin.collection.addProducts(collection.id, [product1.id]);
    // product2 is NOT in collection

    const { data } = await api.admin.mutation('catalog-api/CollectionMoveProduct', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productId: product1.id,
          afterProductId: product2.id, // product2 not in collection
        },
      },
    });

    const result = data.catalogMutation.collectionMoveProduct;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle adding empty product list', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Empty Add Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionAddProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [],
        },
      },
    });

    const result = data.catalogMutation.collectionAddProducts;

    // Either succeeds with no changes or returns validation error
    if (result.userErrors.length === 0) {
      expect(result.collection.productsCount).toBe(0);
    } else {
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('should handle removing empty product list', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Empty Remove Collection',
    });
    const product = await createProduct(api, 'Test Product');
    await api.admin.collection.addProducts(collection.id, [product.id]);

    const { data } = await api.admin.mutation('catalog-api/CollectionRemoveProducts', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          productIds: [],
        },
      },
    });

    const result = data.catalogMutation.collectionRemoveProducts;

    // Either succeeds with no changes or returns validation error
    if (result.userErrors.length === 0) {
      expect(result.collection.productsCount).toBe(1); // Product should still be there
    } else {
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('should maintain product order after adding multiple products', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Order Test Collection',
      defaultSort: 'MANUAL',
    });

    const products = await Promise.all([
      createProduct(api, 'Product A'),
      createProduct(api, 'Product B'),
      createProduct(api, 'Product C'),
    ]);

    // Add products one by one to establish order
    for (const product of products) {
      await api.admin.collection.addProducts(collection.id, [product.id]);
    }

    // Query products with MANUAL sort
    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'MANUAL', direction: 'asc' },
      },
    });

    const returnedIds = data.catalogQuery.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );

    // Products should maintain insertion order
    expect(returnedIds).toHaveLength(3);
    expect(returnedIds[0]).toBe(products[0].id);
    expect(returnedIds[1]).toBe(products[1].id);
    expect(returnedIds[2]).toBe(products[2].id);
  });
});
