/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityStatus, ListingSort, ListingType } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import { CategorySort } from '@codegen/client-gql';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { GraphQLFileName } from '@queries/filenames';

// -------------------------------------------------------------

// -------------------------------------------------------------
const PAGE_SIZE = 2;

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

// -------------------------------------------------------------
// Data Preparation
// -------------------------------------------------------------
interface ParentInfo {
  slug: string;
  expectedTitles: string[];
}

async function prepareParents(api: ApiFixtures['api']): Promise<ParentInfo[]> {
  const parents: ParentInfo[] = [];

  const commonChildTitles = Array.from({ length: 5 }).map((_, i) => `Child ${i}`);

  
  for (let p = 0; p < 5; p++) {
    const parentSlug = `parent-${p}-${randomUUID()}`;
    const parent = await api.admin.category.create({
      input: {
        title: `Parent ${p}`,
        slug: parentSlug,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: ListingSort.CreatedAtAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        excerpt: `Parent ${p} excerpt`,
        description: {
          json: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: `Parent ${p} description` } }] }),
          text: `Parent ${p} description`,
          html: `<p>Parent ${p} description</p>`,
        },
        seo: {
          title: `SEO Parent ${p}`,
          description: `SEO Parent ${p}`,
        },
        gallery: [],
        listingFilters: [],
      },
    });

    
    for (let i = 0; i < commonChildTitles.length; i++) {
      const title = commonChildTitles[i];
      await api.admin.category.create({
        input: {
          title,
          slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
          status: EntityStatus.Published,
          includeChildrenProducts: true,
          listingOrderBy: ListingSort.CreatedAtAsc,
          listingOrderByStatus: true,
          listingType: ListingType.Manual,
          excerpt: `Excerpt ${title}`,
          description: {
            json: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: `Description ${title}` } }] }),
            text: `Description ${title}`,
            html: `<p>Description ${title}</p>`,
          },
          seo: {
            title: `SEO ${title}`,
            description: `SEO ${title}`,
          },
          parentId: parent.id,
          gallery: [],
          listingFilters: [],
        },
      });
    }

    parents.push({ slug: parentSlug, expectedTitles: [...commonChildTitles] });
  }

  return parents;
}

// -------------------------------------------------------------
// Helper to fetch children connection
// -------------------------------------------------------------
async function fetchChildren(api: ApiFixtures['api'], vars: { slug: string } & Record<string, unknown>) {
  const { data } = await api.client.query('client/CategoryChildren' as unknown as GraphQLFileName, {
    variables: { handle: vars.slug, ...vars } as any,
  });
  return (data as any).category.children;
}

function expectTitles(connection: any, expected: string[]) {
  expect(connection.edges.map((e: any) => e.node.title)).toEqual(expected);
  expect(connection.edges).toHaveLength(expected.length);
}

// -------------------------------------------------------------
// Tests
// -------------------------------------------------------------

test.describe('category children cursor pagination / multiple parents', () => {
  for (const sort of sortsArray) {
    test(`forward & backward, sort = ${sort}`, async ({ api }) => {
      await api.session.setupUserAndProject();
      const parents = await prepareParents(api);
      await api.session.setupApiKey();

      for (const { slug, expectedTitles } of parents) {
        const sorted = getExpectedBySort(expectedTitles, sort);

        // ---------- Forward pagination ----------
        const page1 = await fetchChildren(api, { slug, first: PAGE_SIZE, sort });
        expectTitles(page1, sorted.slice(0, PAGE_SIZE));
        expect(page1.pageInfo.hasNextPage).toBe(true);
        expect(page1.pageInfo.hasPreviousPage).toBe(false);

        const after = page1.pageInfo.endCursor as string;

        const page2 = await fetchChildren(api, { slug, first: PAGE_SIZE, after, sort });
        expectTitles(page2, sorted.slice(PAGE_SIZE, PAGE_SIZE * 2));

        // ---------- Backward pagination ----------
        const lastPage = await fetchChildren(api, { slug, last: PAGE_SIZE, sort });
        expectTitles(lastPage, sorted.slice(-PAGE_SIZE));

        const before = lastPage.pageInfo.startCursor as string;
        const prevPage = await fetchChildren(api, { slug, last: PAGE_SIZE, before, sort });
        expectTitles(prevPage, sorted.slice(-PAGE_SIZE * 2, -PAGE_SIZE));
      }
    });
  }
});
