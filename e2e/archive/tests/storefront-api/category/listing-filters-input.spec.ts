/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  EntityStatus,
  ListingType,
  ListingSort as AdminListingSort,
  WeightUnit,
  DimensionUnit,
  FeatureStyleType,
} from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { randomUUID } from 'node:crypto';
import type { ApiListFilter } from '@codegen/client-gql';

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

type TagInfo = { id: string; slug: string; title: string };

async function setupCategoryAndProducts(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  alphaTagSlug: string;
  expectedAlphaTitles: string[];
}> {
  await api.session.setupUserAndProject();


  const categorySlug = `filters-input-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Filters Input Category',
      slug: categorySlug,
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


  const createTag = async (title: string): Promise<TagInfo> => {
    const slug = `${title}-${randomUUID()}`;
    const tag = await api.admin.tag.create({
      input: {
        title,
        slug,
        color: '#000000',
      },
    });
    return { id: tag.id, slug, title };
  };

  const tagAlpha = await createTag('alpha');
  const tagBeta = await createTag('beta');
  const tagGamma = await createTag('gamma');


  type Seed = { title: string; price: number; tag: TagInfo };
  const seeds: Seed[] = [
    { title: 'Alpha One', price: 1000, tag: tagAlpha },
    { title: 'Alpha Two', price: 2000, tag: tagAlpha },
    { title: 'Beta Item', price: 1500, tag: tagBeta },
    { title: 'Gamma Item', price: 2500, tag: tagGamma },
  ];

  const productIds: string[] = [];

  for (const seed of seeds) {
    const variantInput = {
      categories: [] as string[],
      costPrice: 0,
      coverId: null,
      features: [],
      gallery: [] as string[],
      inListing: true,
      oldPrice: 0,
      price: seed.price,
      sku: '',
      slug: randomUUID(),
      stockStatus: 'IN_STOCK',
      title: seed.title,
      variantSortIndex: 0,
      weight: 0,
      weightUnit: WeightUnit.Gr,
      dimensionUnit: DimensionUnit.Cm,
      height: 0,
      length: 0,
      width: 0,
    } as const;

    const { data } = await api.admin.mutation('admin/ProductCreate', {
      variables: {
        input: {
          description: null,
          excerpt: '',
          requiresShipping: false,
          slug: randomUUID(),
          status: EntityStatus.Published,
          tags: [seed.tag.id],
          groups: [],
          title: seed.title,
          variants: {
            create: [variantInput],
          },
        },
      },
    });

    productIds.push(data.productMutation.create.id as string);
  }


  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: {
        categoryId: category.id,
        productContainerIds: productIds,
      },
    },
  });

  await api.session.setupApiKey();

  return {
    categorySlug,
    alphaTagSlug: tagAlpha.slug,
    expectedAlphaTitles: ['Alpha One', 'Alpha Two'],
  };
}

async function setupProductsWithPriceRange(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  expectedTitlesInRange: string[];
}> {
  await api.session.setupUserAndProject();


  const categorySlug = `filters-price-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Price Filters Input Category',
      slug: categorySlug,
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


  type Seed = { title: string; price: number };
  const seeds: Seed[] = [
    { title: 'Product 5', price: 500 },
    { title: 'Product 10', price: 1000 },
    { title: 'Product 15', price: 1500 },
    { title: 'Product 20', price: 2000 },
    { title: 'Product 25', price: 2500 },
  ];

  const productIds: string[] = [];

  for (const seed of seeds) {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: EntityStatus.Published,
        tags: [],
        groups: [],
        title: seed.title,
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
              price: seed.price,
              sku: '',
              slug: randomUUID(),
              stockStatus: 'IN_STOCK',
              title: seed.title,
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

    productIds.push(product.id);
  }


  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: {
        categoryId: category.id,
        productContainerIds: productIds,
      },
    },
  });

  await api.session.setupApiKey();


  const expectedTitlesInRange = ['Product 10', 'Product 15', 'Product 20'];

  return {
    categorySlug,
    expectedTitlesInRange,
  };
}

