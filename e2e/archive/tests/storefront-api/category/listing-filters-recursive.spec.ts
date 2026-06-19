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
} from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

type TagInfo = { title: string; id: string };

type ProductSeed = {
  title: string;
  price: number; // cents
  tag: TagInfo;
  categoryId: string;
  status: EntityStatus;
};

async function prepareHierarchyWithFilters(api: ApiFixtures['api']): Promise<{
  rootSlug: string;
  expectedTagCounts: Record<string, number>;
  expectedMinPrice: number;
  expectedMaxPrice: number;
}> {
  await api.session.setupUserAndProject();

  // ---------------------------------------------------------------------
  // 1. Root category (includeChildrenProducts = true)
  // ---------------------------------------------------------------------
  const rootSlug = `facets-root-${randomUUID()}`;
  const rootCategory = await api.admin.category.create({
    input: {
      title: 'Root Facets',
      slug: rootSlug,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });

  // ---------------------------------------------------------------------
  // 2. Child & grandchild categories
  // ---------------------------------------------------------------------
  const child1 = await api.admin.category.create({
    input: {
      title: 'Child 1',
      slug: `child1-${randomUUID()}`,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      parentId: rootCategory.id,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });

  const grandchild1 = await api.admin.category.create({
    input: {
      title: 'Grandchild 1',
      slug: `grandchild1-${randomUUID()}`,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      parentId: child1.id,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });

  const child2 = await api.admin.category.create({
    input: {
      title: 'Child 2',
      slug: `child2-${randomUUID()}`,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      parentId: rootCategory.id,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });


  const draftChild = await api.admin.category.create({
    input: {
      title: 'Draft Child',
      slug: `draft-child-${randomUUID()}`,
      status: EntityStatus.Draft,
      includeChildrenProducts: true,
      listingOrderBy: AdminListingSort.TitleAsc,
      listingOrderByStatus: false,
      listingType: ListingType.Manual,
      parentId: rootCategory.id,
      excerpt: '',
      description: { json: '{}', text: '', html: '' },
      gallery: [],
      listingFilters: [],
    },
  });

  // ---------------------------------------------------------------------
  // 3. Tags
  // ---------------------------------------------------------------------
  const createTag = async (title: string): Promise<TagInfo> => {
    const tag = await api.admin.tag.create({
      input: {
        title,
        slug: `${title}-${randomUUID()}`,
        color: '#000000',
      },
    });
    return { title, id: tag.id };
  };

  const tagAlpha = await createTag('alpha');
  const tagBeta = await createTag('beta');
  const tagGamma = await createTag('gamma');
  const tagDelta = await createTag('delta'); // should be excluded

  // ---------------------------------------------------------------------
  // 4. Products seeds
  // ---------------------------------------------------------------------
  const seeds: ProductSeed[] = [
    {
      title: 'Apple',
      price: 1000,
      tag: tagAlpha,
      categoryId: child1.id,
      status: EntityStatus.Published,
    },
    {
      title: 'Banana',
      price: 2000,
      tag: tagBeta,
      categoryId: grandchild1.id,
      status: EntityStatus.Published,
    },
    {
      title: 'Cucumber',
      price: 3000,
      tag: tagGamma,
      categoryId: child2.id,
      status: EntityStatus.Published,
    },

    {
      title: 'Drafty',
      price: 4000,
      tag: tagDelta,
      categoryId: child1.id,
      status: EntityStatus.Draft,
    },

    {
      title: 'Hidden',
      price: 5000,
      tag: tagGamma,
      categoryId: draftChild.id,
      status: EntityStatus.Published,
    },
  ];

  // ---------------------------------------------------------------------
  // 5. Create products & link to categories
  // ---------------------------------------------------------------------
  for (const seed of seeds) {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: seed.status,
        tags: [seed.tag.id],
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

    // Link to category
    await api.admin.mutation('admin/CategoryAddProducts', {
      variables: {
        input: {
          categoryId: seed.categoryId,
          productContainerIds: [product.id],
        },
      },
    });
  }

  await api.session.setupApiKey();

  const expectedTagCounts: Record<string, number> = {
    alpha: 1,
    beta: 1,
    gamma: 1,
  };

  return {
    rootSlug,
    expectedTagCounts,
    expectedMinPrice: 10,
    expectedMaxPrice: 30,
  };
}

function findFilterByType(filters: any[], typename: string) {
  return filters.find((f) => (f as any).__typename === typename);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Category Listing Filters – Recursive categories', () => {
  test('includeChildrenProducts=true – filters aggregate nested products', async ({ api }) => {
    const { rootSlug, expectedTagCounts, expectedMinPrice, expectedMaxPrice } =
      await prepareHierarchyWithFilters(api);

    const { data } = await api.client.query('client/CategoryListingFilters', {
      variables: { handle: rootSlug, first: 20 },
    });

    const filters = data.category!.listing.filters;

    // ---------------- PriceRangeFilter ----------------
    const priceFilter = findFilterByType(filters, 'PriceRangeFilter') as any;
    expect(priceFilter).toBeDefined();
    expect(Number(priceFilter.minPrice.amount)).toBe(expectedMinPrice);
    expect(Number(priceFilter.maxPrice.amount)).toBe(expectedMaxPrice);

    // ---------------- Tag ListFilter ------------------
    const findListFilter = (handle: string) =>
      filters.find((f) => (f as any).__typename === 'ListFilter' && (f as any).handle === handle);

    const tagFilter = findListFilter('TAG') as any;
    expect(tagFilter).toBeDefined();
    const tagValues = tagFilter.values;
    expect(tagValues).toHaveLength(Object.keys(expectedTagCounts).length);

    // Check counts and ensure excluded tags are absent
    for (const [title, count] of Object.entries(expectedTagCounts)) {
      const val = tagValues.find((v: any) => v.title === title);
      expect(val).toBeDefined();
      expect(val.count).toBe(count);
    }

    // delta tag should be absent
    const deltaPresent = tagValues.some((v: any) => v.title === 'delta');
    expect(deltaPresent).toBeFalsy();
  });
});
