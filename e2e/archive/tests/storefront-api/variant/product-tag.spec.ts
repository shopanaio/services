/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiTag } from '@codegen/admin-gql';
import { EntityStatus, WeightUnit } from '@codegen/admin-gql';
import { TagSort } from '@codegen/client-gql';
import { randomUUID } from 'node:crypto';



test.describe('client product tag', () => {
  let tag = {} as ApiTag;

  const createProductInput = (title: string, tagIds: string[]) => ({
    description: null,
    excerpt: '',
    groups: [],
    requiresShipping: false,
    slug: randomUUID(),
    status: EntityStatus.Published,
    tags: tagIds,
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
          price: 1000,
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

  test('tags should appear in tags connection', async ({ api }) => {
    /* ---------- Setup ---------- */
    await api.session.setupUserAndProject();

    // Create tag
    tag = await api.admin.tag.create({
      input: {
        title: 'Primary Tag',
        slug: randomUUID(),
        color: '#000000',
      },
    });

    // Create product with tag
    const product = await api.admin.product.create({
      input: createProductInput('Product With Tag', [tag.id]),
    });

    // Prepare client API
    await api.session.setupApiKey();

    /* ---------- Client Query ---------- */
    const firstVariant = product.variants[0];
    const { data: clientData } = await api.client.query('client/ProductTagsList' as any, {
      variables: {
        handle: firstVariant.slug,
        first: 10,
      },
    });

    const clientProduct = clientData.product;
    expect(clientProduct).not.toBeNull();

    const edges = clientProduct?.tags.edges || [];
    expect(edges.map((e: any) => e.node.handle).includes(tag.slug)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Cursor pagination tests (similar to category children)
  // ---------------------------------------------------------------------------

  test.describe('product tags cursor pagination', () => {
    const PAGE_SIZE = 2;

    const sorts: TagSort[] = [
      TagSort.TitleAsc,
      TagSort.TitleDesc,
      TagSort.CreatedAtAsc,
      TagSort.CreatedAtDesc,
      TagSort.UpdatedAtAsc,
      TagSort.UpdatedAtDesc,
    ];

    const expectedOrder = (titles: string[], sort: TagSort) =>
      sort === TagSort.TitleDesc || sort === TagSort.CreatedAtDesc || sort === TagSort.UpdatedAtDesc
        ? [...titles].reverse()
        : [...titles];

    for (const sort of sorts) {
      test(`forward & backward pagination, sort = ${sort}`, async ({ api }) => {
        await api.session.setupUserAndProject();

        // create 5 tags
        const titles = Array.from({ length: 5 }).map((_, i) => `Tag ${i}`);
        const tagIds: string[] = [];
        for (const t of titles) {
          const tg = await api.admin.tag.create({
            input: {
              title: t,
              slug: `${t.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
              color: '#000000',
            },
          });
          tagIds.push(tg.id);
        }

        // create product with all tags
        const prod = await api.admin.product.create({
          input: createProductInput('Product Many Tags', tagIds),
        });

        await api.session.setupApiKey();

        const handle = prod.variants[0].slug;

        const fetchConn = async (vars: Record<string, unknown>) => {
          const { data } = await api.client.query('client/ProductTagsConnection' as any, {
            variables: { handle, sort, ...vars },
          });
          return (data as any).product.tags;
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
  // Cursor pagination tests: first/last only
  // ---------------------------------------------------------------------------

  test.describe('product tags first/last pagination', () => {
    const PAGE_SIZE = 2;

    const sorts: TagSort[] = [
      TagSort.TitleAsc,
      TagSort.TitleDesc,
      TagSort.CreatedAtAsc,
      TagSort.CreatedAtDesc,
      TagSort.UpdatedAtAsc,
      TagSort.UpdatedAtDesc,
    ];

    const expectedOrder = (titles: string[], sort: TagSort) =>
      sort === TagSort.TitleDesc || sort === TagSort.CreatedAtDesc || sort === TagSort.UpdatedAtDesc
        ? [...titles].reverse()
        : [...titles];

    for (const sort of sorts) {
      test(`first/last pagination, sort = ${sort}`, async ({ api }) => {
        await api.session.setupUserAndProject();

        // create 5 tags
        const titles = Array.from({ length: 5 }).map((_, i) => `Tag ${i}`);
        const tagIds: string[] = [];
        for (const t of titles) {
          const tg = await api.admin.tag.create({
            input: {
              title: t,
              slug: `${t.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}`,
              color: '#000000',
            },
          });
          tagIds.push(tg.id);
        }

        // create product with all tags
        const prod = await api.admin.product.create({
          input: createProductInput('Product Many Tags', tagIds),
        });

        await api.session.setupApiKey();

        const handle = prod.variants[0].slug;

        const fetchConn = async (vars: Record<string, unknown>) => {
          const { data } = await api.client.query('client/ProductTagsConnection' as any, {
            variables: { handle, sort, ...vars },
          });
          return (data as any).product.tags;
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
