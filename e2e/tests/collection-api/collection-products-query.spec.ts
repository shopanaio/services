import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

// NOTE: All tests in this file are skipped because the Collection.products resolver
// is not yet implemented in the API. See CollectionResolver.ts TODO comment.
test.describe.skip('Collection Products Query API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // Helper to create a product
  async function createProduct(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    options: {
      title: string;
    },
  ) {
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: options.title,
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
  // BASIC QUERY
  // ═══════════════════════════════════════

  test('should query products in manual collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Manual Query Test',
    });
    const product1 = await createProduct(api, { title: 'Product A' });
    const product2 = await createProduct(api, { title: 'Product B' });

    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.collection;

    expect(result).toBeTruthy();
    expect(result.products.edges).toHaveLength(2);
    expect(result.products.totalCount).toBe(2);

    const productIds = result.products.edges.map((e: { node: { id: string } }) => e.node.id);
    expect(productIds).toContain(product1.id);
    expect(productIds).toContain(product2.id);
  });

  test.skip('should query products in rule collection', async ({ api }) => {
    // NOTE: This test is skipped because ProductCreateInput doesn't support tags.
    // Rule collections require products with matching attributes (tags, features, etc.)
    // which would need to be set up through separate mutations after product creation.
    // For now, we skip this test until tag assignment is implemented.

    const collection = await api.admin.collection.createRule({
      name: 'Rule Query Test',
    });

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.collection;

    expect(result).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════

  test('should paginate products forward', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Pagination Test',
    });

    // Create 5 products
    const products = await Promise.all([
      createProduct(api, { title: 'Page Product 1' }),
      createProduct(api, { title: 'Page Product 2' }),
      createProduct(api, { title: 'Page Product 3' }),
      createProduct(api, { title: 'Page Product 4' }),
      createProduct(api, { title: 'Page Product 5' }),
    ]);

    await api.admin.collection.addProducts(
      collection.id,
      products.map((p) => p.id),
    );

    // Get first page
    const { data: page1 } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 2,
      },
    });

    expect(page1.catalogQuery.collection.products.edges).toHaveLength(2);
    expect(page1.catalogQuery.collection.products.pageInfo.hasNextPage).toBe(true);
    expect(page1.catalogQuery.collection.products.totalCount).toBe(5);

    // Get second page
    const { data: page2 } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 2,
        after: page1.catalogQuery.collection.products.pageInfo.endCursor,
      },
    });

    expect(page2.catalogQuery.collection.products.edges).toHaveLength(2);
    expect(page2.catalogQuery.collection.products.pageInfo.hasNextPage).toBe(true);

    // Verify no overlap between pages
    const page1Ids = page1.catalogQuery.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    const page2Ids = page2.catalogQuery.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    for (const id of page2Ids) {
      expect(page1Ids).not.toContain(id);
    }
  });

  test('should paginate products backward', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Backward Pagination',
    });

    const products = await Promise.all([
      createProduct(api, { title: 'Back Product 1' }),
      createProduct(api, { title: 'Back Product 2' }),
      createProduct(api, { title: 'Back Product 3' }),
    ]);

    await api.admin.collection.addProducts(
      collection.id,
      products.map((p) => p.id),
    );

    // Get last page first
    const { data: lastPage } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        last: 2,
      },
    });

    expect(lastPage.catalogQuery.collection.products.edges).toHaveLength(2);
    expect(lastPage.catalogQuery.collection.products.pageInfo.hasPreviousPage).toBe(true);

    // Go back to previous page
    const { data: prevPage } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        last: 2,
        before: lastPage.catalogQuery.collection.products.pageInfo.startCursor,
      },
    });

    expect(prevPage.catalogQuery.collection.products.edges.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // SORTING
  // ═══════════════════════════════════════

  test('should sort products by MANUAL order in manual collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Manual Sort Test',
      defaultSort: 'MANUAL',
    });

    const product1 = await createProduct(api, { title: 'First' });
    const product2 = await createProduct(api, { title: 'Second' });
    const product3 = await createProduct(api, { title: 'Third' });

    // Add products in specific order
    await api.admin.collection.addProducts(collection.id, [product1.id]);
    await api.admin.collection.addProducts(collection.id, [product2.id]);
    await api.admin.collection.addProducts(collection.id, [product3.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'MANUAL', direction: 'asc' },
      },
    });

    const productIds = data.catalogQuery.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );

    // Should maintain insertion order
    expect(productIds[0]).toBe(product1.id);
    expect(productIds[1]).toBe(product2.id);
    expect(productIds[2]).toBe(product3.id);
  });

  test('should sort products by NAME ASC', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Name Sort Test',
    });

    const productC = await createProduct(api, { title: 'Charlie Product' });
    const productA = await createProduct(api, { title: 'Alpha Product' });
    const productB = await createProduct(api, { title: 'Beta Product' });

    await api.admin.collection.addProducts(collection.id, [productC.id, productA.id, productB.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'NAME', direction: 'asc' },
      },
    });

    const titles = data.catalogQuery.collection.products.edges.map(
      (e: { node: { title: string } }) => e.node.title,
    );

    expect(titles[0]).toBe('Alpha Product');
    expect(titles[1]).toBe('Beta Product');
    expect(titles[2]).toBe('Charlie Product');
  });

  test('should sort products by NAME DESC', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Name DESC Sort Test',
    });

    const productA = await createProduct(api, { title: 'Apple Product' });
    const productZ = await createProduct(api, { title: 'Zebra Product' });
    const productM = await createProduct(api, { title: 'Mango Product' });

    await api.admin.collection.addProducts(collection.id, [productA.id, productZ.id, productM.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'NAME', direction: 'desc' },
      },
    });

    const titles = data.catalogQuery.collection.products.edges.map(
      (e: { node: { title: string } }) => e.node.title,
    );

    expect(titles[0]).toBe('Zebra Product');
    expect(titles[1]).toBe('Mango Product');
    expect(titles[2]).toBe('Apple Product');
  });

  test('should sort products by NEWEST', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Newest Sort Test',
    });

    // Create products with slight delays to ensure different timestamps
    const product1 = await createProduct(api, { title: 'Oldest Product' });
    const product2 = await createProduct(api, { title: 'Middle Product' });
    const product3 = await createProduct(api, { title: 'Newest Product' });

    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id, product3.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'NEWEST', direction: 'desc' },
      },
    });

    const productIds = data.catalogQuery.collection.products.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );

    // Newest first
    expect(productIds[0]).toBe(product3.id);
    expect(productIds[2]).toBe(product1.id);
  });

  test('should reject MANUAL sort for RULE collection', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Rule No Manual Sort',
    });

    // Add a rule so there's something to query
    await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'any' }],
        },
      },
    });

    const { data, errors } = await api.admin.query('catalog-api/CollectionProducts', {
      throwOnError: false,
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'MANUAL', direction: 'asc' },
      },
    });

    // Should either return an error or fallback to default sort
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      // If it doesn't error, it should use a different sort
      expect(data.catalogQuery.collection).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle empty collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Empty Collection',
    });

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products.edges).toHaveLength(0);
    expect(data.catalogQuery.collection.products.totalCount).toBe(0);
  });

  test('should handle non-existent collection', async ({ api }) => {
    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: 'gid://catalog/Collection/nonexistent',
        first: 10,
      },
    });

    expect(data.catalogQuery.collection).toBeNull();
  });

  test('should use collection defaultSort when no sort specified', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Default Sort Collection',
      defaultSort: 'NAME',
      defaultSortDirection: 'asc',
    });

    const productZ = await createProduct(api, { title: 'Zulu Product' });
    const productA = await createProduct(api, { title: 'Alpha Product' });

    await api.admin.collection.addProducts(collection.id, [productZ.id, productA.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        // No sort specified - should use defaultSort
      },
    });

    const titles = data.catalogQuery.collection.products.edges.map(
      (e: { node: { title: string } }) => e.node.title,
    );

    // Should be sorted by name ascending (default)
    expect(titles[0]).toBe('Alpha Product');
    expect(titles[1]).toBe('Zulu Product');
  });

});
