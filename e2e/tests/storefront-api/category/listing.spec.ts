import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  EntityStatus,
  ListingType,
  ListingSort as AdminListingSort,
  WeightUnit,
  DimensionUnit,
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
  ListingSort.MostRelevant,
];

async function prepareListing(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // 1. Create a published category that will be used for listing
  const categorySlug = `listing-category-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Listing Test Category',
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

  // 2. Create several published products with distinct titles & prices
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

    // The first (and only) variant title will be our expected value
    expectedTitles.push(product.variants[0].title as string);
    productIds.push(product.id as string);
  }

  // Sort titles alphabetically for ASC expectations
  expectedTitles.sort((a, b) => a.localeCompare(b));

  // 3. Link products to category
  if (productIds.length > 0) {
    await api.admin.mutation('admin/CategoryAddProducts', {
      variables: { input: { categoryId: category.id, productContainerIds: productIds } },
    });
  }

  await api.session.setupApiKey();

  return {
    expectedTitles,
    baseVariables: { handle: categorySlug },
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
  [ListingSort.MostRelevant]: { field: 'listing_sort_index', order: 'DESC' },
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
// Register cursor pagination test suite
// ---------------------------------------------------------------------------

createCursorPaginationTests<ListingSort>({
  queryName: 'client/CategoryListing',
  suiteName: 'category listing cursor pagination',
  prepare: prepareListing,
  sorts: listingSorts,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.category.listing,
  pageSize: 2,
  getSeekValue: {
    price: (node) => node.price.amount * 100,
    listingSortIndex: () => expect.any(String),
  },
  checkArbitraryCursor: (sort) => sort !== ListingSort.MostRelevant,
});

// ---------------------------------------------------------------------------
// Additional simple checks
// ---------------------------------------------------------------------------

test.describe('Client Category Listing API', () => {
  test('returns products in TitleAsc order by default', async ({ api }) => {
    const { expectedTitles, baseVariables } = await prepareListing(api);

    const { data } = await api.client.query('client/CategoryListing', {
      variables: { ...baseVariables, first: 20, sort: ListingSort.TitleAsc },
    });

    expect(data.category).toBeDefined();
    const category = data.category as NonNullable<typeof data.category>;
    const listing = category.listing;
    expect(listing.edges).toHaveLength(expectedTitles.length);
    listing.edges.forEach((edge, index) => {
      expect(edge.node.title).toBe(expectedTitles[index]);
    });
  });

  
  async function prepareListingAvailableFirst(api: ApiFixtures['api'], availableFirst: boolean) {
    await api.session.setupUserAndProject();

    
    const categorySlug = `listing-category-available-${randomUUID()}`;
    const category = await api.admin.category.create({
      input: {
        title: 'Listing AvailableFirst Category',
        slug: categorySlug,
        status: EntityStatus.Published,
        includeChildrenProducts: false,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: availableFirst,
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

    
    type ProductSeed = { title: string; stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' };
    const products: ProductSeed[] = [
      { title: 'Alpha', stockStatus: 'OUT_OF_STOCK' },
      { title: 'Beta', stockStatus: 'IN_STOCK' },
      { title: 'Charlie', stockStatus: 'IN_STOCK' },
      { title: 'Delta', stockStatus: 'OUT_OF_STOCK' },
    ];

    const productIds: string[] = [];

    for (const { title, stockStatus } of products) {
      const { data } = await api.admin.mutation('admin/ProductCreate', {
        variables: {
          input: {
            description: null,
            excerpt: '',
            requiresShipping: false,
            slug: `product-${randomUUID()}`,
            status: EntityStatus.Published,
            tags: [],
            groups: [],
            title,
            variants: {
              create: [
                {
                  categories: [] as string[],
                  costPrice: 0,
                  coverId: null,
                  features: [],
                  gallery: [] as string[],
                  inListing: true,
                  oldPrice: 0,
                  price: 100,
                  sku: '',
                  slug: randomUUID(),
                  stockStatus,
                  title,
                  variantSortIndex: 0,
                  weight: 0,
                  weightUnit: WeightUnit.Gr,
                  dimensionUnit: DimensionUnit.Cm,
                  height: 0,
                  length: 0,
                  width: 0,
                },
              ],
            },
          },
        },
      });

      productIds.push(data.productMutation.create.id as string);
    }

    await api.session.setupApiKey();

    // Link to category
    if (productIds.length > 0) {
      await api.admin.mutation('admin/CategoryAddProducts', {
        variables: { input: { categoryId: category.id, productContainerIds: productIds } },
      });
    }

    
    const expectedTitleAsc = products.map((p) => p.title).sort((a, b) => a.localeCompare(b));

    
    const expectedAvailableFirst = [
      ...products
        .filter((p) => p.stockStatus === 'IN_STOCK')
        .map((p) => p.title)
        .sort((a, b) => a.localeCompare(b)),
      ...products
        .filter((p) => p.stockStatus === 'OUT_OF_STOCK')
        .map((p) => p.title)
        .sort((a, b) => a.localeCompare(b)),
    ];

    return {
      baseVariables: { handle: categorySlug },
      expectedTitleAsc,
      expectedAvailableFirst,
    } as const;
  }

  test('availableFirst=true – in-stock products first, then TitleAsc', async ({ api }) => {
    const { baseVariables, expectedAvailableFirst } = await prepareListingAvailableFirst(api, true);

    const { data } = await api.client.query('client/CategoryListing', {
      variables: { ...baseVariables, first: 20, sort: ListingSort.TitleAsc },
    });

    const category = data.category as NonNullable<typeof data.category>;
    const listing = category.listing;
    expect(listing.edges).toHaveLength(expectedAvailableFirst.length);
    listing.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(expectedAvailableFirst[idx]);
    });
  });

  test('availableFirst=false – ordering purely by TitleAsc', async ({ api }) => {
    const { baseVariables, expectedTitleAsc } = await prepareListingAvailableFirst(api, false);

    const { data } = await api.client.query('client/CategoryListing', {
      variables: { ...baseVariables, first: 20, sort: ListingSort.TitleAsc },
    });

    const category = data.category as NonNullable<typeof data.category>;
    const listing = category.listing;
    expect(listing.edges).toHaveLength(expectedTitleAsc.length);
    listing.edges.forEach((edge, idx) => {
      expect(edge.node.title).toBe(expectedTitleAsc[idx]);
    });
  });

  // ---------------------------------------------------------------------------
  // Prepare hierarchy with children categories
  // ---------------------------------------------------------------------------

  async function prepareHierarchyListing(api: ApiFixtures['api']): Promise<{
    rootHandle: string;
    expectedAvailableFirst: string[];
  }> {
    await api.session.setupUserAndProject();

    // 1. Root category (include children products)
    const rootSlug = `root-${randomUUID()}`;
    const rootCategory = await api.admin.category.create({
      input: {
        title: 'Root',
        slug: rootSlug,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        excerpt: 'Root',
        description: {
          json: '{}',
          text: 'Root',
          html: '<p>Root</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    // 2. Child and grandchild categories
    const child1 = await api.admin.category.create({
      input: {
        title: 'Child 1',
        slug: `child1-${randomUUID()}`,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        parentId: rootCategory.id,
        excerpt: 'Child1',
        description: {
          json: '{}',
          text: 'Child1',
          html: '<p>Child1</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    const grandchild1 = await api.admin.category.create({
      input: {
        title: 'Grandchild 1',
        slug: `grand1-${randomUUID()}`,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        parentId: child1.id,
        excerpt: 'Grand1',
        description: {
          json: '{}',
          text: 'Grand1',
          html: '<p>Grand1</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    // Second branch without grandchild
    const child2 = await api.admin.category.create({
      input: {
        title: 'Child 2',
        slug: `child2-${randomUUID()}`,
        status: EntityStatus.Published,
        includeChildrenProducts: true,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        parentId: rootCategory.id,
        excerpt: 'Child2',
        description: {
          json: '{}',
          text: 'Child2',
          html: '<p>Child2</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    
    const draftChild = await api.admin.category.create({
      input: {
        title: 'Child Draft',
        slug: `child-draft-${randomUUID()}`,
        status: EntityStatus.Draft,
        includeChildrenProducts: true,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Manual,
        parentId: rootCategory.id,
        excerpt: 'Draft',
        description: {
          json: '{}',
          text: 'Draft',
          html: '<p>Draft</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    // 3. Products (published and draft, stock statuses)
    type ProdSeed = {
      title: string;
      stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK';
      categoryId: string;
      status: EntityStatus;
    };

    const seeds: ProdSeed[] = [
      {
        title: 'Apple',
        stockStatus: 'IN_STOCK',
        categoryId: child1.id,
        status: EntityStatus.Published,
      },
      {
        title: 'Banana',
        stockStatus: 'OUT_OF_STOCK',
        categoryId: child1.id,
        status: EntityStatus.Published,
      },
      {
        title: 'Cherry',
        stockStatus: 'IN_STOCK',
        categoryId: grandchild1.id,
        status: EntityStatus.Published,
      },
      {
        title: 'Date',
        stockStatus: 'OUT_OF_STOCK',
        categoryId: child2.id,
        status: EntityStatus.Published,
      },
      {
        title: 'Drafty',
        stockStatus: 'IN_STOCK',
        categoryId: grandchild1.id,
        status: EntityStatus.Draft,
      },
      {
        title: 'Excluded',
        stockStatus: 'IN_STOCK',
        categoryId: draftChild.id,
        status: EntityStatus.Published,
      },
    ];

    const publishedTitlesInStock: string[] = [];
    const publishedTitlesOutOfStock: string[] = [];

    for (const seed of seeds) {
      const { title, stockStatus, categoryId, status } = seed;

      const product = await api.admin.product.create({
        input: {
          description: null,
          excerpt: '',
          requiresShipping: false,
          slug: `prod-${randomUUID()}`,
          status,
          tags: [],
          groups: [],
          title,
          variants: {
            create: [
              {
                categories: [],
                costPrice: 0,
                coverId: null,
                features: [],
                gallery: [],
                inListing: true,
                oldPrice: 0,
                price: 100,
                sku: '',
                slug: randomUUID(),
                stockStatus,
                title,
                variantSortIndex: 0,
                weight: 0,
                weightUnit: WeightUnit.Gr,
                dimensionUnit: DimensionUnit.Cm,
                height: 0,
                length: 0,
                width: 0,
              },
            ],
          },
        },
      });

      const productId = product.id as string;

      // link to category
      await api.admin.mutation('admin/CategoryAddProducts', {
        variables: {
          input: {
            categoryId,
            productContainerIds: [productId],
          },
        },
      });

      if (status === EntityStatus.Published && seed.categoryId !== draftChild.id) {
        if (stockStatus === 'IN_STOCK') {
          publishedTitlesInStock.push(title);
        } else {
          publishedTitlesOutOfStock.push(title);
        }
      }
    }

    await api.session.setupApiKey();

    const expectedAvailableFirst = [
      ...publishedTitlesInStock.sort((a, b) => a.localeCompare(b)),
      ...publishedTitlesOutOfStock.sort((a, b) => a.localeCompare(b)),
    ];

    return {
      rootHandle: rootSlug,
      expectedAvailableFirst,
    } as const;
  }

  test('includeChildrenProducts=true – listing aggregates nested products with sorting & availability', async ({
    api,
  }) => {
    const { rootHandle, expectedAvailableFirst } = await prepareHierarchyListing(api);

    const { data } = await api.client.query('client/CategoryListing', {
      variables: { handle: rootHandle, first: 20, sort: ListingSort.TitleAsc },
    });

    const category = data.category as NonNullable<typeof data.category>;
    const listing = category.listing;
    expect(listing.edges).toHaveLength(expectedAvailableFirst.length);
    const received = listing.edges.map((e) => e.node.title);
    expect(received).toEqual(expectedAvailableFirst);
  });

  // ---------------------------------------------------------------------------
  // inListing flag test
  // ---------------------------------------------------------------------------

  test('only variants with inListing=true are returned in listing', async ({ api }) => {
    await api.session.setupUserAndProject();

    // Create category
    const slug = `inlisting-cat-${randomUUID()}`;
    const category = await api.admin.category.create({
      input: {
        title: 'InListing Test Category',
        slug,
        status: EntityStatus.Published,
        includeChildrenProducts: false,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: false,
        listingType: ListingType.Manual,
        excerpt: '',
        description: { json: '{}', text: '', html: '' },
        gallery: [],
        listingFilters: [],
      },
    });

    // Create product with three variants (2 visible, 1 hidden)
    const variantInput = (title: string, index: number, inListing: boolean) => ({
      categories: [] as string[],
      costPrice: 0,
      coverId: null,
      features: [],
      gallery: [] as string[],
      inListing,
      oldPrice: 0,
      price: 100,
      sku: '',
      slug: randomUUID(),
      stockStatus: 'IN_STOCK',
      title,
      variantSortIndex: index,
      weight: 0,
      weightUnit: WeightUnit.Gr,
      dimensionUnit: DimensionUnit.Cm,
      height: 0,
      length: 0,
      width: 0,
    });

    const { data: prodResp } = await api.admin.mutation('admin/ProductCreate', {
      variables: {
        input: {
          description: null,
          excerpt: '',
          requiresShipping: false,
          slug: `prod-${randomUUID()}`,
          status: EntityStatus.Published,
          tags: [],
          groups: [],
          title: 'Container',
          variants: {
            create: [
              variantInput('Visible A', 0, true),
              variantInput('Hidden', 1, false),
              variantInput('Visible B', 2, true),
            ],
          },
        },
      },
    });

    const containerId = prodResp.productMutation.create.id as string;

    // Link product container to category
    await api.admin.mutation('admin/CategoryAddProducts', {
      variables: {
        input: { categoryId: category.id, productContainerIds: [containerId] },
      },
    });

    await api.session.setupApiKey();

    // Expected titles (only visible)
    const expected = ['Visible A', 'Visible B'];

    const { data } = await api.client.query('client/CategoryListing', {
      variables: { handle: slug, first: 10, sort: ListingSort.TitleAsc },
    });

    const listing = (data.category as NonNullable<typeof data.category>).listing;
    expect(listing.edges).toHaveLength(expected.length);
    const received = listing.edges.map((e) => e.node.title);
    expect(received).toEqual(expected);
  });
});
