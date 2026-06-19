
import { randomUUID } from 'node:crypto';

import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';

type CategorySort = 'TITLE_ASC' | 'TITLE_DESC' | 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'UPDATED_AT_ASC' | 'UPDATED_AT_DESC';

// --- Constants -----------------------------------------------------------
const sortToFieldOrder: Record<CategorySort, { field: string; order: 'ASC' | 'DESC' }> = {
  ['TITLE_ASC']: { field: 'title', order: 'ASC' },
  ['TITLE_DESC']: { field: 'title', order: 'DESC' },
  ['CREATED_AT_ASC']: { field: 'created_at', order: 'ASC' },
  ['CREATED_AT_DESC']: { field: 'created_at', order: 'DESC' },
  ['UPDATED_AT_ASC']: { field: 'updated_at', order: 'ASC' },
  ['UPDATED_AT_DESC']: { field: 'updated_at', order: 'DESC' },
};

const sortsArray: CategorySort[] = [
  'TITLE_ASC',
  'TITLE_DESC',
  'CREATED_AT_ASC',
  'CREATED_AT_DESC',
  'UPDATED_AT_ASC',
  'UPDATED_AT_DESC',
];

const getExpectedBySort = (titles: string[], sort: CategorySort) => {
  switch (sort) {
    case 'TITLE_DESC':
    case 'CREATED_AT_DESC':
    case 'UPDATED_AT_DESC':
      return [...titles].reverse();
    default:
      return [...titles];
  }
};

// --- Data preparation ----------------------------------------------------
async function prepareChildrenCategories(api: ApiFixtures['api']) {
  const expectedTitles: string[] = [];

  await api.session.setupUserAndProject();

  // Create parent category
  const parentSlug = `parent-${randomUUID()}`;
  const parent = await api.admin.category.create({
    input: {
      title: 'Parent Category',
      slug: parentSlug,
      status: 'PUBLISHED',
      includeChildrenProducts: true,
      listingOrderBy: 'CREATED_AT_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      excerpt: 'Parent excerpt',
      description: {
        json: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'Parent description' } }] }),
        text: 'Parent description',
        html: '<p>Parent description</p>',
      },
      seo: {
        title: 'SEO Parent',
        description: 'SEO Parent',
      },
      gallery: [],
      listingFilters: [],
    },
  });

  // Create 5 child categories
  for (let i = 0; i < 5; i++) {
    const title = `Child ${i}`;
    expectedTitles.push(title);
    await api.admin.category.create({
      input: {
        title,
        slug: `child-${i}-${randomUUID()}`,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'MANUAL',
        excerpt: `Excerpt child ${i}`,
        description: {
          json: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: `Description child ${i}` } }] }),
          text: `Description child ${i}`,
          html: `<p>Description child ${i}</p>`,
        },
        seo: {
          title: `SEO Child ${i}`,
          description: `SEO Child ${i}`,
        },
        parentId: parent.id,
        gallery: [],
        listingFilters: [],
      },
    });
  }

  expectedTitles.sort((a, b) => a.localeCompare(b));

  await api.session.setupApiKey();

  return { expectedTitles, baseVariables: { handle: parentSlug } };
}

// --- Register generic cursor tests --------------------------------------
createCursorPaginationTests<CategorySort>({
  queryName: 'client/CategoryChildren',
  suiteName: 'category children cursor pagination',
  prepare: prepareChildrenCategories,
  sorts: sortsArray,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.category.children,
});
