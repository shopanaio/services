/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { EntityStatus, ListingSort, ListingType } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

// ---------------------------------------------------------------------------
// Prepare data: category with gallery in defined order
// ---------------------------------------------------------------------------
async function prepareCategoryWithGallery(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  // Upload three mock files via REST fixture
  const urls = [
    `https://example.com/${randomUUID()}/a.jpg`,
    `https://example.com/${randomUUID()}/b.jpg`,
    `https://example.com/${randomUUID()}/c.jpg`,
  ];
  const fileIds: string[] = [];
  for (const url of urls) {
    const id = await api.admin.file.createFromURL(url);
    fileIds.push(id);
  }

  const slug = `cat-${randomUUID()}`;

  await api.admin.category.create({
    input: {
      title: 'Gallery Cat',
      slug,
      status: EntityStatus.Published,
      includeChildrenProducts: false,
      listingOrderBy: ListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
      listingFilters: [],
      gallery: fileIds,
    },
  });

  await api.session.setupApiKey();

  return { slug, fileIds };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Category gallery connection', () => {
  test('returns files in original order', async ({ api }) => {
    const { slug, fileIds } = await prepareCategoryWithGallery(api);

    const { data } = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 10 },
    });

    const returned = (data as any).category.gallery.edges.map((e: any) => e.node.iid);
    expect(returned).toEqual(fileIds);
  });

  test('cursor contains sort_index', async ({ api }) => {
    const { slug } = await prepareCategoryWithGallery(api);

    const { data } = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 1 },
    });

    const endCursor = (data as any).category.gallery.pageInfo.endCursor as string;
    const decoded = JSON.parse(
      Buffer.from(endCursor.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    );
    expect(decoded.seek[0].field).toBe('sortIndex');
  });

  test('paginates gallery forward', async ({ api }) => {
    const { slug, fileIds } = await prepareCategoryWithGallery(api);


    const firstResp = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 2 },
    });

    const firstEdges = (firstResp.data as any).category.gallery.edges;
    expect(firstEdges).toHaveLength(2);
    expect(firstEdges.map((e: any) => e.node.iid)).toEqual(fileIds.slice(0, 2));

    const pageInfo = (firstResp.data as any).category.gallery.pageInfo;
    expect(pageInfo.hasNextPage).toBe(true);
    const endCursor = pageInfo.endCursor as string;
    expect(endCursor).toBeTruthy();


    const secondResp = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 2, after: endCursor },
    });

    const secondEdges = (secondResp.data as any).category.gallery.edges;
    expect(secondEdges).toHaveLength(1);
    expect(secondEdges[0].node.iid).toBe(fileIds[2]);

    const secondPageInfo = (secondResp.data as any).category.gallery.pageInfo;
    expect(secondPageInfo.hasNextPage).toBe(false);
  });

  test('paginates gallery backward', async ({ api }) => {
    const { slug, fileIds } = await prepareCategoryWithGallery(api);


    const lastResp = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, last: 1 },
    });

    const lastEdges = (lastResp.data as any).category.gallery.edges;
    expect(lastEdges).toHaveLength(1);
    expect(lastEdges[0].node.iid).toBe(fileIds[2]);

    const pageInfo = (lastResp.data as any).category.gallery.pageInfo;
    expect(pageInfo.hasPreviousPage).toBe(true);
    const startCursor = pageInfo.startCursor as string;
    expect(startCursor).toBeTruthy();


    const prevResp = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, last: 2, before: startCursor },
    });

    const prevEdges = (prevResp.data as any).category.gallery.edges;
    expect(prevEdges).toHaveLength(2);
    expect(prevEdges.map((e: any) => e.node.iid)).toEqual(fileIds.slice(0, 2));

    const prevPageInfo = (prevResp.data as any).category.gallery.pageInfo;
    expect(prevPageInfo.hasPreviousPage).toBe(false);
  });


  function decodeCursor<T = unknown>(cursor: string): T {
    const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json) as T;
  }

  test('paginates gallery with arbitrary cursor', async ({ api }) => {
    const { slug, fileIds } = await prepareCategoryWithGallery(api);


    const { data: listData } = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 3 },
    });
    const listEdges = (listData as any).category.gallery.edges;
    const randomCursor = listEdges[1].cursor;


    const { data } = await api.client.query('client/CategoryGallery', {
      variables: { handle: slug, first: 1, after: randomCursor },
    });
    const connection = (data as any).category.gallery;
    expect(connection.edges).toHaveLength(1);
    expect(connection.edges[0].node.iid).toBe(fileIds[2]);
  });

  test('round-trip pagination integrity', async ({ api }) => {
    const { slug, fileIds } = await prepareCategoryWithGallery(api);

    const collected: string[] = [];
    let after: string | undefined;
    const pageSize = 2;

    while (true) {
      const { data } = await api.client.query('client/CategoryGallery', {
        variables: { handle: slug, first: pageSize, after },
      });
      const connection = (data as any).category.gallery;
      connection.edges.forEach((edge: any) => collected.push(edge.node.iid));


      const endCursor: string | undefined = connection.pageInfo.endCursor;
      if (endCursor) {
        const cp = decodeCursor<{ seek: { field: string; order: string; value: unknown }[] }>(
          endCursor,
        );
        expect(cp.seek[0].field).toBe('sortIndex');

        expect(cp.seek[cp.seek.length - 1].field.toLowerCase()).toBe('id');
      }

      if (!connection.pageInfo.hasNextPage) break;
      after = connection.pageInfo.endCursor;
    }

    expect(collected).toEqual(fileIds);
    expect(new Set(collected).size).toBe(collected.length);
  });
});
