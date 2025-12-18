/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  EntityStatus,
  ListingType,
  ListingSort as AdminListingSort,
  WeightUnit,
  DimensionUnit,
  FeatureStyleType,
} from '@codegen/admin-gql';
import { ListingSort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Test data preparation
// ---------------------------------------------------------------------------

export const listingSorts: ListingSort[] = [
  ListingSort.CreatedAtAsc,
  ListingSort.CreatedAtDesc,
  ListingSort.PriceAsc,
  ListingSort.PriceDesc,
  ListingSort.TitleAsc,
  ListingSort.TitleDesc,
];

async function prepareComplexFilteredListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // 1. Category
  const categorySlug = `complex-filter-pagination-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Complex Filter Pagination Category',
      slug: categorySlug,
      status: EntityStatus.Published,
      includeChildrenProducts: false,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
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
              featureStyleType: FeatureStyleType.Radio,
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
              featureStyleType: FeatureStyleType.Radio,
            },
          },
        ]
      : [];

    const product = await api.admin.product.create({
      input: {
        title,
        slug: `product-${i}-${randomUUID()}`,
        status: EntityStatus.Published,
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
              weightUnit: WeightUnit.Gr,
              categories: [],
              gallery: [],
              variantSortIndex: 0,
              dimensionUnit: DimensionUnit.Cm,
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
  [ListingSort.CreatedAtAsc]: { field: 'created_at', order: 'ASC' },
  [ListingSort.CreatedAtDesc]: { field: 'created_at', order: 'DESC' },
  [ListingSort.PriceAsc]: { field: 'price', order: 'ASC' },
  [ListingSort.PriceDesc]: { field: 'price', order: 'DESC' },
  [ListingSort.TitleAsc]: { field: 'title', order: 'ASC' },
  [ListingSort.TitleDesc]: { field: 'title', order: 'DESC' },
  [ListingSort.MostRelevant]: { field: 'updated_at', order: 'DESC' },
} as Record<ListingSort, { field: string; order: 'ASC' | 'DESC' }>;

const getExpectedBySort = (titles: string[], sort: ListingSort) => {
  // Base `expectedTitles` is sorted by title ASC.
  // The test data is created with ascending price and creation time.
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
