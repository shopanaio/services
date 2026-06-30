/* eslint-disable @typescript-eslint/no-explicit-any */

import { test } from '@fixtures/base.extend';

import type { GraphQLFileName } from '@queries/filenames';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

// ---------------------------------------------------------------------------
// Helper functions (subset from existing product-gallery.spec.ts)
// ---------------------------------------------------------------------------

async function uploadMockFiles(api: ApiFixtures['api'], count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(await api.admin.file.createFromURL(`https://example.com/${randomUUID()}/${i}.jpg`));
  }
  return ids;
}

async function createProductWithVariant(
  api: ApiFixtures['api'],
  opts: { coverId: string; galleryIds: string[] },
) {
  const handle = `node-product-gallery-${randomUUID()}`;

  const product = await api.admin.product.create({
    input: {
      title: 'Node Gallery Product',
      slug: handle,
      status: 'PUBLISHED',
      requiresShipping: false,
      groups: [],
      tags: [],
      variants: {
        create: [
          {
            title: 'Variant 1',
            price: 0,
            stockStatus: 'IN_STOCK',
            inListing: true,
            weight: 0,
            weightUnit: 'g',
            categories: [],
            variantSortIndex: 0,
            coverId: opts.coverId,
            gallery: opts.galleryIds,
          },
        ],
      },
    },
  });

  return product.variants[0]; // return single variant
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('node product gallery connection', () => {
  test('returns full gallery via node query', async ({ api }) => {
    await api.session.setupUserAndProject();

    const [coverId, ...galleryIds] = await uploadMockFiles(api, 4); // 1 cover + 3 gallery
    const variant = await createProductWithVariant(api, { coverId, galleryIds });

    await api.session.setupApiKey();


    const prodResp = await api.client.query('client/Product' as GraphQLFileName, {
      variables: { handle: variant.slug },
    });
    const productId = (prodResp.data as any).product.id as string;

    const { data } = await api.client.query('client/NodeProductGallery' as GraphQLFileName, {
      variables: { id: productId, first: 10 },
    });

    expect(data.node).toBeDefined();
    const nodeProduct = data.node as any;
    const returnedIds = nodeProduct.gallery.edges.map((e: any) => e.node.iid);
    expect(returnedIds).toEqual(galleryIds);
  });

  test('paginates gallery via node query', async ({ api }) => {
    await api.session.setupUserAndProject();

    const [coverId, ...galleryIds] = await uploadMockFiles(api, 6); // 1 cover + 5 gallery
    const variant = await createProductWithVariant(api, { coverId, galleryIds });

    await api.session.setupApiKey();


    const prodResp = await api.client.query('client/Product', {
      variables: { handle: variant.slug },
    });
    const productId = prodResp.data.product?.id as string;

    // first page
    const first = await api.client.query('client/NodeProductGallery', {
      variables: { id: productId, first: 2 },
    });
    const edges1 = (first.data.node as any).gallery.edges;
    expect(edges1).toHaveLength(2);
    const endCursor = (first.data.node as any).gallery.pageInfo.endCursor as string;
    expect((first.data.node as any).gallery.pageInfo.hasNextPage).toBe(true);

    // second page
    const second = await api.client.query('client/NodeProductGallery' as GraphQLFileName, {
      variables: { id: productId, first: 10, after: endCursor },
    });
    const edges2 = (second.data.node as any).gallery.edges;
    expect(edges2.length).toBe(galleryIds.length - 2);
    expect((second.data.node as any).gallery.pageInfo.hasNextPage).toBe(false);
  });
});