async function setupProductsWithStockStatus(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  expectedOutOfStockTitles: string[];
}> {
  await api.session.setupUserAndProject();


  const categorySlug = `filters-availability-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Availability Filters Input Category',
      slug: categorySlug,
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


  type Seed = { title: string; stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' };
  const seeds: Seed[] = [
    { title: 'Available A', stockStatus: 'IN_STOCK' },
    { title: 'Available B', stockStatus: 'IN_STOCK' },
    { title: 'Unavailable A', stockStatus: 'OUT_OF_STOCK' },
    { title: 'Unavailable B', stockStatus: 'OUT_OF_STOCK' },
  ];

  const productIds: string[] = [];
  const expectedOutOfStockTitles: string[] = [];

  for (const seed of seeds) {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: EntityStatus.Published,
        tags: [],
        groups: [],
        title: seed.title,
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
              price: 1000,
              sku: '',
              slug: randomUUID(),
              stockStatus: seed.stockStatus,
              title: seed.title,
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

    productIds.push(product.id);

    if (seed.stockStatus === 'OUT_OF_STOCK') {
      expectedOutOfStockTitles.push(seed.title);
    }
  }


  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: { categoryId: category.id, productContainerIds: productIds },
    },
  });

  await api.session.setupApiKey();

  return { categorySlug, expectedOutOfStockTitles };
}

async function setupProductsWithFeature(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  featureHandle: string;
  expectedTitles: string[];
}> {
  await api.session.setupUserAndProject();


  const categorySlug = `filters-feature-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Feature Filters Input Category',
      slug: categorySlug,
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


  const cottonHandle = 'material.cotton';

  type Seed = { title: string; material: 'Cotton' | 'Leather' };
  const seeds: Seed[] = [
    { title: 'Cotton Shirt', material: 'Cotton' },
    { title: 'Cotton Pants', material: 'Cotton' },
    { title: 'Leather Jacket', material: 'Leather' },
  ];

  const productIds: string[] = [];

  for (const seed of seeds) {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: EntityStatus.Published,
        tags: [],
        groups: [],
        title: seed.title,
        variants: {
          create: [
            {
              categories: [] as string[],
              costPrice: 0,
              coverId: null,
              features: [
                {
                  attributeSortIndex: 0,
                  optionSortIndex: 0,
                  title: seed.material,
                  slug: `material.${seed.material.toLowerCase()}`,
                  isAttribute: true,
                  isOption: false,
                  group: {
                    title: 'Material',
                    slug: 'material',
                    featureStyleType: FeatureStyleType.Radio,
                  },
                },
              ],
              gallery: [] as string[],
              inListing: true,
              oldPrice: 0,
              price: 1000,
              sku: '',
              slug: randomUUID(),
              stockStatus: 'IN_STOCK',
              title: seed.title,
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

    productIds.push(product.id);
  }

  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: { categoryId: category.id, productContainerIds: productIds },
    },
  });

  await api.session.setupApiKey();

  return {
    categorySlug,
    featureHandle: cottonHandle,
    expectedTitles: ['Cotton Shirt', 'Cotton Pants'],
  };
}

