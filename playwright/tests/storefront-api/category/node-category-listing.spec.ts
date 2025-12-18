/* eslint-disable @typescript-eslint/no-explicit-any */

import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus, ListingType, ListingSort as AdminListingSort } from '@codegen/admin-gql';
import { ListingSort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import type { GraphQLFileName } from '@queries/filenames';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Test data preparation (mostly copied from listing.spec.ts)
// ---------------------------------------------------------------------------

export const listingSorts: ListingSort[] = [
  ListingSort.CreatedAtAsc,
  ListingSort.CreatedAtDesc,
  ListingSort.PriceAsc,
  ListingSort.PriceDesc,
  ListingSort.TitleAsc,
  ListingSort.TitleDesc,
];

async function prepareListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // 1. Create a published category that will be used for listing
  const categorySlug = `node-listing-category-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Node Listing Test Category',
      slug: categorySlug,
      status: EntityStatus.Published,
      includeChildrenProducts: false,
      listingOrderBy: AdminListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
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
      status: EntityStatus.Published,
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
  [ListingSort.CreatedAtAsc]: { field: 'created_at', order: 'ASC' },
  [ListingSort.CreatedAtDesc]: { field: 'created_at', order: 'DESC' },
  [ListingSort.PriceAsc]: { field: 'price', order: 'ASC' },
  [ListingSort.PriceDesc]: { field: 'price', order: 'DESC' },
  [ListingSort.TitleAsc]: { field: 'title', order: 'ASC' },
  [ListingSort.TitleDesc]: { field: 'title', order: 'DESC' },
} as Record<ListingSort, { field: string; order: 'ASC' | 'DESC' }>;

const getExpectedBySort = (titles: string[], sort: ListingSort) => {
  switch (sort) {
    case ListingSort.CreatedAtDesc:
    case ListingSort.PriceDesc:
    case ListingSort.TitleDesc:
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
