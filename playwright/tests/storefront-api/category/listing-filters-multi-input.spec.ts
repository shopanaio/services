/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
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
import { ApiListFilter } from '@codegen/client-gql';

// ---------------------------------------------------------------------------
// Complex dataset for combined filter scenarios
// ---------------------------------------------------------------------------

type ComplexSeed = {
  title: string;
  price: number;
  tag: string;
  tagSlug: string;
  material: 'Cotton' | 'Leather';
  size: 'M' | 'L';
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK';
  published: boolean;
  inListing: boolean;
};

async function setupComplexProducts(api: ApiFixtures['api']): Promise<{
  categorySlug: string;
  seeds: ComplexSeed[];
}> {
  await api.session.setupUserAndProject();

  const categorySlug = `multi-filter-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: 'Multi Filter Category',
      slug: categorySlug,
      status: EntityStatus.Published,
      includeChildrenProducts: false,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });

  // Create tags
  const tagNewArrival = await api.admin.tag.create({
    input: { title: 'New Arrival', slug: `new-arrival-${randomUUID()}`, color: '#000000' },
  });
  const tagSale = await api.admin.tag.create({
    input: { title: 'Sale', slug: `sale-${randomUUID()}`, color: '#000000' },
  });

  

  // Define product seeds
  const seeds: ComplexSeed[] = [
    {
      title: 'Cotton Shirt New M',
      price: 1500,
      tag: 'new-arrival',
      tagSlug: tagNewArrival.slug,
      material: 'Cotton',
      size: 'M',
      stockStatus: 'IN_STOCK',
      published: true,
      inListing: true,
    },
    {
      title: 'Leather Jacket Sale L',
      price: 2500,
      tag: 'sale',
      tagSlug: tagSale.slug,
      material: 'Leather',
      size: 'L',
      stockStatus: 'OUT_OF_STOCK',
      published: true,
      inListing: true,
    },
    {
      title: 'Cotton Pants Sale M',
      price: 2000,
      tag: 'sale',
      tagSlug: tagSale.slug,
      material: 'Cotton',
      size: 'M',
      stockStatus: 'IN_STOCK',
      published: true,
      inListing: true,
    },
  ];

  const productIds: string[] = [];

  for (const seed of seeds) {
    const tagId = seed.tag === 'new-arrival' ? tagNewArrival.id : tagSale.id;

    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: `product-${randomUUID()}`,
        status: seed.published ? EntityStatus.Published : EntityStatus.Draft,
        tags: [tagId],
        groups: [],
        title: seed.title,
        variants: {
          create: [
            {
              categories: [],
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
              gallery: [],
              inListing: seed.inListing,
              oldPrice: 0,
              price: seed.price,
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
  }

  // Link products to category
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
    seeds,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Category Listing + Facets with multiple filter inputs', () => {
  let dataset: Awaited<ReturnType<typeof setupComplexProducts>>;

  test.beforeEach(async ({ api }) => {
    dataset = await setupComplexProducts(api);
  });

  test('returns products matching price range AND tag', async ({ api }) => {
    const { categorySlug, seeds } = dataset;

    const newArrivalSlug = (seeds.find((s) => s.tag === 'new-arrival') as any).tagSlug as string;

    const filtersInput = [
      { handle: 'PRICE', values: ['10', '20'] }, // 10-20
      { handle: 'TAG', values: [newArrivalSlug] },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 50, filters: filtersInput },
    });

    const expected = seeds.filter(
      (s) =>
        s.published && s.inListing && s.price >= 1000 && s.price <= 2000 && s.tag === 'new-arrival',
    );
    const expectedTitles = expected.map((s) => s.title);

    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitles.sort());

    // Verify facets
    const filters = data.category!.listing.filters;

    // PriceRangeFilter should exist
    const priceFilter = filters.find((f: any) => f.__typename === 'PriceRangeFilter');
    expect(priceFilter).toBeDefined();

    // Tag filter count should match
    const tagFilter = filters.find((f) => f.handle === 'TAG') as ApiListFilter;
    expect(tagFilter).toBeDefined();
    const newArrivalValue = tagFilter.values.find((v) => v.handle === newArrivalSlug);
    expect(newArrivalValue).toBeDefined();
    expect(newArrivalValue?.count).toBe(expectedTitles.length);
  });

  test('returns products matching availability AND feature', async ({ api }) => {
    const { categorySlug, seeds } = dataset;

    
    const leatherHandle = 'material.leather';
    const filtersInput = [
      { handle: 'AVAILABILITY', values: ['OUT_OF_STOCK'] },
      { handle: 'FEATURE', values: [leatherHandle] },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 50, filters: filtersInput },
    });

    const expected = seeds.filter(
      (s) =>
        s.published && s.inListing && s.stockStatus === 'OUT_OF_STOCK' && s.material === 'Leather',
    );
    const expectedTitles = expected.map((s) => s.title);

    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitles.sort());

    // Verify facets
    const filters = data.category!.listing.filters;

    // Availability filter count should match
    const availFilter = filters.find((f) => f.handle === 'AVAILABILITY') as ApiListFilter;
    expect(availFilter).toBeDefined();
    const outOfStockValue = availFilter.values.find((v) => v.handle === 'OUT_OF_STOCK');
    expect(outOfStockValue).toBeDefined();
    expect(outOfStockValue?.count).toBe(expectedTitles.length);

    // Feature filter count should match
    const featureFilter = filters.find((f) => f.handle === 'FEATURE') as ApiListFilter;
    expect(featureFilter).toBeDefined();
    const value = featureFilter.values.find((v) => v.handle === leatherHandle);
    expect(value).toBeDefined();
    expect(value?.count).toBe(expectedTitles.length);
  });

  test('returns products matching price, tag, AND option', async ({ api }) => {
    const { categorySlug, seeds } = dataset;

    const saleTagSlug = (seeds.find((s) => s.tag === 'sale') as any).tagSlug;
    
    const sizeMHandle = 'size.m';

    const filtersInput = [
      { handle: 'PRICE', values: ['20', '30'] },
      { handle: 'TAG', values: [saleTagSlug] },
      { handle: 'OPTION', values: [sizeMHandle] },
    ];

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 50, filters: filtersInput },
    });

    const expected = seeds.filter(
      (s) =>
        s.published &&
        s.inListing &&
        s.price >= 2000 &&
        s.price <= 3000 &&
        s.tag === 'sale' &&
        s.size === 'M',
    );
    const expectedTitles = expected.map((s) => s.title);

    const edges = data.category!.listing.edges;
    expect(edges).toHaveLength(expectedTitles.length);
    const receivedTitles = edges.map((e: any) => e.node.title);
    expect(receivedTitles.sort()).toEqual(expectedTitles.sort());

    // Verify facets
    const filters = data.category!.listing.filters;

    // PriceRangeFilter should exist
    const priceFilter = filters.find((f: any) => f.__typename === 'PriceRangeFilter');
    expect(priceFilter).toBeDefined();

    // Tag filter count should match
    const tagFilter = filters.find((f) => f.handle === 'TAG') as ApiListFilter;
    expect(tagFilter).toBeDefined();
    const saleTagValue = tagFilter.values.find((v) => v.handle === saleTagSlug);
    expect(saleTagValue).toBeDefined();
    expect(saleTagValue?.count).toBe(expectedTitles.length);

    // Option filter count should match
    const optionFilter = filters.find((f) => f.handle === 'OPTION') as ApiListFilter;
    expect(optionFilter).toBeDefined();
    const sizeMValue = optionFilter.values.find((v) => v.handle === sizeMHandle);
    expect(sizeMValue).toBeDefined();
    expect(sizeMValue?.count).toBe(expectedTitles.length);
  });
});
