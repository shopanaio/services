/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ApiQuery } from '@codegen/client-gql';

import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

type CategorySort = 'TITLE_ASC' | 'TITLE_DESC' | 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'UPDATED_AT_ASC' | 'UPDATED_AT_DESC';

const PAGE_SIZE = 2;

const sorts: CategorySort[] = [
  'TITLE_ASC',
  'TITLE_DESC',
  'CREATED_AT_ASC',
  'CREATED_AT_DESC',
  'UPDATED_AT_ASC',
  'UPDATED_AT_DESC',
];

const commonChildTitles = Array.from({ length: 5 }).map((_, i) => `Child ${i}`);

const getExpected = (titles: string[], sort: CategorySort) => {
  if (
    sort === 'TITLE_DESC' ||
    sort === 'CREATED_AT_DESC' ||
    sort === 'UPDATED_AT_DESC'
  )
    return [...titles].reverse();
  return [...titles];
};

async function createParents(api: ApiFixtures['api']) {
  const parents: { slug: string; titles: string[] }[] = [];
  for (let i = 0; i < 3; i++) {
    const slug = `parent-cat-${i}-${randomUUID()}`;
    const parent = await api.admin.category.create({
      input: {
        title: `Parent Cat ${i}`,
        slug,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'MANUAL',
        excerpt: `Parent ${i} excerpt`,
        description: {
          json: JSON.stringify({
            blocks: [{ type: 'paragraph', data: { text: `Parent ${i} desc` } }],
          }),
          text: `Parent ${i} desc`,
          html: `<p>Parent ${i} desc</p>`,
        },
        seo: {
          title: `SEO Parent ${i}`,
          description: `SEO Parent ${i}`,
        },
        gallery: [],
        listingFilters: [],
      },
    });

    for (let j = 0; j < commonChildTitles.length; j++) {
      const title = commonChildTitles[j];
      await api.admin.category.create({
        input: {
          title,
          slug: `child-${i}-${j}-${randomUUID()}`,
          status: 'PUBLISHED',
          includeChildrenProducts: true,
          listingOrderBy: 'CREATED_AT_ASC',
          listingOrderByStatus: true,
          listingType: 'MANUAL',
          excerpt: `Ex ${title}`,
          description: {
            json: JSON.stringify({
              blocks: [{ type: 'paragraph', data: { text: `Desc ${title}` } }],
            }),
            text: `Desc ${title}`,
            html: `<p>Desc ${title}</p>`,
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
    parents.push({ slug, titles: [...commonChildTitles] });
  }
  return parents;
}

function extractChildrenTitles(data: ApiQuery, slug: string) {
  const edge = data.categories.edges.find((e: any) => e.node.handle === slug);
  return edge?.node.children.edges.map((e: any) => e.node.title) ?? [];
}

test.describe('categories query children pagination (first/last only)', () => {
  for (const sort of sorts) {
    test(`sort=${sort}`, async ({ api }) => {
      await api.session.setupUserAndProject();
      const parents = await createParents(api);
      await api.session.setupApiKey();

      await test.step('forward', async () => {
        const { data: forward } = await api.client.query('client/CategoriesChildren', {
          variables: {
            first: 50,
            sort,
            childrenFirst: PAGE_SIZE,
            childrenLast: undefined,
          } as any,
        });

        for (const p of parents) {
          const expected = getExpected(p.titles, sort).slice(0, PAGE_SIZE);
          expect(extractChildrenTitles(forward, p.slug)).toEqual(expected);
        }
      });

      await test.step('backward', async () => {
        const { data: backward } = await api.client.query('client/CategoriesChildren', {
          variables: {
            first: 50,
            sort,
            childrenFirst: undefined,
            childrenLast: PAGE_SIZE,
          } as any,
        });

        for (const p of parents) {
          const expected = getExpected(p.titles, sort).slice(-PAGE_SIZE);
          expect(extractChildrenTitles(backward, p.slug).toString()).toEqual(expected.toString());
        }
      });
    });
  }
});
