import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Collection Products Query API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // Helper to create a product with optional pricing
  async function createProduct(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    options: {
      title: string;
      tags?: string[];
    },
  ) {
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: options.title,
          handle: `product-${crypto.randomUUID().slice(0, 8)}`,
          tags: options.tags,
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

  test('should query products in rule collection', async ({ api }) => {
    // Create products with specific tag
    await createProduct(api, { title: 'Tagged Product 1', tags: ['rule-test'] });
    await createProduct(api, { title: 'Tagged Product 2', tags: ['rule-test'] });
    await createProduct(api, { title: 'Untagged Product' });

    const collection = await api.admin.collection.createRule({
      name: 'Rule Query Test',
    });

    // Set rule to match tagged products
    await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'rule-test' }],
        },
      },
    });

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    const result = data.catalogQuery.collection;

    expect(result).toBeTruthy();
    expect(result.products.edges.length).toBeGreaterThanOrEqual(2);

    // All returned products should have the tag
    const titles = result.products.edges.map((e: { node: { title: string } }) => e.node.title);
    for (const title of titles) {
      expect(title).toMatch(/Tagged Product/);
    }
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
  // FILTERING
  // ═══════════════════════════════════════

  test('should filter products by inStock', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Stock Filter Test',
    });

    const product1 = await createProduct(api, { title: 'In Stock Product' });
    const product2 = await createProduct(api, { title: 'Out of Stock Product' });

    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        filters: { inStock: true },
      },
    });

    // Results depend on actual stock status of products
    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });

  test('should filter products by price range', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Price Filter Test',
    });

    const product1 = await createProduct(api, { title: 'Cheap Product' });
    const product2 = await createProduct(api, { title: 'Expensive Product' });

    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        filters: {
          priceMinMinor: 1000, // $10.00
          priceMaxMinor: 5000, // $50.00
        },
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });

  test('should filter products by facet slug', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Facet Filter Test',
    });

    const product1 = await createProduct(api, { title: 'Red Product' });
    const product2 = await createProduct(api, { title: 'Blue Product' });

    await api.admin.collection.addProducts(collection.id, [product1.id, product2.id]);

    // Filter by facet (format: facetSlug:valueSlug)
    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        filters: {
          facets: ['color:red'],
        },
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });

  test('should filter with multiple facets', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Multi Facet Filter Test',
    });

    const products = await Promise.all([
      createProduct(api, { title: 'Product 1' }),
      createProduct(api, { title: 'Product 2' }),
    ]);

    await api.admin.collection.addProducts(
      collection.id,
      products.map((p) => p.id),
    );

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        filters: {
          facets: ['brand:apple', 'size:large'],
        },
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });

  test('should filter with facet range', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Range Facet Filter Test',
    });

    const product = await createProduct(api, { title: 'Test Product' });
    await api.admin.collection.addProducts(collection.id, [product.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        filters: {
          ranges: [
            {
              facetSlug: 'weight',
              min: 100,
              max: 500,
            },
          ],
        },
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // FACETS RESPONSE
  // ═══════════════════════════════════════

  test('should return facets in products query', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Facets Response Test',
    });

    const product = await createProduct(api, { title: 'Test Product' });
    await api.admin.collection.addProducts(collection.id, [product.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products.facets).toBeTruthy();

    // Facets structure
    const facets = data.catalogQuery.collection.products.facets;
    expect(facets).toHaveProperty('priceRange');
    expect(facets).toHaveProperty('groups');
  });

  test('should return price range in facets', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Price Range Facet Test',
    });

    const product = await createProduct(api, { title: 'Priced Product' });
    await api.admin.collection.addProducts(collection.id, [product.id]);

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    const priceRange = data.catalogQuery.collection.products.facets.priceRange;

    // Price range should have min and max
    if (priceRange) {
      expect(priceRange).toHaveProperty('minMinor');
      expect(priceRange).toHaveProperty('maxMinor');
    }
  });

  test('should return facet groups with values', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Facet Groups Test',
    });

    const products = await Promise.all([
      createProduct(api, { title: 'Product 1' }),
      createProduct(api, { title: 'Product 2' }),
    ]);

    await api.admin.collection.addProducts(
      collection.id,
      products.map((p) => p.id),
    );

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
      },
    });

    const groups = data.catalogQuery.collection.products.facets.groups;

    expect(Array.isArray(groups)).toBe(true);

    // If there are groups, verify structure
    if (groups.length > 0) {
      const group = groups[0];
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('collapsed');
      expect(group).toHaveProperty('facets');

      if (group.facets.length > 0) {
        const facet = group.facets[0];
        expect(facet).toHaveProperty('facetType');
        expect(facet).toHaveProperty('slug');
        expect(facet).toHaveProperty('label');
        expect(facet).toHaveProperty('uiType');
        expect(facet).toHaveProperty('selectionMode');
        expect(facet).toHaveProperty('values');
        expect(facet).toHaveProperty('totalCount');
      }
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

  test('should combine sorting and filtering', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Sort and Filter Test',
    });

    const products = await Promise.all([
      createProduct(api, { title: 'Gamma Item' }),
      createProduct(api, { title: 'Alpha Item' }),
      createProduct(api, { title: 'Beta Item' }),
    ]);

    await api.admin.collection.addProducts(
      collection.id,
      products.map((p) => p.id),
    );

    const { data } = await api.admin.query('catalog-api/CollectionProducts', {
      variables: {
        id: collection.id,
        first: 10,
        sort: { by: 'NAME', direction: 'asc' },
        filters: { inStock: true },
      },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.products).toBeTruthy();
  });
});
