import { test } from '@fixtures/base.extend';
import { EntityStatus, ListingSort, ListingType } from '@codegen/admin-gql';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { CategorySort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';


async function prepareCategories(api: ApiFixtures['api']) {
  const expectedTitles: string[] = [];
  const categoryIds: string[] = [];

  await api.session.setupUserAndProject();

  
  for (let i = 0; i < 5; i++) {
    const title = `Category ${i}`;
    const result = await api.admin.category.create({
      input: {
        title,
        slug: `category-${i}-${randomUUID()}`,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: ListingSort.CreatedAtAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        excerpt: `Excerpt for category ${i}`,
        description: {
          json: JSON.stringify({
            blocks: [{ type: 'paragraph', data: { text: `Description for category ${i}` } }],
          }),
          text: `Description for category ${i}`,
          html: `<p>Description for category ${i}</p>`,
        },
        seo: {
          title: `SEO Title for Category ${i}`,
          description: `SEO Description for Category ${i}`,
        },
        gallery: [],
        listingFilters: [],
      },
    });

    expectedTitles.push(title);
    categoryIds.push(result.id);
  }

  
  for (let i = 0; i < 2; i++) {
    await api.admin.category.create({
      input: {
        title: `Draft Category ${i}`,
        slug: `draft-category-${i}-${randomUUID()}`,
        status: EntityStatus.Draft,
        includeChildrenProducts: true,
        listingOrderBy: ListingSort.CreatedAtAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        excerpt: `Draft excerpt for category ${i}`,
        description: {
          json: JSON.stringify({
            blocks: [{ type: 'paragraph', data: { text: `Draft description for category ${i}` } }],
          }),
          text: `Draft description for category ${i}`,
          html: `<p>Draft description for category ${i}</p>`,
        },
        gallery: [],
        listingFilters: [],
      },
    });
  }

  expectedTitles.sort((a, b) => a.localeCompare(b));

  await api.session.setupApiKey();

  return { expectedTitles, categoryIds };
}

// --- Helpers ---------------------------------------------------------------

const sortToFieldOrder: Record<CategorySort, { field: string; order: 'ASC' | 'DESC' }> = {
  [CategorySort.TitleAsc]: { field: 'title', order: 'ASC' },
  [CategorySort.TitleDesc]: { field: 'title', order: 'DESC' },
  [CategorySort.CreatedAtAsc]: { field: 'created_at', order: 'ASC' },
  [CategorySort.CreatedAtDesc]: { field: 'created_at', order: 'DESC' },
  [CategorySort.UpdatedAtAsc]: { field: 'updated_at', order: 'ASC' },
  [CategorySort.UpdatedAtDesc]: { field: 'updated_at', order: 'DESC' },
};

const sortsArray: CategorySort[] = [
  CategorySort.TitleAsc,
  CategorySort.TitleDesc,
  CategorySort.CreatedAtAsc,
  CategorySort.CreatedAtDesc,
  CategorySort.UpdatedAtAsc,
  CategorySort.UpdatedAtDesc,
];

const getExpectedBySort = (titles: string[], sort: CategorySort) => {
  switch (sort) {
    case CategorySort.TitleDesc:
    case CategorySort.CreatedAtDesc:
    case CategorySort.UpdatedAtDesc:
      return [...titles].reverse();
    default:
      return [...titles];
  }
};

// Register standard cursor tests for the main categories list
createCursorPaginationTests<CategorySort>({
  queryName: 'client/Categories',
  suiteName: 'categories cursor pagination',
  prepare: async (api) => {
    const { expectedTitles } = await prepareCategories(api);
    return { expectedTitles };
  },
  sorts: sortsArray,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.categories,
});

test.describe('Client Category API', () => {
  test('returns only published categories (TitleAsc)', async ({ api }) => {
    const { expectedTitles } = await prepareCategories(api);

    const { data } = await api.client.query('client/Categories', {
      variables: {
        first: 20,
        sort: CategorySort.TitleAsc,
      },
    });

    expect(data.categories.edges).toHaveLength(expectedTitles.length);
    data.categories.edges.forEach((edge, index) => {
      expect(edge.node.title).toBe(expectedTitles[index]);
    });
  });

  test('returns correct scalar fields for categories', async ({ api }) => {
    const { expectedTitles } = await prepareCategories(api);

    const { data } = await api.client.query('client/Categories', {
      variables: {
        first: 20,
        sort: CategorySort.TitleAsc,
      },
    });

    expect(data.categories.edges).toHaveLength(expectedTitles.length);

    data.categories.edges.forEach((edge, index) => {
      const category = edge.node;

      
      expect(category.id).toBeDefined();
      expect(category.iid).toBeDefined();
      expect(category.title).toBe(expectedTitles[index]);
      expect(category.handle).toMatch(/^category-\d+-[a-f0-9-]+$/);
      expect(category.description).toBeDefined();
      expect(category.excerpt).toBe(`Excerpt for category ${index}`);
      expect(category.listingType).toBe(ListingType.Manual);
      // TODO: Fix
      // expect(category.listingSort).toBe(ListingSort.CreatedAtAsc);
      expect(category.createdAt).toBeDefined();
      expect(category.updatedAt).toBeDefined();
      expect(category.seoTitle).toBe(`SEO Title for Category ${index}`);
      expect(category.seoDescription).toBe(`SEO Description for Category ${index}`);

      
      expect(category.cover).toBeDefined();
    });
  });

  // TODO: Rewrite service
  test.skip('sorts categories correctly after update by updatedAt', async ({ api }) => {
    const { categoryIds } = await prepareCategories(api);

    
    const { data: initialData } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.UpdatedAtDesc },
    });

    const initialOrder = initialData.categories.edges.map((edge) => edge.node.title);

    
    const firstCategoryId = categoryIds[0];
    await api.admin.category.update({
      input: {
        id: firstCategoryId,
        title: 'Updated Category 0',
        excerpt: 'Updated excerpt for category 0',
        description: {
          json: JSON.stringify({
            blocks: [{ type: 'paragraph', data: { text: 'Updated description for category 0' } }],
          }),
          text: 'Updated description for category 0',
          html: '<p>Updated description for category 0</p>',
        },
        seo: {
          title: 'Updated SEO Title for Category 0',
          description: 'Updated SEO Description for Category 0',
        },
      },
    });

    
    await new Promise((resolve) => setTimeout(resolve, 100));

    
    const { data: updatedData } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.UpdatedAtDesc },
    });

    const updatedOrder = updatedData.categories.edges.map((edge) => edge.node.title);

    
    expect(updatedOrder[0]).toBe('Updated Category 0');

    
    const otherCategories = updatedOrder.slice(1);
    const expectedOtherCategories = initialOrder.filter((title) => title !== 'Category 0');
    expect(otherCategories).toEqual(expectedOtherCategories);

    
    const updatedCategory = updatedData.categories.edges[0].node;
    expect(updatedCategory.title).toBe('Updated Category 0');
    expect(updatedCategory.excerpt).toBe('Updated excerpt for category 0');
    expect(updatedCategory.description).toBeDefined();
    expect(updatedCategory.seoTitle).toBe('Updated SEO Title for Category 0');
    expect(updatedCategory.seoDescription).toBe('Updated SEO Description for Category 0');
  });

  test('sorts categories by createdAt and updatedAt', async ({ api }) => {
    const { expectedTitles } = await prepareCategories(api);

    // CREATED_AT_ASC
    let { data } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.CreatedAtAsc },
    });
    data.categories.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(expectedTitles[idx]);
    });

    // CREATED_AT_DESC
    ({ data } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.CreatedAtDesc },
    }));
    const reversed = [...expectedTitles].reverse();
    data.categories.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(reversed[idx]);
    });

    // UPDATED_AT_ASC
    ({ data } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.UpdatedAtAsc },
    }));
    data.categories.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(expectedTitles[idx]);
    });

    // UPDATED_AT_DESC (+ update some items and check that they are sorted correctly)
    ({ data } = await api.client.query('client/Categories', {
      variables: { first: 20, sort: CategorySort.UpdatedAtDesc },
    }));
    data.categories.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(reversed[idx]);
    });
  });
});
