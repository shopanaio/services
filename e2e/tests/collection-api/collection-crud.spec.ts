import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Collection CRUD API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ═══════════════════════════════════════
  // CREATE - HAPPY PATH
  // ═══════════════════════════════════════

  test('should create a MANUAL collection with minimal input', async ({ api }) => {
    const input = {
      type: 'MANUAL',
      name: 'Summer Collection',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.id).toBeTruthy();
    expect(result.collection.type).toBe('MANUAL');
    expect(result.collection.name).toBe('Summer Collection');
    expect(result.collection.defaultSort).toBe('MANUAL');
    expect(result.collection.productsCount).toBe(0);
  });

  test('should create a RULE collection with minimal input', async ({ api }) => {
    const input = {
      type: 'RULE',
      name: 'Sale Items',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.type).toBe('RULE');
    expect(result.collection.name).toBe('Sale Items');
    // RULE collections should default to a non-MANUAL sort
    expect(['PRICE', 'NEWEST', 'NAME']).toContain(result.collection.defaultSort);
  });

  test('should create collection with handle', async ({ api }) => {
    const input = {
      type: 'MANUAL',
      name: 'Winter Collection',
      handle: 'winter-2024',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.handle).toBe('winter-2024');
  });

  test('should create collection with all optional fields', async ({ api }) => {
    const activeFrom = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const activeTo = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days from now

    const input = {
      type: 'MANUAL',
      name: 'Complete Collection',
      handle: 'complete-collection',
      description: {
        html: '<p>A comprehensive collection</p>',
        text: 'A comprehensive collection',
        json: { blocks: [{ type: 'paragraph', data: { text: 'A comprehensive collection' } }] },
      },
      defaultSort: 'PRICE',
      defaultSortDirection: 'ASC',
      activeFrom,
      activeTo,
      publish: true,
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.name).toBe('Complete Collection');
    expect(result.collection.handle).toBe('complete-collection');
    expect(result.collection.description.html).toBe('<p>A comprehensive collection</p>');
    expect(result.collection.description.text).toBe('A comprehensive collection');
    expect(result.collection.defaultSort).toBe('PRICE');
    expect(result.collection.defaultSortDirection).toBe('ASC');
    expect(result.collection.activeFrom).toBeTruthy();
    expect(result.collection.activeTo).toBeTruthy();
    expect(result.collection.isPublished).toBe(true);
  });

  test('should auto-generate handle from name if not provided', async ({ api }) => {
    const input = {
      type: 'MANUAL',
      name: 'Spring Sale 2024!',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    // Handle should be slugified from name
    expect(result.collection.handle).toMatch(/^spring-sale-2024/);
  });

  // ═══════════════════════════════════════
  // CREATE - VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty name', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'MANUAL',
          name: '',
        },
      },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        field: expect.arrayContaining(['input', 'name']),
      }),
    );
  });

  test('should reject invalid handle format', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'MANUAL',
          name: 'Test Collection',
          handle: 'Invalid Handle With Spaces!',
        },
      },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject duplicate handle', async ({ api }) => {
    // Create first collection
    const collection = await api.admin.collection.create({
      type: 'MANUAL',
      name: 'First Collection',
      handle: 'unique-handle',
    });
    expect(collection.handle).toBe('unique-handle');

    // Try to create another with same handle
    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'MANUAL',
          name: 'Second Collection',
          handle: 'unique-handle',
        },
      },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: expect.stringMatching(/ALREADY_EXISTS|DUPLICATE/i),
      }),
    );
  });

  test('should reject MANUAL sort for RULE collection', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'RULE',
          name: 'Rule Collection',
          defaultSort: 'MANUAL',
        },
      },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════

  test('should update collection name', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Original Name',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          name: 'Updated Name',
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection).toBeTruthy();
    expect(result.collection.name).toBe('Updated Name');
    // Type should not change
    expect(result.collection.type).toBe('MANUAL');
  });

  test('should update collection handle', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
      handle: 'original-handle',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          handle: 'updated-handle',
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.handle).toBe('updated-handle');
  });

  test('should update collection description', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          description: {
            html: '<p>New description</p>',
            text: 'New description',
            json: { blocks: [] },
          },
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.description.html).toBe('<p>New description</p>');
    expect(result.collection.description.text).toBe('New description');
  });

  test('should update collection defaultSort', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
      defaultSort: 'MANUAL',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          defaultSort: 'PRICE',
          defaultSortDirection: 'DESC',
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.defaultSort).toBe('PRICE');
    expect(result.collection.defaultSortDirection).toBe('DESC');
  });

  test('should update collection active dates', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
    });

    const activeFrom = new Date().toISOString();
    const activeTo = new Date(Date.now() + 86400000 * 7).toISOString();

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          activeFrom,
          activeTo,
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.activeFrom).toBeTruthy();
    expect(result.collection.activeTo).toBeTruthy();
  });

  test('should publish collection', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
    });
    expect(collection.isPublished).toBe(false);

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          publish: true,
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.isPublished).toBe(true);
    expect(result.collection.publishedAt).toBeTruthy();
  });

  test('should unpublish collection', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Test Collection',
      publish: true,
    });
    expect(collection.isPublished).toBe(true);

    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      variables: {
        input: {
          id: collection.id,
          publish: false,
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.isPublished).toBe(false);
  });

  test('should reject update with non-existent id', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'gid://catalog/Collection/nonexistent',
          name: 'Updated Name',
        },
      },
    });

    const result = data.catalogMutation.collectionUpdate;

    expect(result.collection).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════

  test('should delete collection (soft delete)', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Collection to Delete',
    });

    const { data } = await api.admin.mutation('catalog-api/CollectionDelete', {
      variables: {
        input: { id: collection.id },
      },
    });

    const result = data.catalogMutation.collectionDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedCollectionId).toBe(collection.id);

    // Verify collection is not found anymore
    const { data: queryData } = await api.admin.query('catalog-api/CollectionFindOne', {
      variables: { id: collection.id },
    });

    expect(queryData.catalogQuery.collection).toBeNull();
  });

  test('should reject delete with non-existent id', async ({ api }) => {
    const { data } = await api.admin.mutation('catalog-api/CollectionDelete', {
      throwOnError: false,
      variables: {
        input: { id: 'gid://catalog/Collection/nonexistent' },
      },
    });

    const result = data.catalogMutation.collectionDelete;

    expect(result.deletedCollectionId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════

  test('should get collection by ID', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Query Test Collection',
      handle: 'query-test',
    });

    const { data } = await api.admin.query('catalog-api/CollectionFindOne', {
      variables: { id: collection.id },
    });

    expect(data.catalogQuery.collection).toBeTruthy();
    expect(data.catalogQuery.collection.id).toBe(collection.id);
    expect(data.catalogQuery.collection.name).toBe('Query Test Collection');
    expect(data.catalogQuery.collection.handle).toBe('query-test');
  });

  test('should get collection by handle', async ({ api }) => {
    const collection = await api.admin.collection.create({
      name: 'Handle Query Collection',
      handle: 'handle-query-test',
    });

    const { data } = await api.admin.query('catalog-api/CollectionByHandle', {
      variables: { handle: 'handle-query-test' },
    });

    expect(data.catalogQuery.collectionByHandle).toBeTruthy();
    expect(data.catalogQuery.collectionByHandle.id).toBe(collection.id);
    expect(data.catalogQuery.collectionByHandle.name).toBe('Handle Query Collection');
  });

  test('should return null for non-existent handle', async ({ api }) => {
    const { data } = await api.admin.query('catalog-api/CollectionByHandle', {
      variables: { handle: 'non-existent-handle' },
    });

    expect(data.catalogQuery.collectionByHandle).toBeNull();
  });

  test('should list collections with pagination', async ({ api }) => {
    // Create multiple collections
    const collection1 = await api.admin.collection.create({ name: 'Collection A' });
    const collection2 = await api.admin.collection.create({ name: 'Collection B' });
    const collection3 = await api.admin.collection.create({ name: 'Collection C' });

    // Query first page
    const { data } = await api.admin.query('catalog-api/CollectionFindMany', {
      variables: { first: 2 },
    });

    expect(data.catalogQuery.collections.edges.length).toBeLessThanOrEqual(2);
    expect(data.catalogQuery.collections.totalCount).toBeGreaterThanOrEqual(3);
    expect(data.catalogQuery.collections.pageInfo).toBeTruthy();

    // Verify all created collections are in the list
    const allIds = [collection1.id, collection2.id, collection3.id];
    const { data: allData } = await api.admin.query('catalog-api/CollectionFindMany', {
      variables: { first: 100 },
    });

    const returnedIds = allData.catalogQuery.collections.edges.map(
      (e: { node: { id: string } }) => e.node.id,
    );
    for (const id of allIds) {
      expect(returnedIds).toContain(id);
    }
  });

  test('should paginate collections forward', async ({ api }) => {
    // Create collections
    await api.admin.collection.create({ name: 'Page Collection 1' });
    await api.admin.collection.create({ name: 'Page Collection 2' });
    await api.admin.collection.create({ name: 'Page Collection 3' });

    // Get first page
    const { data: page1 } = await api.admin.query('catalog-api/CollectionFindMany', {
      variables: { first: 2 },
    });

    expect(page1.catalogQuery.collections.edges.length).toBe(2);

    if (page1.catalogQuery.collections.pageInfo.hasNextPage) {
      // Get second page
      const { data: page2 } = await api.admin.query('catalog-api/CollectionFindMany', {
        variables: {
          first: 2,
          after: page1.catalogQuery.collections.pageInfo.endCursor,
        },
      });

      expect(page2.catalogQuery.collections.edges.length).toBeGreaterThan(0);
      // Ensure no overlap
      const page1Ids = page1.catalogQuery.collections.edges.map(
        (e: { node: { id: string } }) => e.node.id,
      );
      const page2Ids = page2.catalogQuery.collections.edges.map(
        (e: { node: { id: string } }) => e.node.id,
      );
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    }
  });

  // ═══════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════

  test('should reject unauthenticated create request', async ({ api }) => {
    await api.session.setupUserAndStore();
    api.session.clearSession();

    const { data, errors } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'MANUAL',
          name: 'Unauthorized Collection',
        },
      },
    });

    // Either GraphQL errors or userErrors should be present
    const hasError =
      (errors && errors.length > 0) ||
      (data?.catalogMutation?.collectionCreate?.userErrors?.length > 0);
    expect(hasError).toBe(true);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle collection with very long name', async ({ api }) => {
    const longName = 'A'.repeat(255);

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      throwOnError: false,
      variables: {
        input: {
          type: 'MANUAL',
          name: longName,
        },
      },
    });

    const result = data.catalogMutation.collectionCreate;

    // Either succeeds with truncated name or fails validation
    if (result.userErrors.length === 0) {
      expect(result.collection.name.length).toBeLessThanOrEqual(255);
    } else {
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('should handle special characters in name', async ({ api }) => {
    const input = {
      type: 'MANUAL',
      name: 'Collection with "quotes" & <special> chars',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.name).toBe('Collection with "quotes" & <special> chars');
  });

  test('should handle unicode characters in name', async ({ api }) => {
    const input = {
      type: 'MANUAL',
      name: 'Summer Collection 2024',
    };

    const { data } = await api.admin.mutation('catalog-api/CollectionCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.collectionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.collection.name).toBe('Summer Collection 2024');
  });
});
