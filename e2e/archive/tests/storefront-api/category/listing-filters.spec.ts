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
import type { ApiFilter } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

type ProductSeed = {
  title: string;
  price: number;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
  tags?: string[];
  features?: { group: string; value: string }[];
  options?: { group: string; value: string }[];
  rating?: number;
  status?: EntityStatus;
};

async function setupCategoryWithProducts(
  api: ApiFixtures['api'],
  categoryTitle: string,
  products: ProductSeed[],
) {
  await api.session.setupUserAndProject();

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------

  // Create category
  const categorySlug = `facets-test-${randomUUID()}`;
  const category = await api.admin.category.create({
    input: {
      title: categoryTitle,
      slug: categorySlug,
      status: EntityStatus.Published,
      includeChildrenProducts: false,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      excerpt: 'Facets test category',
      description: {
        json: '{}',
        text: 'Description',
        html: '<p>Description</p>',
      },
      gallery: [],
      listingFilters: [],
    },
  });

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  const tagMap = new Map<string, string>();
  for (const product of products) {
    if (product.tags) {
      for (const tagTitle of product.tags) {
        if (!tagMap.has(tagTitle)) {
          const tag = await api.admin.tag.create({
            input: {
              title: tagTitle,
              slug: `${tagTitle.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
              color: '#000000',
            },
          });
          tagMap.set(tagTitle, tag.id);
        }
      }
    }
  }

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------



  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  const productIds: string[] = [];

  for (const seed of products) {
    // Resolve tag IDs
    const tagIds = (seed.tags || []).map((t) => tagMap.get(t)!).filter(Boolean);


    const attributeLinks =
      seed.features?.map((feat, idx) => ({
        attributeSortIndex: idx,
        optionSortIndex: 0,
        isAttribute: true,
        isOption: false,
        title: feat.value,
        slug: `${feat.group.toLowerCase().replace(/\s+/g, '-')}.${feat.value.toLowerCase().replace(/\s+/g, '-')}`,
        group: {
          title: feat.group,
          slug: feat.group.toLowerCase().replace(/\s+/g, '-'),
          featureStyleType: FeatureStyleType.Radio,
        },
      })) || [];

    const optionLinks =
      seed.options?.map((opt, idx) => ({
        attributeSortIndex: 0,
        optionSortIndex: idx,
        isAttribute: false,
        isOption: true,
        title: opt.value,
        slug: `${opt.group.toLowerCase().replace(/\s+/g, '-')}.${opt.value.toLowerCase().replace(/\s+/g, '-')}`,
        group: {
          title: opt.group,
          slug: opt.group.toLowerCase().replace(/\s+/g, '-'),
          featureStyleType: FeatureStyleType.Radio,
        },
      })) || [];

    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: seed.status ?? EntityStatus.Published,
        tags: tagIds,
        groups: [],
        title: seed.title,
        variants: {
          create: [
            {
              categories: [] as string[],
              costPrice: 0,
              coverId: null,
              features: [...attributeLinks, ...optionLinks],
              gallery: [] as string[],
              inListing: true,
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

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  if (productIds.length > 0) {
    await api.admin.mutation('admin/CategoryAddProducts', {
      variables: { input: { categoryId: category.id, productContainerIds: productIds } },
    });
  }

  await api.session.setupApiKey();

  return { categorySlug };
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

function findFilterByType(filters: ApiFilter[], typename: string): ApiFilter | undefined {
  return filters.find((f) => (f as any).__typename === typename);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Category Listing Filters', () => {
  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  test('returns empty facets for category without products', async ({ api }) => {
    await api.session.setupUserAndProject();

    const categorySlug = `empty-category-${randomUUID()}`;
    await api.admin.category.create({
      input: {
        title: 'Empty Category',
        slug: categorySlug,
        status: EntityStatus.Published,
        includeChildrenProducts: false,
        listingOrderBy: AdminListingSort.TitleAsc,
        listingOrderByStatus: false,
        listingType: ListingType.Manual,
        excerpt: 'Empty',
        description: {
          json: '{}',
          text: 'Empty',
          html: '<p>Empty</p>',
        },
        gallery: [],
        listingFilters: [],
      },
    });

    await api.session.setupApiKey();

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 10 },
    });

    expect(data.category).toBeDefined();
    expect(data.category!.listing.filters).toEqual([]);
  });

  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  test('returns all facet types for category with diverse products', async ({ api }) => {
    // -----------------------------------------------------------------










    // -----------------------------------------------------------------
    const products: ProductSeed[] = [
      {
        title: 'Basic T-Shirt',
        price: 1000,
        stockStatus: 'IN_STOCK',
        tags: ['new-arrival', 'summer'],
        features: [
          { group: 'Material', value: 'Cotton' },
          { group: 'Style', value: 'Casual' },
        ],
        options: [
          { group: 'Size', value: 'S' },
          { group: 'Color', value: 'White' },
        ],
        rating: 4.5,
      },
      {
        title: 'Premium Jacket',
        price: 5000,
        stockStatus: 'OUT_OF_STOCK',
        tags: ['sale'],
        features: [
          { group: 'Material', value: 'Leather' },
          { group: 'Style', value: 'Formal' },
        ],
        options: [
          { group: 'Size', value: 'M' },
          { group: 'Color', value: 'Black' },
        ],
        rating: 3.5,
      },
      {
        title: 'Sport Shoes',
        price: 3000,
        stockStatus: 'PREORDER',
        tags: ['new-arrival'],
        features: [{ group: 'Material', value: 'Synthetic' }],
        options: [
          { group: 'Size', value: '42' },
          { group: 'Color', value: 'Blue' },
        ],
      },
      {
        title: 'Casual Shorts',
        price: 1200,
        stockStatus: 'IN_STOCK',
        tags: ['new-arrival', 'summer'],
        features: [
          { group: 'Material', value: 'Cotton' },
          { group: 'Style', value: 'Casual' },
        ],
        options: [
          { group: 'Size', value: 'L' },
          { group: 'Color', value: 'Blue' },
        ],
      },
      {
        title: 'Winter Hat',
        price: 2500,
        stockStatus: 'IN_STOCK',
        tags: ['sale', 'winter'],
        features: [
          { group: 'Material', value: 'Wool' },
          { group: 'Style', value: 'Casual' },
        ],
        options: [
          { group: 'Size', value: 'XL' },
          { group: 'Color', value: 'Red' },
        ],
      },
      {
        title: 'Draft Exclusive Item',
        price: 6000,
        stockStatus: 'IN_STOCK',
        tags: ['exclusive'],
        features: [{ group: 'Material', value: 'Silk' }],
        options: [{ group: 'Size', value: 'S' }],
        status: EntityStatus.Draft,
      },
    ];

    const { categorySlug } = await setupCategoryWithProducts(api, 'Diverse Products', products);

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: categorySlug, first: 10 },
    });

    const filters = data.category!.listing.filters;

    const priceFilter = findFilterByType(filters, 'PriceRangeFilter') as any;
    expect(priceFilter).toBeDefined();
    expect(Number(priceFilter.minPrice.amount)).toBe(10);
    expect(Number(priceFilter.maxPrice.amount)).toBe(50);




    // -----------------------------------------------------------------

    // -----------------------------------------------------------------

    // -----------------------------------------------------------------
    const findListFilter = (handle: string) =>
      filters.find((f) => (f as any).__typename === 'ListFilter' && (f as any).handle === handle);

    const featureFilter = findListFilter('FEATURE');
    expect(featureFilter).toBeDefined();

    // Verify counts and value lengths
    const featureValues = (featureFilter as any).values;
    expect(featureValues).toHaveLength(6);
    const getFeatureCount = (title: string) =>
      featureValues.find((v: any) => v.title === title)?.count;
    expect(getFeatureCount('Cotton')).toBe(2);
    expect(getFeatureCount('Casual')).toBe(3);

    const optionFilter = findListFilter('OPTION');
    expect(optionFilter).toBeDefined();

    const optionValues = (optionFilter as any).values;
    expect(optionValues).toHaveLength(9);
    const getOptionCount = (title: string) =>
      optionValues.find((v: any) => v.title === title)?.count;
    expect(getOptionCount('Blue')).toBe(2);

    const tagFilter = findListFilter('TAG') as any;
    expect(tagFilter).toBeDefined();
    const tagValues = tagFilter.values;
    expect(tagValues).toHaveLength(4);
    const getTagCount = (title: string) => tagValues.find((v: any) => v.title === title)?.count;
    expect(getTagCount('new-arrival')).toBe(3);


    const tagTitles = tagFilter.values.map((v: any) => v.title);
    expect(tagTitles).not.toContain('exclusive');
  });
});
