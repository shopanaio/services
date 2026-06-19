/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type {
  ApiCategory } from '@codegen/admin-gql';
import {
  EntityStatus,
  ListingSort,
  ListingType,
  WeightUnit,
} from '@codegen/admin-gql';
import { CategorySort } from '@codegen/client-gql';
import { randomUUID } from 'node:crypto';



test.describe('client product category', () => {
  let category = {} as ApiCategory;

  const categoryInput = {
    title: 'Primary Category',
    slug: randomUUID(),
    status: EntityStatus.Published,
    excerpt: '',
    includeChildrenProducts: false,
    listingFilters: [],
    listingOrderBy: ListingSort.CreatedAtAsc,
    listingOrderByStatus: true,
    listingType: ListingType.Manual,
    gallery: [],
  };

  const createProductInput = (title: string, categoryId: string) => ({
    description: null,
    excerpt: '',
    groups: [],
    primaryCategory: categoryId,
    requiresShipping: false,
    slug: randomUUID(),
    status: EntityStatus.Published,
    tags: [],
    title,
    variants: {
      create: [
        {
          categories: [categoryId],
          costPrice: 0,
          coverId: null,
          features: [],
          gallery: [],
          inListing: true,
          oldPrice: 0,
          price: 3500,
          sku: '',
          slug: randomUUID(),
          stockStatus: 'IN_STOCK',
          title,
          variantSortIndex: 0,
          weight: 0,
          weightUnit: WeightUnit.Gr,
        },
      ],
    },
  });

  test('primary category should be present in client product categories', async ({ api }) => {
    /* ---------- Setup ---------- */
    await api.session.setupUserAndProject();

    // Create category
    category = await api.admin.category.create({ input: categoryInput });

    // Create product with primary category
    const product = await api.admin.product.create({
      input: createProductInput('Product With Primary Category', category.id),
    });

    // Prepare client API
    await api.session.setupApiKey();

    /* ---------- Client Query ---------- */
    const firstVariant = product.variants[0];
    const { data: clientData } = await api.client.query('client/ProductCategory', {
      variables: {
        handle: firstVariant.slug,
      },
    });

    const clientProduct = clientData.product;
    expect(clientProduct).not.toBeNull();

    expect(clientProduct?.category?.handle).toBe(category.slug);
  });

  test('primary category should appear in categories connection', async ({ api }) => {
    /* ---------- Setup ---------- */
    await api.session.setupUserAndProject();

    // Create category
    category = await api.admin.category.create({ input: categoryInput });
    const product = await api.admin.product.create({
      input: createProductInput('Product With Primary Category', category.id),
    });
    // Create product with primary category
    await api.session.setupApiKey();
    const firstVariant = product.variants[0];
    const { data: clientData } = await api.client.query('client/ProductCategoriesList', {
      variables: {
        handle: firstVariant.slug,
        first: 10,
      },
    });

    const clientProduct = clientData.product;
    expect(clientProduct).not.toBeNull();

    const edges = clientProduct?.categories.edges || [];
    expect(edges.map((e) => e.node.handle).includes(category.slug)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Cursor pagination tests (similar to category children)
  // ---------------------------------------------------------------------------

  test.describe('product categories cursor pagination', () => {
    const PAGE_SIZE = 2;

    const sorts: CategorySort[] = [
      CategorySort.TitleAsc,
      CategorySort.TitleDesc,
      CategorySort.CreatedAtAsc,
      CategorySort.CreatedAtDesc,
      CategorySort.UpdatedAtAsc,
      CategorySort.UpdatedAtDesc,
    ];

    const expectedOrder = (titles: string[], sort: CategorySort) =>
      sort === CategorySort.TitleDesc ||
      sort === CategorySort.CreatedAtDesc ||
      sort === CategorySort.UpdatedAtDesc
        ? [...titles].reverse()
        : [...titles];

    for (const sort of sorts) {
      test(`forward & backward pagination, sort = ${sort}`, async ({ api }) => {
        await api.session.setupUserAndProject();

        // create 5 categories
        const titles = Array.from({ length: 5 }).map((_, i) => `Cat ${i}`);
        const categoryIds: string[] = [];
        for (const t of titles) {
          const cat = await api.admin.category.create({
            input: {
              title: t,
              slug: `${t.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
              status: EntityStatus.Published,
              includeChildrenProducts: false,
              listingOrderBy: ListingSort.CreatedAtAsc,
              listingOrderByStatus: true,
              listingType: ListingType.Manual,
              excerpt: '',
              gallery: [],
              listingFilters: [],
            },
          });
          categoryIds.push(cat.id);
        }

        // create product with variant linked to all categories
        const prod = await api.admin.product.create({
          input: {
            description: null,
            excerpt: '',
            groups: [],
            primaryCategory: categoryIds[0],
            requiresShipping: false,
            slug: randomUUID(),
            status: EntityStatus.Published,
            tags: [],
            title: 'Product Many Categories',
            variants: {
              create: [
                {
                  categories: categoryIds,
                  costPrice: 0,
                  coverId: null,
                  features: [],
                  gallery: [],
                  inListing: true,
                  oldPrice: 0,
                  price: 1000,
                  sku: '',
                  slug: randomUUID(),
                  stockStatus: 'IN_STOCK',
                  title: 'Product Many Categories',
                  variantSortIndex: 0,
                  weight: 0,
                  weightUnit: WeightUnit.Gr,
                },
              ],
            },
          },
        });

        await api.session.setupApiKey();

        const handle = prod.variants[0].slug;

        const fetchConn = async (vars: Record<string, unknown>) => {
          const { data } = await api.client.query('client/ProductCategoriesConnection', {
            variables: { handle, sort, ...vars },
          });
          return (data as any).product.categories;
        };

        const sortedTitles = expectedOrder(titles, sort);

        // Forward page1
        const pg1 = await fetchConn({ first: PAGE_SIZE });

        expect(pg1.edges.map((e: any) => e.node.title)).toEqual(sortedTitles.slice(0, PAGE_SIZE));
        expect(pg1.pageInfo.hasNextPage).toBe(true);

        const after = pg1.pageInfo.endCursor as string;
        const pg2 = await fetchConn({ first: PAGE_SIZE, after });
        expect(pg2.edges.map((e: any) => e.node.title)).toEqual(
          sortedTitles.slice(PAGE_SIZE, PAGE_SIZE * 2),
        );

        // Backward last page
        const lastPg = await fetchConn({ last: PAGE_SIZE });
        expect(lastPg.edges.map((e: any) => e.node.title)).toEqual(sortedTitles.slice(-PAGE_SIZE));

        const before = lastPg.pageInfo.startCursor as string;
        const prevPg = await fetchConn({ last: PAGE_SIZE, before });
        expect(prevPg.edges.map((e: any) => e.node.title)).toEqual(
          sortedTitles.slice(-PAGE_SIZE * 2, -PAGE_SIZE),
        );
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Cursor pagination tests: first/last only (mirrors children-first-last.spec.ts)
  // ---------------------------------------------------------------------------

  test.describe('product categories first/last pagination', () => {
    const PAGE_SIZE = 2;

    const sorts: CategorySort[] = [
      CategorySort.TitleAsc,
      CategorySort.TitleDesc,
      CategorySort.CreatedAtAsc,
      CategorySort.CreatedAtDesc,
      CategorySort.UpdatedAtAsc,
      CategorySort.UpdatedAtDesc,
    ];

    const expectedOrder = (titles: string[], sort: CategorySort) =>
      sort === CategorySort.TitleDesc ||
      sort === CategorySort.CreatedAtDesc ||
      sort === CategorySort.UpdatedAtDesc
        ? [...titles].reverse()
        : [...titles];

    for (const sort of sorts) {
      test(`first/last pagination, sort = ${sort}`, async ({ api }) => {
        await api.session.setupUserAndProject();

        // create 5 categories
        const titles = Array.from({ length: 5 }).map((_, i) => `Cat ${i}`);
        const categoryIds: string[] = [];
        for (const t of titles) {
          const cat = await api.admin.category.create({
            input: {
              title: t,
              slug: `${t.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
              status: EntityStatus.Published,
              includeChildrenProducts: false,
              listingOrderBy: ListingSort.CreatedAtAsc,
              listingOrderByStatus: true,
              listingType: ListingType.Manual,
              excerpt: '',
              gallery: [],
              listingFilters: [],
            },
          });
          categoryIds.push(cat.id);
        }

        // create product with variant linked to all categories
        const prod = await api.admin.product.create({
          input: {
            description: null,
            excerpt: '',
            groups: [],
            primaryCategory: categoryIds[0],
            requiresShipping: false,
            slug: randomUUID(),
            status: EntityStatus.Published,
            tags: [],
            title: 'Product Many Categories',
            variants: {
              create: [
                {
                  categories: categoryIds,
                  costPrice: 0,
                  coverId: null,
                  features: [],
                  gallery: [],
                  inListing: true,
                  oldPrice: 0,
                  price: 1000,
                  sku: '',
                  slug: randomUUID(),
                  stockStatus: 'IN_STOCK',
                  title: 'Product Many Categories',
                  variantSortIndex: 0,
                  weight: 0,
                  weightUnit: WeightUnit.Gr,
                },
              ],
            },
          },
        });

        await api.session.setupApiKey();

        const handle = prod.variants[0].slug;

        const fetchConn = async (vars: Record<string, unknown>) => {
          const { data } = await api.client.query('client/ProductCategoriesConnection', {
            variables: { handle, sort, ...vars },
          });
          return (data as any).product.categories;
        };

        const sortedTitles = expectedOrder(titles, sort);

        // first PAGE_SIZE
        const firstPg = await fetchConn({ first: PAGE_SIZE });
        expect(firstPg.edges.map((e: any) => e.node.title)).toEqual(
          sortedTitles.slice(0, PAGE_SIZE),
        );

        // last PAGE_SIZE
        const lastPg = await fetchConn({ last: PAGE_SIZE });
        expect(lastPg.edges.map((e: any) => e.node.title)).toEqual(sortedTitles.slice(-PAGE_SIZE));
      });
    }
  });
});