async function setupProductsWithOption(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  optionHandle: string;
  expectedTitles: string[];
}> {
  await api.session.setupUserAndProject();

  const categorySlug = `filters-option-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Option Filters Input Category',
      slug: categorySlug,
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


  const sizeSHandle = 'size.s';

  type Seed = { title: string; size: 'S' | 'M' };
  const seeds: Seed[] = [
    { title: 'T-Shirt S', size: 'S' },
    { title: 'Hoodie S', size: 'S' },
    { title: 'Jacket M', size: 'M' },
  ];

  const productIds: string[] = [];

  for (const seed of seeds) {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: EntityStatus.Published,
        tags: [],
        groups: [],
        title: seed.title,
        variants: {
          create: [
            {
              categories: [] as string[],
              costPrice: 0,
              coverId: null,
              features: [
                {
                  attributeSortIndex: 0,
                  optionSortIndex: 0,
                  title: seed.size,
                  slug: `size.${seed.size.toLowerCase()}`,
                  isAttribute: false,
                  isOption: true,
                  group: {
                    title: 'Size',
                    slug: 'size',
                    featureStyleType: FeatureStyleType.Radio,
                  },
                },
              ],
              gallery: [] as string[],
              inListing: true,
              oldPrice: 0,
              price: 1000,
              sku: '',
              slug: randomUUID(),
              stockStatus: 'IN_STOCK',
              title: seed.title,
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

    productIds.push(product.id);
  }

  await api.admin.mutation('admin/CategoryAddProducts', {
    variables: {
      input: { categoryId: category.id, productContainerIds: productIds },
    },
  });

  await api.session.setupApiKey();

  return { categorySlug, optionHandle: sizeSHandle, expectedTitles: ['T-Shirt S', 'Hoodie S'] };
}

function findFilterByType(filters: any[], typename: string) {
  return filters.find((f) => (f as any).__typename === typename);
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

test.describe('Category Listing + Facets with filter input', () => {
  test('returns only products matching price range', async ({ api }) => {
    const { categorySlug, expectedTitlesInRange } = await setupProductsWithPriceRange(api);


    const filtersInput = [
      {
        handle: 'PRICE',
        values: ['10', '20'],
      },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 20, filters: filtersInput },
    });


    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitlesInRange.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitlesInRange.sort());


    const filters = data.category!.listing.filters;

    const priceFilter = findFilterByType(filters, 'PriceRangeFilter') as any;
    expect(priceFilter).toBeDefined();
  });

  test('returns only products matching stock status', async ({ api }) => {
    const { categorySlug, expectedOutOfStockTitles } = await setupProductsWithStockStatus(api);


    const filtersInput = [
      {
        handle: 'AVAILABILITY',
        values: ['OUT_OF_STOCK'],
      },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 20, filters: filtersInput },
    });


    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedOutOfStockTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedOutOfStockTitles.sort());


    const filters = data.category!.listing.filters;

    const availFilter = filters.find(
      (f: any) => (f as any).__typename === 'ListFilter' && (f as any).handle === 'AVAILABILITY',
    ) as any;
    expect(availFilter).toBeDefined();

    const outOfStockValue = availFilter.values.find((v: any) => v.handle === 'OUT_OF_STOCK');
    expect(outOfStockValue).toBeDefined();
    expect(outOfStockValue.count).toBe(expectedOutOfStockTitles.length);


    const inStockValue = availFilter.values.find((v: any) => v.handle === 'IN_STOCK');
    if (inStockValue) {
      expect(inStockValue.count).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // Feature filter test
  // ---------------------------------------------------------------------------

  test('returns only products matching feature filter', async ({ api }) => {
    const { categorySlug, featureHandle, expectedTitles } = await setupProductsWithFeature(api);

    const filtersInput = [
      {
        handle: 'FEATURE',
        values: [featureHandle],
      },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 20, filters: filtersInput },
    });

    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitles.sort());

    const filters = data.category!.listing.filters;

    const featureFilter = filters.find((f) => f.handle === 'FEATURE') as ApiListFilter;
    expect(featureFilter).toBeDefined();

    const value = featureFilter.values.find((v: any) => v.handle === featureHandle);
    expect(value).toBeDefined();
    expect(value?.count).toBe(expectedTitles.length);
  });

  // ---------------------------------------------------------------------------
  // Option filter test
  // ---------------------------------------------------------------------------

  test('returns only products matching option filter', async ({ api }) => {
    const { categorySlug, optionHandle, expectedTitles } = await setupProductsWithOption(api);

    const filtersInput = [
      {
        handle: 'OPTION',
        values: [optionHandle],
      },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 20, filters: filtersInput },
    });
    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitles.sort());

    const filters = data.category!.listing.filters;

    const optionFilter = filters.find((f) => f.handle === 'OPTION') as ApiListFilter;
    expect(optionFilter).toBeDefined();

    const value = optionFilter.values.find((v: any) => v.handle === optionHandle);
    expect(value).toBeDefined();
    expect(value?.count).toBe(expectedTitles.length);
  });

  // ---------------------------------------------------------------------------
  // Tag filter test
  // ---------------------------------------------------------------------------

  test('returns only products matching tag', async ({ api }) => {
    const { categorySlug, alphaTagSlug, expectedAlphaTitles } = await setupCategoryAndProducts(api);

    const filtersInput = [
      {
        handle: 'TAG',
        values: [alphaTagSlug],
      },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 20, filters: filtersInput },
    });


    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedAlphaTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedAlphaTitles.sort());


    const filters = data.category!.listing.filters;

    const tagFilter = filters.find((f) => f.handle === 'TAG') as ApiListFilter;
    expect(tagFilter).toBeDefined();

    const alphaValue = tagFilter.values.find((v) => v.handle === alphaTagSlug);
    expect(alphaValue).toBeDefined();
    expect(alphaValue?.count).toBe(expectedAlphaTitles.length);


    tagFilter.values
      .filter((v) => v.handle !== alphaTagSlug)
      .forEach((v) => {
        expect(v.count).toBe(0);
      });
  });
});
