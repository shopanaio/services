import { EntityStatus, ListingSort, ListingType } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import { CategorySort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';

// --- Constants -----------------------------------------------------------
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
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: ListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
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
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: ListingSort.CreatedAtAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
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
