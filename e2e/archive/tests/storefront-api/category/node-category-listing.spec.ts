/* eslint-disable @typescript-eslint/no-explicit-any */

import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import type { GraphQLFileName } from '@queries/filenames';
import { randomUUID } from 'node:crypto';

type ListingSort = 'CUSTOM' | 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'TITLE_ASC' | 'TITLE_DESC' | 'MOST_RELEVANT';

// ---------------------------------------------------------------------------
// Test data preparation (mostly copied from listing.spec.ts)
// ---------------------------------------------------------------------------

export const listingSorts: ListingSort[] = [
  'CREATED_AT_ASC',
  'CREATED_AT_DESC',
  'PRICE_ASC',
  'PRICE_DESC',
  'TITLE_ASC',
  'TITLE_DESC',
];

async function prepareListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // 1. Create a published category that will be used for listing
  const categorySlug = `node-listing-category-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Node Listing Test Category',
      slug: categorySlug,
      status: 'PUBLISHED',
      includeChildrenProducts: false,
      listingOrderBy: 'CREATED_AT_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      excerpt: 'Excerpt',
      description: {
        json: '{}',
        text: 'Description',
        html: '<p>Description</p>',
      },
      gallery: [],
      listingFilters: [],
    },
  });

  const productIds: string[] = [];
  const expectedTitles: string[] = [];
  const PRODUCTS_COUNT = 5;
  for (let i = 0; i < PRODUCTS_COUNT; i++) {
    const title = `Product ${i}`;
    const price = (i + 1) * 100; // cents

    const product = await api.admin.product.createWithOptions({
      title,
      slug: `product-${i}-${randomUUID()}`,
      status: 'PUBLISHED',
      price,
      requiresShipping: false,
      options: [
        {
          title: `Variant ${i}`,
          values: [title],
        },
      ],
    });

    expectedTitles.push(product.variants[0].title as string);
    productIds.push(product.id as string);
  }

  expectedTitles.sort((a, b) => a.localeCompare(b));

  if (productIds.length > 0) {
    await api.admin.mutation('admin/CategoryAddProducts', {
      variables: { input: { categoryId: category.id, productContainerIds: productIds } },
    });
  }

  await api.session.setupApiKey();

  const { data: catData } = await api.client.query(
    'client/CategoryBreadcrumbs' as GraphQLFileName,
    {
      variables: { handle: categorySlug },
    },
  );

  const categoryId = (catData as any).category.id as string;

  return {
    expectedTitles,
    baseVariables: { id: categoryId },
  };
}

// ---------------------------------------------------------------------------
// Helper mappings for cursor tests
// ---------------------------------------------------------------------------

const sortToFieldOrder = {
  ['CREATED_AT_ASC']: { field: 'created_at', order: 'ASC' },
  ['CREATED_AT_DESC']: { field: 'created_at', order: 'DESC' },
  ['PRICE_ASC']: { field: 'price', order: 'ASC' },
  ['PRICE_DESC']: { field: 'price', order: 'DESC' },
  ['TITLE_ASC']: { field: 'title', order: 'ASC' },
  ['TITLE_DESC']: { field: 'title', order: 'DESC' },
} as Record<ListingSort, { field: string; order: 'ASC' | 'DESC' }>;

const getExpectedBySort = (titles: string[], sort: ListingSort) => {
  switch (sort) {
    case 'CREATED_AT_DESC':
    case 'PRICE_DESC':
    case 'TITLE_DESC':
      return [...titles].reverse();
    default:
      return [...titles];
  }
};

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

createCursorPaginationTests<ListingSort>({
  queryName: 'client/NodeCategoryListing' as GraphQLFileName,
  suiteName: 'node category listing cursor pagination',
  prepare: prepareListing,
  sorts: listingSorts,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data: any) => (data.node as any).listing,
  pageSize: 2,
  getSeekValue: {
    price: (node) => node.price.amount * 100,
  },
});
