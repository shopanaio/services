/* eslint-disable @typescript-eslint/no-explicit-any */

import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus, WeightUnit } from '@codegen/admin-gql';
import { ListingSort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import { randomUUID } from 'node:crypto';
import type { GraphQLFileName } from '@queries/filenames';

// ---------------------------------------------------------------------------
// Test data preparation
// ---------------------------------------------------------------------------


const SEARCH_TERM = 'LaptopTest';

export const listingSorts: ListingSort[] = [
  ListingSort.CreatedAtAsc,
  ListingSort.CreatedAtDesc,
  ListingSort.PriceAsc,
  ListingSort.PriceDesc,
  ListingSort.TitleAsc,
  ListingSort.TitleDesc,
  ListingSort.MostRelevant,
];

async function prepareSearchListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();


  const searchTerm = SEARCH_TERM;

  const specs: string[] = [
    `${searchTerm} ${searchTerm} ${searchTerm} Zulu`,
    `${searchTerm} ${searchTerm} Yankee`,
    `${searchTerm} Delta`,
    `${searchTerm} Charlie`,
    `${searchTerm} Bravo`,
    `${searchTerm} Alpha`,
  ];

  const creationOrderTitles: string[] = [];

  for (let i = 0; i < specs.length; i++) {
    const title = specs[i];
    const price = (i + 1) * 100;

    await api.admin.product.create({
      input: {
        title,
        slug: `search-product-${i}-${randomUUID()}`,
        status: EntityStatus.Published,
        requiresShipping: false,
        variants: {
          create: [
            {
              title,
              price,
              slug: `search-variant-${i}-${randomUUID()}`,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: WeightUnit.Gr,
            },
          ],
        },
      },
    });

    creationOrderTitles.push(title);
  }



  const expectedTitles = creationOrderTitles;

  // ------------------------------

  // ------------------------------
  const IRRELEVANT_COUNT = 3;
  for (let i = 0; i < IRRELEVANT_COUNT; i++) {
    const title = `Unrelated Product ${i}`;
    await api.admin.product.create({
      input: {
        title,
        slug: `unrelated-product-${i}-${randomUUID()}`,
        status: EntityStatus.Published,
        requiresShipping: false,
        variants: {
          create: [
            {
              title,
              price: 999,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: WeightUnit.Gr,
            },
          ],
        },
      },
    });
  }

  await api.session.setupApiKey();

  return {
    expectedTitles,
    baseVariables: { query: searchTerm },
  } as const;
}

// ---------------------------------------------------------------------------
// Helper mappings for cursor tests
// ---------------------------------------------------------------------------

const sortToFieldOrder = {
  [ListingSort.CreatedAtAsc]: { field: 'created_at', order: 'ASC' },
  [ListingSort.CreatedAtDesc]: { field: 'created_at', order: 'DESC' },
  [ListingSort.PriceAsc]: { field: 'price', order: 'ASC' },
  [ListingSort.PriceDesc]: { field: 'price', order: 'DESC' },
  [ListingSort.TitleAsc]: { field: 'title', order: 'ASC' },
  [ListingSort.TitleDesc]: { field: 'title', order: 'DESC' },
  [ListingSort.MostRelevant]: { field: 'sort_relevance', order: 'DESC' },
} as Record<ListingSort, { field: string; order: 'ASC' | 'DESC' }>;

const getExpectedBySort = (titles: string[], sort: ListingSort) => {
  switch (sort) {

    case ListingSort.CreatedAtAsc:
    case ListingSort.PriceAsc:
      return [...titles];

    case ListingSort.CreatedAtDesc:
    case ListingSort.PriceDesc:
      return [...titles].reverse();

    // --- Title ---
    case ListingSort.TitleAsc:
      return [...titles].sort((a, b) => a.localeCompare(b));
    case ListingSort.TitleDesc:
      return [...titles].sort((a, b) => b.localeCompare(a));

    // --- RelevanceDesc ---
    case ListingSort.MostRelevant: {
      const termRegex = new RegExp(SEARCH_TERM, 'g');
      return [...titles]
        .map((t, idx) => ({
          title: t,
          weight: (t.match(termRegex) || []).length,
          createdIdx: idx,
        }))
        .sort((a, b) => {
          if (b.weight !== a.weight) return b.weight - a.weight;
          return b.createdIdx - a.createdIdx;
        })
        .map((x) => x.title);
    }

    default:
      return [...titles];
  }
};

// ---------------------------------------------------------------------------
// Register cursor pagination test suite
// ---------------------------------------------------------------------------

createCursorPaginationTests<ListingSort>({
  queryName: 'client/SearchListing' as unknown as GraphQLFileName,
  suiteName: 'search products listing cursor pagination',
  prepare: prepareSearchListing,
  sorts: listingSorts,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.search.products,
  pageSize: 2,
  getSeekValue: {
    price: (node) => node.price.amount * 100,
  },
  checkArbitraryCursor: (sort) => sort !== ListingSort.MostRelevant,
});

// ---------------------------------------------------------------------------
// Additional simple checks
// ---------------------------------------------------------------------------

test.describe('Client Search Listing API', () => {
  test('returns products in TitleAsc order when specified', async ({ api }) => {
    const { expectedTitles, baseVariables } = await prepareSearchListing(api);

    const expected = [...expectedTitles].sort((a, b) => a.localeCompare(b));

    const { data } = await api.client.query('client/SearchListing' as unknown as GraphQLFileName, {
      variables: { ...baseVariables, first: 20, sort: ListingSort.TitleAsc },
    });

    expect(data.search).toBeDefined();
    const listing = data.search.products;
    expect(listing.edges).toHaveLength(expected.length);
    listing.edges.forEach((edge: any, index: number) => {
      expect(edge.node.title).toBe(expected[index]);
    });
  });

  test('returns products in RelevanceDesc order when specified', async ({ api }) => {
    const { expectedTitles, baseVariables } = await prepareSearchListing(api);
    const expected = getExpectedBySort(expectedTitles, ListingSort.MostRelevant);

    const { data } = await api.client.query('client/SearchListing' as unknown as GraphQLFileName, {
      variables: { ...baseVariables, first: 20, sort: ListingSort.MostRelevant },
    });

    expect(data.search).toBeDefined();
    const listing = data.search.products;
    expect(listing.edges).toHaveLength(expected.length);
    listing.edges.forEach((edge: any, index: number) => {
      expect(edge.node.title).toBe(expected[index]);
    });
  });
});
