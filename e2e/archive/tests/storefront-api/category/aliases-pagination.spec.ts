/* eslint-disable @typescript-eslint/no-explicit-any */

import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { GraphQLFileName } from '@queries/filenames';

const PAGE_SIZE = 2;

// helper to create parent with children and return slug + titles
async function createParentWithChildren(api: ApiFixtures['api'], idx: number) {
  const slug = `parent-alias-${idx}-${randomUUID()}`;
  const parent = await api.admin.category.create({
    input: {
      title: `Parent Alias ${idx}`,
      slug,
      status: 'PUBLISHED',
      includeChildrenProducts: true,
      listingOrderBy: 'CREATED_AT_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      excerpt: `Parent ${idx} excerpt`,
      description: {
        json: JSON.stringify({
          blocks: [{ type: 'paragraph', data: { text: `Parent ${idx} description` } }],
        }),
        text: `Parent ${idx} description`,
        html: `<p>Parent ${idx} description</p>`,
      },
      seo: {
        title: `SEO Parent ${idx}`,
        description: `SEO Parent ${idx}`,
      },
      gallery: [],
      listingFilters: [],
    },
  });

  const titles: string[] = [];
  for (let i = 0; i < 5; i++) {
    const title = `Child ${i}`;
    titles.push(title);
    await api.admin.category.create({
      input: {
        title,
        slug: `child-alias-${idx}-${i}-${randomUUID()}`,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'MANUAL',
        excerpt: `Excerpt ${title}`,
        description: {
          json: JSON.stringify({
            blocks: [{ type: 'paragraph', data: { text: `Description ${title}` } }],
          }),
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
  return { slug, titles } as const;
}

function expectTitles(result: any, expected: string[]) {
  expect(result.edges.map((e: any) => e.node.title)).toEqual(expected);
}

test.describe('category children pagination with aliases', () => {
  test('independent cursors per alias', async ({ api }) => {
    await api.session.setupUserAndProject();
    const parent1 = await createParentWithChildren(api, 1);
    const parent2 = await createParentWithChildren(api, 2);
    const parent3 = await createParentWithChildren(api, 3);

    await api.session.setupApiKey();

    // --------- First request ---------
    const { data: first } = await api.client.query('client/CategoryChildrenAliases', {
      variables: {
        handle1: parent1.slug,
        handle2: parent2.slug,
        handle3: parent3.slug,
        first1: PAGE_SIZE, // cat1 forward
        last2: PAGE_SIZE, // cat2 backward (last page)
        first3: PAGE_SIZE, // cat3 forward but stay static
        sort: 'TITLE_ASC',
      } as any,
    });

    const cat1Page1 = (first as any).cat1.children;
    const cat2Page1 = (first as any).cat2.children;
    const cat3Page1 = (first as any).cat3.children;

    expectTitles(cat1Page1, parent1.titles.slice(0, PAGE_SIZE));
    expectTitles(cat2Page1, parent2.titles.slice(-PAGE_SIZE));
    expectTitles(cat3Page1, parent3.titles.slice(0, PAGE_SIZE));

    const after1 = cat1Page1.pageInfo.endCursor as string;
    const before2 = cat2Page1.pageInfo.startCursor as string;

    // --------- Second request ---------
    const { data: second } = await api.client.query(
      'client/CategoryChildrenAliases' as unknown as GraphQLFileName,
      {
        variables: {
          handle1: parent1.slug,
          handle2: parent2.slug,
          handle3: parent3.slug,
          first1: PAGE_SIZE, // next slice for cat1
          after1,
          last2: PAGE_SIZE, // previous slice for cat2
          before2,
          first3: PAGE_SIZE, // cat3 again first page (no cursor)
          sort: 'TITLE_ASC',
        } as any,
      },
    );

    const cat1Page2 = (second as any).cat1.children;
    const cat2Prev = (second as any).cat2.children;
    const cat3Same = (second as any).cat3.children;

    expectTitles(cat1Page2, parent1.titles.slice(PAGE_SIZE, PAGE_SIZE * 2));

    expectTitles(cat2Prev, parent2.titles.slice(-PAGE_SIZE * 2, -PAGE_SIZE));

    expectTitles(cat3Same, parent3.titles.slice(0, PAGE_SIZE));
  });
});
