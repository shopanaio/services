/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import { randomUUID } from 'node:crypto';

type ListingSort = 'CUSTOM' | 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'TITLE_ASC' | 'TITLE_DESC' | 'MOST_RELEVANT';

// ---------------------------------------------------------------------------
// Test data preparation
// ---------------------------------------------------------------------------

export const listingSorts: ListingSort[] = [
  'CREATED_AT_ASC',
  'CREATED_AT_DESC',
  'PRICE_ASC',
  'PRICE_DESC',
  'TITLE_ASC',
  'TITLE_DESC',
];

async function prepareComplexFilteredListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // 1. Category
  const categorySlug = `complex-filter-pagination-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Complex Filter Pagination Category',
      slug: categorySlug,
      status: 'PUBLISHED',
      includeChildrenProducts: false,
      listingOrderBy: 'TITLE_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      listingFilters: [],
    },
  });

  // 2. Tags
  const tagSale = await api.admin.tag.create({
    input: { title: 'Sale', slug: `sale-${randomUUID()}`, color: '#000000' },
  });

  // 3. Products
  const matchingProductsCount = 7; // For pagination - increased to get 5 products in price range
  const totalProducts = 15;
  const productIds: string[] = [];
  const expectedTitles: string[] = [];

  for (let i = 0; i < totalProducts; i++) {
    // Determine if the product should match the full filter set
    const shouldMatch = i < matchingProductsCount;

    const title = `Product ${String.fromCharCode(65 + i)}`;
    const price = 1000 + i * 100; // 10.00, 11.00, 12.00 ...

    // Attributes for a matching product
    const tags = shouldMatch ? [tagSale.id] : [];
    const stockStatus = shouldMatch ? 'IN_STOCK' : 'OUT_OF_STOCK';
    const features = shouldMatch
      ? [
          {
            title: 'Cotton',
            slug: 'material.cotton',
            isAttribute: true,
            isOption: false,
            attributeSortIndex: 0,
            optionSortIndex: 0,
            group: {
              title: 'Material',
              slug: 'material',
              featureStyleType: 'RADIO',
            },
          },
          {
            title: 'M',
            slug: 'size.m',
            isAttribute: false,
            isOption: true,
            attributeSortIndex: 0,
            optionSortIndex: 0,
            group: {
              title: 'Size',
              slug: 'size',
              featureStyleType: 'RADIO',
            },
          },
        ]
      : [];

    const product = await api.admin.product.create({
      input: {
        title,
        slug: `product-${i}-${randomUUID()}`,
        status: 'PUBLISHED',
        tags,
        requiresShipping: false,
        groups: [],
        variants: {
          create: [
            {
              title,
              slug: `variant-${i}-${randomUUID()}`,
              price,
              stockStatus,
              inListing: true,
              features,
              sku: `SKU-${i}`,
              weight: 100,
              weightUnit: 'g',
              categories: [],
              gallery: [],
              variantSortIndex: 0,
              dimensionUnit: 'cm',
              height: 0,
              length: 0,
              width: 0,
            },
          ],
        },
      },
    });

    productIds.push(product.id);

    // To be selected by the filter, a product must meet ALL criteria:
    // Tag=Sale, Material=Cotton, Size=M, Price 12-18, In Stock.
    // Our setup makes `shouldMatch` products meet the tag, material, option, and stock criteria.
    // We only need to check if their price also falls in the range.
    if (shouldMatch && price >= 1200 && price <= 1800) {
      expectedTitles.push(title);
    }
  }

  // 4. Link all products to the category
  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: {
        categoryId: category.id,
        productContainerIds: productIds,
      },
    },
  });

  await api.session.setupApiKey();

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------

  //

  //

  // - Product C (price 12.00)
  // - Product D (price 13.00)
  // - Product E (price 14.00)
  // - Product F (price 15.00)
  // - Product G (price 16.00)
  // ---------------------------------------------------------------------

  // 5. Define the complex filter to be used in tests
  const filters = [
    { handle: 'PRICE', values: ['12', '18'] },
    { handle: 'TAG', values: [tagSale.slug] },
    { handle: 'FEATURE', values: ['material.cotton'] },
    { handle: 'OPTION', values: ['size.m'] },
    { handle: 'AVAILABILITY', values: ['IN_STOCK'] },
  ];

  return {
    expectedTitles: expectedTitles.sort((a, b) => a.localeCompare(b)),
    baseVariables: { handle: categorySlug, filters },
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
  ['MOST_RELEVANT']: { field: 'updated_at', order: 'DESC' },
} as Record<ListingSort, { field: string; order: 'ASC' | 'DESC' }>;

const getExpectedBySort = (titles: string[], sort: ListingSort) => {
  // Base `expectedTitles` is sorted by title ASC.
  // The test data is created with ascending price and creation time.
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
// Register cursor pagination test suite for a complex filtered listing
// ---------------------------------------------------------------------------

createCursorPaginationTests<ListingSort>({
  queryName: 'client/CategoryListingFilters',
  suiteName: 'category listing with complex/combined filters cursor pagination',
  prepare: prepareComplexFilteredListing,
  sorts: listingSorts,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.category!.listing,
  pageSize: 2,
  getSeekValue: {
    price: (node) => node.price.amount * 100,
  },
});
