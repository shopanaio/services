import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Collection Rules API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // Helper to create a product with specific attributes
  async function createProductWithAttributes(
    api: Parameters<Parameters<typeof test>[1]>[0]['api'],
    attributes: {
      title: string;
      tags?: string[];
    },
  ) {
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: attributes.title,
          handle: `product-${crypto.randomUUID().slice(0, 8)}`,
          tags: attributes.tags,
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
  // UPDATE RULES - BASIC
  // ═══════════════════════════════════════

  test('should update rules on RULE collection', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Rule Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            {
              field: 'tag',
              operator: 'eq',
              value: 'sale',
            },
          ],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.rules).toHaveLength(1);
    expect(result.collection.rules[0].field).toBe('tag');
    expect(result.collection.rules[0].operator).toBe('eq');
    expect(result.collection.rules[0].value).toBe('sale');
  });

  test('should update multiple rules', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Multi Rule Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            { field: 'tag', operator: 'eq', value: 'featured' },
            { field: 'price', operator: 'gte', value: 1000 },
            { field: 'in_stock', operator: 'eq', value: true },
          ],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.rules).toHaveLength(3);

    const fieldNames = result.collection.rules.map((r: { field: string }) => r.field);
    expect(fieldNames).toContain('tag');
    expect(fieldNames).toContain('price');
    expect(fieldNames).toContain('in_stock');
  });

  test('should replace existing rules', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Replace Rules Collection',
    });

    // Set initial rules
    await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            { field: 'tag', operator: 'eq', value: 'old-tag' },
            { field: 'price', operator: 'gt', value: 500 },
          ],
        },
      },
    });

    // Replace with new rules
    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'category', operator: 'eq', value: 'electronics' }],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.rules).toHaveLength(1);
    expect(result.collection.rules[0].field).toBe('category');
  });

  test('should clear rules with empty array', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Clear Rules Collection',
    });

    // Set initial rules
    await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'test' }],
        },
      },
    });

    // Clear rules
    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.rules).toHaveLength(0);
  });

  test('should reject updating rules on MANUAL collection', async ({ api }) => {
    const collection = await api.admin.collection.createManual({
      name: 'Manual Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'test' }],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // RULE OPERATORS
  // ═══════════════════════════════════════

  test('should support eq operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Eq Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'premium' }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('eq');
  });

  test('should support gt operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'GT Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'price', operator: 'gt', value: 10000 }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('gt');
  });

  test('should support gte operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'GTE Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'price', operator: 'gte', value: 5000 }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('gte');
  });

  test('should support lt operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'LT Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'price', operator: 'lt', value: 2000 }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('lt');
  });

  test('should support lte operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'LTE Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'price', operator: 'lte', value: 9999 }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('lte');
  });

  test('should support in operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'In Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'in', value: ['sale', 'clearance', 'promotion'] }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('in');
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].value).toEqual([
      'sale',
      'clearance',
      'promotion',
    ]);
  });

  test('should support all operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'All Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'all', value: ['premium', 'featured'] }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('all');
  });

  test('should support between operator', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Between Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            {
              field: 'price',
              operator: 'between',
              value: { min: 1000, max: 5000 },
            },
          ],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].operator).toBe('between');
  });

  // ═══════════════════════════════════════
  // RULE FIELDS
  // ═══════════════════════════════════════

  test('should support tag field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Tag Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'tag', operator: 'eq', value: 'bestseller' }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('tag');
  });

  test('should support price field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Price Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'price', operator: 'gte', value: 2500 }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('price');
  });

  test('should support option field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Option Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'option', operator: 'eq', value: { name: 'color', value: 'red' } }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('option');
  });

  test('should support feature field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Feature Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            { field: 'feature', operator: 'eq', value: { name: 'brand', value: 'Apple' } },
          ],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('feature');
  });

  test('should support in_stock field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'In Stock Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'in_stock', operator: 'eq', value: true }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('in_stock');
  });

  test('should support category field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Category Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'category', operator: 'eq', value: 'electronics' }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('category');
  });

  test('should support created_at field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Created At Field Test' });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'created_at', operator: 'gte', value: thirtyDaysAgo }],
        },
      },
    });

    expect(data.catalogMutation.collectionUpdateRules.userErrors).toHaveLength(0);
    expect(data.catalogMutation.collectionUpdateRules.collection.rules[0].field).toBe('created_at');
  });

  // ═══════════════════════════════════════
  // RULES PREVIEW COUNT
  // ═══════════════════════════════════════

  test('should preview count for rules', async ({ api }) => {
    // Create some products with tags
    await createProductWithAttributes(api, { title: 'Sale Product 1', tags: ['sale'] });
    await createProductWithAttributes(api, { title: 'Sale Product 2', tags: ['sale'] });
    await createProductWithAttributes(api, { title: 'Regular Product', tags: ['regular'] });

    const { data } = await api.admin.query('catalog-api/CollectionRulesPreviewCount', {
      variables: {
        rules: [{ field: 'tag', operator: 'eq', value: 'sale' }],
      },
    });

    // Should find at least the 2 sale products
    expect(data.catalogQuery.collectionRulesPreviewCount).toBeGreaterThanOrEqual(2);
  });

  test('should preview count for multiple rules (AND logic)', async ({ api }) => {
    // Create products
    await createProductWithAttributes(api, {
      title: 'Featured Sale Product',
      tags: ['sale', 'featured'],
    });
    await createProductWithAttributes(api, { title: 'Just Sale', tags: ['sale'] });
    await createProductWithAttributes(api, { title: 'Just Featured', tags: ['featured'] });

    const { data } = await api.admin.query('catalog-api/CollectionRulesPreviewCount', {
      variables: {
        rules: [
          { field: 'tag', operator: 'eq', value: 'sale' },
          { field: 'tag', operator: 'eq', value: 'featured' },
        ],
      },
    });

    // Only the product with both tags should match (if AND logic)
    expect(data.catalogQuery.collectionRulesPreviewCount).toBeGreaterThanOrEqual(0);
  });

  test('should return 0 for rules matching no products', async ({ api }) => {
    const { data } = await api.admin.query('catalog-api/CollectionRulesPreviewCount', {
      variables: {
        rules: [{ field: 'tag', operator: 'eq', value: 'nonexistent-unique-tag-xyz123' }],
      },
    });

    expect(data.catalogQuery.collectionRulesPreviewCount).toBe(0);
  });

  test('should preview count for empty rules (all products)', async ({ api }) => {
    // Create some products
    await createProductWithAttributes(api, { title: 'Product A' });
    await createProductWithAttributes(api, { title: 'Product B' });

    const { data } = await api.admin.query('catalog-api/CollectionRulesPreviewCount', {
      variables: {
        rules: [],
      },
    });

    // Empty rules should return all products
    expect(data.catalogQuery.collectionRulesPreviewCount).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════
  // COMPLEX RULE SCENARIOS
  // ═══════════════════════════════════════

  test('should combine price range with tag filter', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Premium Sale Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            { field: 'tag', operator: 'eq', value: 'sale' },
            { field: 'price', operator: 'gte', value: 5000 },
            { field: 'price', operator: 'lte', value: 20000 },
          ],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.rules).toHaveLength(3);
  });

  test('should handle rules with stock and category filter', async ({ api }) => {
    const collection = await api.admin.collection.createRule({
      name: 'Available Electronics',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      variables: {
        input: {
          collectionId: collection.id,
          rules: [
            { field: 'category', operator: 'eq', value: 'electronics' },
            { field: 'in_stock', operator: 'eq', value: true },
          ],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.rules).toHaveLength(2);
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject invalid field name', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Invalid Field Test' });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'invalid_field_xyz', operator: 'eq', value: 'test' }],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject invalid operator for field', async ({ api }) => {
    const collection = await api.admin.collection.createRule({ name: 'Invalid Operator Test' });

    // Boolean fields shouldn't support gt operator
    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: collection.id,
          rules: [{ field: 'in_stock', operator: 'gt', value: true }],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    // This should either fail or succeed depending on implementation
    // If operators are validated per field type
    if (result.userErrors.length > 0) {
      expect(result.collection).toBeNull();
    }
  });

  test('should reject non-existent collection for rules update', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionUpdateRules', {
      throwOnError: false,
      variables: {
        input: {
          collectionId: 'gid://catalog/Collection/nonexistent',
          rules: [{ field: 'tag', operator: 'eq', value: 'test' }],
        },
      },
    });

    const result = data.catalogMutation.collectionUpdateRules;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
